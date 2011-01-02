package gov.usgs.cida.gdp.wps.algorithm;

import gov.usgs.cida.gdp.coreprocessing.Delimiter;
import gov.usgs.cida.gdp.coreprocessing.analysis.grid.FeatureCoverageWeightedGridStatistics;
import gov.usgs.cida.gdp.coreprocessing.analysis.grid.FeatureCoverageWeightedGridStatistics.GroupBy;
import gov.usgs.cida.gdp.coreprocessing.analysis.grid.FeatureCoverageWeightedGridStatisticsWriter.Statistic;
import gov.usgs.cida.gdp.wps.binding.CSVDataBinding;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.SchemaException;
import org.n52.wps.io.data.IData;
import org.n52.wps.io.data.binding.complex.GTVectorDataBinding;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.operation.TransformException;
import ucar.ma2.InvalidRangeException;
import ucar.ma2.Range;
import ucar.nc2.dt.GridDataset;
import ucar.nc2.dt.GridDatatype;
import ucar.nc2.ft.FeatureDataset;

/**
 *
 * @author tkunicki
 */
public class FeatureWeightedGridStatisticsAlgorithm extends BaseAlgorithm {

    private final static String I_FEATURE_COLLECTION = "FEATURE_COLLECTION";
    private final static String I_FEATURE_ATTRIBUTE_NAME = "FEATURE_ATTRIBUTE_NAME";
    private final static String I_DATASET_URI = "DATASET_URI";
    private final static String I_DATASET_ID = "DATASET_ID";
    private final static String I_TIME_START = "TIME_START";
    private final static String I_TIME_END = "TIME_END";
    private final static String I_STATISTICS = "STATISTICS";
    private final static String I_GROUP_BY = "GROUP_BY";
    private final static String I_DELIMITER = "DELIMITER";

    private final static String O_OUTPUT = "OUTPUT";

    private final static Map<String, InputDescriptor> INPUT;
    private final static Map<String, OutputDescriptor> OUTPUT;
    private final static AlgorithmDescriptor ALGORITHM_DESCRIPTOR;

    static {
        ALGORITHM_DESCRIPTOR = AlgorithmDescriptor.builder(FeatureWeightedGridStatisticsAlgorithm.class).
                version("1.0.0").
                storeSupported(true).
                statusSupported(true).build();

        Map<String, InputDescriptor> imap = new LinkedHashMap<String, InputDescriptor>();
        imap.put(I_FEATURE_COLLECTION,
                ComplexDataInputDescriptor.builder(GTVectorDataBinding.class).build());
        imap.put(I_FEATURE_ATTRIBUTE_NAME,
                LiteralDataInputDescriptor.stringBuilder().build());
        imap.put(I_DATASET_URI,
                LiteralDataInputDescriptor.anyURIBuilder().build());
        imap.put(I_DATASET_ID,
                LiteralDataInputDescriptor.stringBuilder().build());
        imap.put(I_TIME_START,
                LiteralDataInputDescriptor.dateBuilder().minOccurs(0).build());
        imap.put(I_TIME_END,
                LiteralDataInputDescriptor.dateBuilder().minOccurs(0).build());
        imap.put(I_STATISTICS,
                LiteralDataInputDescriptor.stringBuilder().minOccurs(0).maxOccurs(Statistic.values().length).allowedValues(Statistic.class).build());
        imap.put(I_GROUP_BY,
                LiteralDataInputDescriptor.stringBuilder().allowedValues(GroupBy.class).build());
        imap.put(I_DELIMITER,
                LiteralDataInputDescriptor.stringBuilder().allowedValues(Delimiter.class).build());
        INPUT = Collections.unmodifiableMap(imap);

        Map<String, OutputDescriptor> omap = new LinkedHashMap<String, OutputDescriptor>();
        omap.put(O_OUTPUT, ComplexDataOutputDescriptor.builder(CSVDataBinding.class).build());
        OUTPUT = Collections.unmodifiableMap(omap);
    }

    public FeatureWeightedGridStatisticsAlgorithm() {
            super();
    }

    @Override
    protected AlgorithmDescriptor getAlgorithmDescriptor() {
        return ALGORITHM_DESCRIPTOR;
    }

    @Override
    protected Map<String, InputDescriptor> getInputDescriptorMap() {
        return INPUT;
    }

    @Override
    protected Map<String, OutputDescriptor> getOutputDescriptorMap() {
        return OUTPUT;
    }

    @Override
    public Map<String, IData> run(Map<String, List<IData>> input) {

        Map<String, IData> output = new HashMap<String, IData>();

        FeatureCollection featureCollection = null;
        FeatureDataset featureDataset = null;
        BufferedWriter writer = null;
        try {
            featureCollection = extractFeatureCollection(input, I_FEATURE_COLLECTION);
            String featureAttributeName = extractString(input, I_FEATURE_ATTRIBUTE_NAME);

            featureDataset = extractFeatureDataset(input, I_DATASET_URI);
            String featureDatasetID = extractString(input, I_DATASET_ID);

            GridDatatype gridDatatype = null;
            if (featureDataset instanceof GridDataset) {
                gridDatatype = ((GridDataset)featureDataset).findGridDatatype(featureDatasetID);

                Range timeRange = generateTimeRange(
                        gridDatatype,
                        extractDate(input, I_TIME_START),
                        extractDate(input, I_TIME_END));

                List<String> statisticStringList = extractStringList(input, I_STATISTICS);
                List<Statistic> statisticList = statisticStringList.size() < 1 ?
                    Arrays.asList(Statistic.values()) :
                    convertStringToEnumList(statisticStringList, Statistic.class);

                String delimiterString = extractString(input, I_DELIMITER);
                Delimiter delimiter = delimiterString == null ?
                    Delimiter.COMMA :
                    Delimiter.valueOf(delimiterString);

                String groupByString = extractString(input, I_GROUP_BY);
                GroupBy groupBy = groupByString == null ?
                    GroupBy.STATISTIC :
                    GroupBy.valueOf(groupByString);

                File file = File.createTempFile("gdp", "csv");
                writer = new BufferedWriter(new FileWriter(file));

                FeatureCoverageWeightedGridStatistics.execute(
                        featureCollection,
                        featureAttributeName,
                        gridDatatype,
                        timeRange,
                        statisticList,
                        writer,
                        groupBy,
                        delimiter);

                writer.flush();
                writer.close();

                output.put(O_OUTPUT, new CSVDataBinding(file));
            }

        } catch (InvalidRangeException e) {
            throw new RuntimeException(e);
        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (FactoryException e) {
            throw new RuntimeException(e);
        } catch (TransformException e) {
            throw new RuntimeException(e);
        } catch (SchemaException e) {
            throw new RuntimeException(e);
        } finally {
            if (featureDataset != null) try { featureDataset.close(); } catch (IOException e) { }
            if (writer != null) try { writer.close(); } catch (IOException e) { }
        }
        return output;
    }
	
}
