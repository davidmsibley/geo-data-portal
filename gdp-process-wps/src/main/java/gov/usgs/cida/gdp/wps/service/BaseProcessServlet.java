package gov.usgs.cida.gdp.wps.service;

import java.io.StringReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import javax.naming.NamingException;
import javax.servlet.http.HttpServlet;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Unmarshaller;
import javax.xml.transform.stream.StreamSource;
import net.opengis.wps.v_1_0_0.Execute;
import org.n52.wps.DatabaseDocument.Database;
import org.n52.wps.PropertyDocument.Property;
import org.n52.wps.commons.WPSConfig;
import org.n52.wps.server.database.connection.ConnectionHandler;
import org.n52.wps.server.database.connection.JNDIConnectionHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
* @author abramhall
*/
public abstract class BaseProcessServlet extends HttpServlet {
    protected static final String WPS_NAMESPACE = "net.opengis.wps.v_1_0_0";
    private static final Logger LOGGER = LoggerFactory.getLogger(BaseProcessServlet.class);
    // FEFF because this is the Unicode char represented by the UTF-8 byte order mark (EF BB BF).
    private static final String UTF8_BOM = "\uFEFF";
    private static final int DEFAULT_OFFSET = 0;
    private static final int DEFAULT_LIMIT = 50;
    private static final int LIMIT_PARAM_INDEX = 1;
    private static final int OFFSET_PARAM_INDEX = 2;
    private static final String REQUESTS_QUERY = "select request_id from results where response_type = 'ExecuteRequest' order by request_date desc limit ? offset ?;";
    private ConnectionHandler connectionHandler;

    public BaseProcessServlet() {
        String jndiName = getDatabaseProperty("jndiName");
        if (null != jndiName) {
            try {
                connectionHandler = new JNDIConnectionHandler(jndiName);
            } catch (NamingException e) {
                LOGGER.error("Error creating database connection handler", e);
                throw new RuntimeException("Error creating database connection handler", e);
            }
        } else {
            LOGGER.error("Error creating database connection handler. No jndiName provided.");
            throw new RuntimeException("Must configure a Postgres JNDI datasource");
        }
    }
    
    private String getDatabaseProperty(String propertyName) {
        Database database = WPSConfig.getInstance().getWPSConfig().getServer().getDatabase();
        Property[] dbProperties = database.getPropertyArray();
        for (Property property : dbProperties) {
            if (property.getName().equalsIgnoreCase(propertyName)) {
                return property.getStringValue();
            }
        }
        return null;
    }
    
    protected final Connection getConnection() throws SQLException {
        return connectionHandler.getConnection();
    }
    
    /**
    * @return The latest
    * {@value gov.usgs.cida.gdp.wps.service.BaseProcessServlet#DEFAULT_LIMIT}
    * ExecuteRequest request ids
    * @throws SQLException
    */
    protected final List<String> getRequestIds() throws SQLException {
        return getRequestIds(DEFAULT_LIMIT, DEFAULT_OFFSET);
    }
    
    /**
    *
    * @param limit
    * the max number of results to return
    * @param offset
    * which row of the query results to start returning at
    * @return a list of ExecuteRequest request ids
    * @throws SQLException
    */
    protected final List<String> getRequestIds(int limit, int offset) throws SQLException {
        List<String> request_ids = new ArrayList<>();
        try (Connection conn = getConnection(); PreparedStatement pst = conn.prepareStatement(REQUESTS_QUERY)) {
            pst.setInt(LIMIT_PARAM_INDEX, limit);
            pst.setInt(OFFSET_PARAM_INDEX, offset);
            try (ResultSet rs = pst.executeQuery()) {
                while (rs.next()) {
                    String id = rs.getString(1);
                    request_ids.add(id);
                }
            }
        }
        return request_ids;
    }
    
    protected final String getIdentifier(String xml) throws JAXBException {
        JAXBContext context = JAXBContext.newInstance(WPS_NAMESPACE);
        Unmarshaller unmarshaller = context.createUnmarshaller();
        StreamSource source = new StreamSource(new StringReader(xml));
        JAXBElement<Execute> wpsExecuteElement = unmarshaller.unmarshal(source, Execute.class);
        Execute execute = wpsExecuteElement.getValue();
        String identifier = execute.getIdentifier().getValue();
        return identifier.substring(identifier.lastIndexOf(".") + 1);
    }
       
    protected final String removeUTF8BOM(String s) {
        if (s.startsWith(UTF8_BOM)) {
            s = s.substring(1);
        }
        return s;
    }
}