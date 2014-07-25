package org.n52.wps.server.database;

import java.io.BufferedInputStream;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.StringWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Properties;
import java.util.Timer;
import java.util.TimerTask;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.sql.DataSource;

import org.apache.commons.io.IOUtils;
import org.n52.wps.ServerDocument;
import org.n52.wps.commons.PropertyUtil;
import org.n52.wps.commons.WPSConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.common.base.Joiner;

/**
 *
 * @author isuftin
 */
public class PostgresDatabaseX extends AbstractDatabase {

    private static final Logger LOGGER = LoggerFactory.getLogger(PostgresDatabaseX.class);
    
    private static final String DEFAULT_ENCODING = "UTF-8";

    private static final String KEY_DATABASE_ROOT = "org.n52.wps.server.database";
    private static final String KEY_DATABASE_PATH = "path";
    private static final String KEY_DATABASE_WIPE_ENABLED = "wipe.enabled";
    private static final String KEY_DATABASE_WIPE_PERIOD = "wipe.period";
    private static final String KEY_DATABASE_WIPE_THRESHOLD = "wipe.threshold";
    private static final boolean DEFAULT_DATABASE_WIPE_ENABLED = true;
    private static final long DEFAULT_DATABASE_WIPE_PERIOD = 1000 * 60 * 60; // default to running once an hour
    private static final long DEFAULT_DATABASE_WIPE_THRESHOLD = 1000 * 60 * 60 * 24 * 7; // default to wipe things over a week old

    private static final int DATA_BUFFER_SIZE = 8192;
    private static final String FILE_URI_PREFIX = "file://";
    private static final String SUFFIX_GZIP = "gz";
    private static final String DEFAULT_BASE_DIRECTORY
            = Joiner.on(File.separator).join(System.getProperty("java.io.tmpdir", "."), "Database", "Results");
    private static final ServerDocument.Server server = WPSConfig.getInstance().getWPSConfig().getServer();
    private static final String baseResultURL = String.format("http://%s:%s/%s/RetrieveResultServlet?id=",
            server.getHostname(), server.getHostport(), server.getWebappPath());

    private static final int SELECTION_STRING_REQUEST_ID_PARAM_INDEX = 1;
    private static final int SELECTION_STRING_RESPONSE_COLUMN_INDEX = 1;
    private static final int SELECTION_STRING_RESPONSE_MIMETYPE_COLUMN_INDEX = 2;

    private static String connectionURL;
    private static Path BASE_DIRECTORY;
    private static PostgresDatabaseX instance;
    private static ConnectionHandler connectionHandler;

    protected static Timer wipeTimer;

    private static final String CREATE_RESULTS_TABLE_PSQL
            = "CREATE TABLE RESULTS ("
            + "REQUEST_ID VARCHAR(100) NOT NULL PRIMARY KEY, "
            + "REQUEST_DATE TIMESTAMP, "
            + "RESPONSE_TYPE VARCHAR(100), "
            + "RESPONSE TEXT, "
            + "RESPONSE_MIMETYPE VARCHAR(100))";

    private PostgresDatabaseX() {
        try {
            Class.forName("org.postgresql.Driver");
            PropertyUtil propertyUtil = new PropertyUtil(server.getDatabase().getPropertyArray(), KEY_DATABASE_ROOT);
            initializeBaseDirectory(propertyUtil);
            initializeDatabaseWiper(propertyUtil);
            initializeConnectionHandler();
            initializeResultsTable();
        } catch (ClassNotFoundException cnfe) {
            LOGGER.error("Database class could not be loaded.", cnfe);
            throw new UnsupportedDatabaseException("The database class could not be loaded.", cnfe);
        } catch (NamingException | IOException | SQLException ex) {
            LOGGER.error("Error creating PostgresDatabase", ex);
            throw new RuntimeException("Error creating PostgresDatabase", ex);
        }
    }

    private void initializeBaseDirectory(PropertyUtil propertyUtil) throws IOException {
        String baseDirectoryPath = propertyUtil.extractString(KEY_DATABASE_PATH, DEFAULT_BASE_DIRECTORY);
        BASE_DIRECTORY = Paths.get(baseDirectoryPath);
        LOGGER.info("Using \"{}\" as base directory for results database", baseDirectoryPath);
        Files.createDirectories(BASE_DIRECTORY);
    }

    private void initializeDatabaseWiper(PropertyUtil propertyUtil) {
        if (propertyUtil.extractBoolean(KEY_DATABASE_WIPE_ENABLED, DEFAULT_DATABASE_WIPE_ENABLED)) {
            long periodMillis = propertyUtil.extractPeriodAsMillis(KEY_DATABASE_WIPE_PERIOD, DEFAULT_DATABASE_WIPE_PERIOD);
            long thresholdMillis = propertyUtil.extractPeriodAsMillis(KEY_DATABASE_WIPE_THRESHOLD, DEFAULT_DATABASE_WIPE_THRESHOLD);
            wipeTimer = new Timer(getClass().getSimpleName() + " Postgres Wiper", true);
            wipeTimer.scheduleAtFixedRate(new PostgresDatabaseX.WipeTimerTask(thresholdMillis), 15000, periodMillis);
            LOGGER.info("Started {} Postgres wiper timer; period {} ms, threshold {} ms",
                    new Object[]{getDatabaseName(), periodMillis, thresholdMillis});
        } else {
            wipeTimer = null;
        }
    }

    private void initializeConnectionHandler() throws SQLException, NamingException {
//        String jndiName = DatabaseUtil.getDatabasePropertyUtil().extractString("jndiName", null);
//        if (null != jndiName) {
//            connectionHandler = new JNDIConnectionHandler(jndiName);
//        } else {
//            connectionURL = "jdbc:postgresql:" + getDatabasePath() + "/" + getDatabaseName();
//            LOGGER.debug("Database connection URL is: " + connectionURL);
//            String username = DatabaseUtil.getDatabasePropertyUtil().extractString("username", null);
//            String password = DatabaseUtil.getDatabasePropertyUtil().extractString("password", null);
//            Properties props = new Properties();
//            props.setProperty("create", "true");
//            props.setProperty("user", username);
//            props.setProperty("password", password);
//            connectionHandler = new DefaultConnectionHandler(connectionURL, props);
//        }
    }

    private void initializeResultsTable() throws SQLException {
        try (Connection connection = getConnection(); ResultSet rs = connection.getMetaData().getTables(null, null, "results", new String[]{"TABLE"})) {
            if (!rs.next()) {
                LOGGER.debug("Table RESULTS does not yet exist, creating it.");
                Statement st = connection.createStatement();
                st.executeUpdate(CREATE_RESULTS_TABLE_PSQL);
            }
        }
    }

    public static synchronized PostgresDatabaseX getInstance() {
        if (instance == null) {
            instance = new PostgresDatabaseX();
        }
        return instance;
    }

    @Override
    public String getConnectionURL() {
        return connectionURL;
    }

    @Override
    public Connection getConnection() {
        try {
            return connectionHandler.getConnection();
        } catch (SQLException ex) {
            throw new RuntimeException("Unable to obtain connection to database!", ex);
        }
    }

    @Override
    public String generateRetrieveResultURL(String id) {
        return baseResultURL + id;
    }

    @Override
    public void insertRequest(String id, InputStream inputStream, boolean xml) {
        insertResultEntity(inputStream, "REQ_" + id, "ExecuteRequest", xml ? "text/xml" : "text/plain");
    }

    @Override
    public String insertResponse(String id, InputStream inputStream) {
        return insertResultEntity(inputStream, id, "ExecuteResponse", "text/xml");
    }
    
    @Override
    protected String insertResultEntity(InputStream stream, String id, String type, String mimeType) {
    	/**
    	 * The following is a possible memory risk.  Blodgett says its possible
    	 * to get a data stream that will overflow our available memory but this
    	 * is an issue that is present in many places in GDP (circa 7/07/14 Blodgett).
    	 * 
    	 *  He wants this bug fix (JIRA GDP-810) in place asap and assumes Jordan
    	 *  will improvise a fix for this possibility with the rewrite (circa 7/07/14 Blodgett).
    	 */
    	StringWriter writer = new StringWriter();
    	try {
			IOUtils.copy(stream, writer, DEFAULT_ENCODING);
		} catch (IOException e) {
			LOGGER.error("Failed to copy data stream", e);
			return "";
		}
    	String data = writer.toString();
    	writer.flush();
    	try {
			writer.close();
		} catch (IOException e) {
			LOGGER.warn("Failed to close stream writer.  Continuing...", e);
		}
    	
    	/**
    	 * Save response to disk for further requests.
    	 * 
    	 * If we save it like this we change the data saved into the DB as the
    	 * name of the file instead of the actual data
    	 */
    	boolean isOutput = null != id && id.toLowerCase().contains("output");
//    	if (isOutput && !DatabaseUtil.getDatabasePropertyUtil().extractBoolean("saveResultsToDB", true)) {
//            try {
//                data = writeDataToDiskWithGZIP(id, data);
//            } catch (Exception ex) {
//                LOGGER.error("Failed to write output data to disk", ex);
//            }
//        }
//    	
    	Connection connection = getConnection();
    	
    	/**
    	 *  This is a single insert but we'll use a prepared statement for auto
    	 *  escaping.
    	 */
    	PreparedStatement insertStatement;
		try {
			insertStatement = connection.prepareStatement(insertionString);
		} catch (SQLException e) {
			LOGGER.error("Failed to create prepared statement", e);
			
			try {
		    	connection.close();
	    	} catch (Exception e1) {
	    		LOGGER.warn("Failed to close database connection.", e1);
	    	}
			return "";
		}
    	
		/**
    	 * Result insert looks like:
    	 * 
    	 * 		"INSERT INTO RESULTS VALUES (id, date, type, data, mimeType)"
    	 */
        try {
			insertStatement.setString(INSERT_COLUMN_REQUEST_ID, id);
	        insertStatement.setTimestamp(INSERT_COLUMN_REQUEST_DATE, new Timestamp(Calendar.getInstance().getTimeInMillis()));
	        insertStatement.setString(INSERT_COLUMN_RESPONSE_TYPE, type);
	        insertStatement.setString(INSERT_COLUMN_RESPONSE, data);
	        insertStatement.setString(INSERT_COLUMN_MIME_TYPE, mimeType);
	        
	        insertStatement.executeUpdate();
	        
	        LOGGER.debug("inserted data {" + data + "} into database with id of:" + id + ", type of: " + type + ", mimetype of: " + mimeType);
        } catch (SQLException e) {
			LOGGER.error("Failed to insert data into database for ID: " + id, e);
		} finally {    	
	    	try {
	    		insertStatement.close();
	    	} catch (Exception e) {
	    		LOGGER.warn("Failed to close database statement.  Continuing...", e);
	    	}
	    	
	    	try {
		    	connection.close();
	    	} catch (Exception e) {
	    		LOGGER.warn("Failed to close database connection.  Continuing...", e);
	    	}
		}

        return generateRetrieveResultURL(id);
    }

    @Override
    public void updateResponse(String id, InputStream stream) {
    	/**
    	 * The following is a possible memory risk.  Blodgett says its possible
    	 * to get a data stream that will overflow our available memory but this
    	 * is an issue that is present in many places in GDP (circa 7/07/14 Blodgett).
    	 * 
    	 *  He wants this bug fix (JIRA GDP-810) in place asap and assumes Jordan
    	 *  will improvise a fix for this possibility with the rewrite (circa 7/07/14 Blodgett).
    	 */
        StringWriter writer = new StringWriter();
    	try {
			IOUtils.copy(stream, writer, DEFAULT_ENCODING);
		} catch (IOException e) {
			LOGGER.error("Failed to copy data stream", e);
			return;
		}
    	String data = writer.toString();
    	writer.flush();
    	try {
			writer.close();
		} catch (IOException e) {
			LOGGER.warn("Failed to close stream writer.  Continuing...", e);
		}

    	Connection connection = getConnection();
    	
    	/**
    	 *  This is a single insert but we'll use a prepared statement for auto
    	 *  escaping.
    	 */
    	PreparedStatement updateStatement;
		try {
			updateStatement = connection.prepareStatement(updateString);
		} catch (SQLException e) {
			LOGGER.error("Failed to create prepared statement", e);
			
			try {
		    	connection.close();
	    	} catch (Exception e1) {
	    		LOGGER.warn("Failed to close database connection.", e1);
	    	}
			
			return;
		}
		
		/**
    	 * Result update looks like:
    	 * 		"UPDATE RESULTS SET RESPONSE = ('') WHERE REQUEST_ID = ('')"
    	 */
		try {			
			updateStatement.setString(UPDATE_COLUMN_REQUEST_ID, id);
            updateStatement.setString(UPDATE_COLUMN_RESPONSE, data);
            updateStatement.executeUpdate();
	        
	        LOGGER.debug("inserted data {" + data + "} into database with id of:" + id);
        } catch (SQLException e) {
			LOGGER.error("Failed to insert data into database for ID: " + id, e);
		} finally {    	
	    	try {
	    		updateStatement.close();
	    	} catch (Exception e) {
	    		LOGGER.warn("Failed to close database statement.  Continuing...", e);
	    	}
	    	
	    	try {
		    	connection.close();
	    	} catch (Exception e) {
	    		LOGGER.warn("Failed to close database connection.  Continuing...", e);
	    	}
		}
    }

    @Override
    public InputStream lookupResponse(String id) {
        InputStream result = null;
        if (null != id) {
            try (Connection connection = getConnection(); PreparedStatement selectStatement = connection.prepareStatement(selectionString)) {
                selectStatement.setString(SELECTION_STRING_REQUEST_ID_PARAM_INDEX, id);
                try (ResultSet rs = selectStatement.executeQuery()) {
                    if (null == rs || !rs.next()) {
                        LOGGER.warn("No response found for request id " + id);
                    } else {
                        result = rs.getAsciiStream(SELECTION_STRING_RESPONSE_COLUMN_INDEX);
                    }
                }
            } catch (SQLException ex) {
                LOGGER.error("Could not look up response in database", ex);
            }

            if (null != result) {
//                if (id.toLowerCase().contains("output") && !DatabaseUtil.getDatabasePropertyUtil().extractBoolean("saveResultsToDB", true)) {
//                    try {
//                        String outputFileLocation = IOUtils.toString(result);
//                        LOGGER.debug("ID {} is output and saved to disk instead of database. Path = " + outputFileLocation);
//                        if (Files.exists(Paths.get(outputFileLocation))) {
//                            result = new GZIPInputStream(new FileInputStream(outputFileLocation));
//                        } else {
//                            LOGGER.warn("Response not found on disk for id " + id + " at " + outputFileLocation);
//                        }
//                    } catch (FileNotFoundException ex) {
//                        LOGGER.warn("Response not found on disk for id " + id, ex);
//                    } catch (IOException ex) {
//                        LOGGER.warn("Error processing response for id " + id, ex);
//                    }
//                }
            } else {
                LOGGER.warn("response found but returned null");
            }
        } else {
            LOGGER.warn("tried to look up response for null id, returned null");
        }
        return result;
    }

    @Override
    public String getMimeTypeForStoreResponse(String id) {
        String mimeType = null;
        try (Connection connection = getConnection(); PreparedStatement selectStatement = connection.prepareStatement(selectionString)) {
            selectStatement.setString(SELECTION_STRING_REQUEST_ID_PARAM_INDEX, id);
            try (ResultSet rs = selectStatement.executeQuery()) {
                if (null == rs || !rs.next()) {
                    LOGGER.warn("No response found for request id " + id);
                } else {
                    mimeType = rs.getString(SELECTION_STRING_RESPONSE_MIMETYPE_COLUMN_INDEX);
                }
            }
        } catch (SQLException ex) {
            LOGGER.error("Could not look up response in database", ex);
        }
        return mimeType;
    }

    @Override
    public File lookupResponseAsFile(String id) {
//        if (id.toLowerCase().contains("output") && !DatabaseUtil.getDatabasePropertyUtil().extractBoolean("saveResultsToDB", true)) {
//            try {
//                String outputFileLocation = IOUtils.toString(lookupResponse(id));
//                return new File(new URI(outputFileLocation));
//            } catch (URISyntaxException | IOException ex) {
//                LOGGER.warn("Could not get file location for response file for id " + id, ex);
//            }
//        }
//        LOGGER.warn("requested response as file for a response stored in the database, returning null");
        return null;
    }

    /**
     * @param filename base filename
     * @param stream data stream to write to disk, compressed using gzip
     * @return a stream of the file URI pointing where the data was written
     * @throws IOException
     */
    private BufferedInputStream writeDataStreamToDiskWithGZIP(String filename, InputStream stream) throws Exception {
        Path filePath = Files.createFile(BASE_DIRECTORY.resolve(Joiner.on(".").join(filename, SUFFIX_GZIP)));
        OutputStream outputStream = new GZIPOutputStream(Files.newOutputStream(filePath));
        IOUtils.copy(stream, outputStream);
        IOUtils.closeQuietly(outputStream);
        byte[] filePathByteArray = filePath.toUri().toString().replaceFirst(FILE_URI_PREFIX, "").getBytes();
        return new BufferedInputStream(new ByteArrayInputStream(filePathByteArray));
    }
    
    /**
     * 
     * @param filename base filename
     * @param data String of data to write to disk, compressed using gzip
     * @return String of the file URI pointing where the data was written
     * @throws Exception
     */
    private String writeDataToDiskWithGZIP(String filename, String data) throws Exception {    	
        Path filePath = Files.createFile(BASE_DIRECTORY.resolve(Joiner.on(".").join(filename, SUFFIX_GZIP)));
        BufferedWriter writer = null;
        GZIPOutputStream zip = new GZIPOutputStream(new FileOutputStream(filePath.toFile()));
        writer = new BufferedWriter(new OutputStreamWriter(zip, DEFAULT_ENCODING));
        writer.append(data);
        writer.close();
        
        return filePath.toUri().toString().replaceFirst(FILE_URI_PREFIX, "");
    }

	protected void closeConnection(Connection con) {
		throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
	}

	@Override
	public void shutdown() {
		throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
	}

    private interface ConnectionHandler {

        public Connection getConnection() throws SQLException;
    }

    private class JNDIConnectionHandler implements ConnectionHandler {

        private final DataSource dataSource;

        public JNDIConnectionHandler(String jndiName) throws NamingException {
            InitialContext context = new InitialContext();
            dataSource = (DataSource) context.lookup("java:comp/env/jdbc/" + jndiName);
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection conn = dataSource.getConnection();
            return conn;
        }
    }

    private class DefaultConnectionHandler implements ConnectionHandler {

        private final String dbConnectionURL;
        private final Properties dbProps;

        public DefaultConnectionHandler(String dbConnectionURL, Properties dbProps) {
            this.dbConnectionURL = dbConnectionURL;
            this.dbProps = dbProps;
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection conn = DriverManager.getConnection(dbConnectionURL, dbProps);
            return conn;
        }
    }

    private class WipeTimerTask extends TimerTask {

        private final long thresholdMillis;
        private static final String DELETE_STATEMENT = "DELETE FROM RESULTS WHERE RESULTS.REQUEST_ID = ANY ( ? );";
        private static final int DELETE_STATEMENT_LIST_PARAM_INDEX = 1;
        private static final String LOOKUP_STATEMENT = "SELECT * FROM "
                + "(SELECT REQUEST_ID, EXTRACT(EPOCH FROM REQUEST_DATE) * 1000 AS TIMESTAMP FROM RESULTS) items WHERE TIMESTAMP < ?";
        private static final int LOOKUP_STATEMENT_TIMESTAMP_PARAM_INDEX = 1;
        private static final int LOOKUP_STATEMENT_REQUEST_ID_COLUMN_INDEX = 1;

        WipeTimerTask(long thresholdMillis) {
            this.thresholdMillis = thresholdMillis;
        }

        @Override
        public void run() {
            LOGGER.info(getDatabaseName() + " Postgres wiper, checking for records older than {} ms", thresholdMillis);
//            Boolean savingResultsToDB = DatabaseUtil.getDatabasePropertyUtil().extractBoolean("saveResultsToDB", true);
//            try {
//                int deletedRecordsCount = wipe(savingResultsToDB);
//                if (deletedRecordsCount > 0) {
//                    LOGGER.info(getDatabaseName() + " Postgres wiper, cleaned {} records from database", deletedRecordsCount);
//                } else {
//                    LOGGER.debug(getDatabaseName() + " Postgres wiper, cleaned {} records from database", deletedRecordsCount);
//                }
//            } catch (SQLException | IOException ex) {
//                LOGGER.warn(getDatabaseName() + " Postgres wiper, failed to deleted old records", ex);
//            }
        }

        private int wipe(Boolean saveResultsToDB) throws SQLException, IOException {
            LOGGER.debug(getDatabaseName() + " Postgres wiper, checking for records older than {} ms", thresholdMillis);
            int deletedRecordsCount = 0;
            List<String> oldRecords = findOldRecords();
            if (!saveResultsToDB) {
                for (String recordId : oldRecords) {
                    if (recordId.toLowerCase().contains("output")) {
                        Files.deleteIfExists(Paths.get(BASE_DIRECTORY.toString(), recordId));
                    }
                }
            }
            if (!oldRecords.isEmpty()) {
                deletedRecordsCount = deleteRecords(oldRecords);
            }
            return deletedRecordsCount;
        }

        private int deleteRecords(List<String> recordIds) throws SQLException {
            int deletedRecordsCount = 0;
            try (Connection connection = getConnection(); PreparedStatement deleteStatement = connection.prepareStatement(DELETE_STATEMENT)) {
                deleteStatement.setArray(DELETE_STATEMENT_LIST_PARAM_INDEX, connection.createArrayOf("varchar", recordIds.toArray()));
                deletedRecordsCount = deleteStatement.executeUpdate();
            }
            return deletedRecordsCount;
        }

        private List<String> findOldRecords() throws SQLException {
            List<String> matchingRecords = new ArrayList<>();
            try (Connection connection = getConnection(); PreparedStatement lookupStatement = connection.prepareStatement(LOOKUP_STATEMENT)) {
                long ageMillis = System.currentTimeMillis() - thresholdMillis;
                lookupStatement.setLong(LOOKUP_STATEMENT_TIMESTAMP_PARAM_INDEX, ageMillis);
                try (ResultSet rs = lookupStatement.executeQuery()) {
                    while (rs.next()) {
                        matchingRecords.add(rs.getString(LOOKUP_STATEMENT_REQUEST_ID_COLUMN_INDEX));
                    }
                }
            }
            return matchingRecords;
        }
    }
}
