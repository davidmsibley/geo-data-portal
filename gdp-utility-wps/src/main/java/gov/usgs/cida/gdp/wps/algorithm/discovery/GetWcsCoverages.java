package gov.usgs.cida.gdp.wps.algorithm.discovery;

import com.google.common.base.Preconditions;
import gov.usgs.cida.gdp.dataaccess.WCSCoverageInfoHelper;
import java.io.IOException;
import org.apache.commons.lang.StringUtils;
import org.n52.wps.algorithm.annotation.Algorithm;
import org.n52.wps.algorithm.annotation.Execute;
import org.n52.wps.algorithm.annotation.LiteralDataInput;
import org.n52.wps.algorithm.annotation.LiteralDataOutput;
import org.n52.wps.server.AbstractAnnotatedAlgorithm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author razoerb
 */
@Algorithm(version="1.0.0")
public class GetWcsCoverages extends AbstractAnnotatedAlgorithm {

    private static final Logger LOGGER = LoggerFactory.getLogger(GetWcsCoverages.class);
    
    private static final String PARAM_WCS_URL = "wcs-url";
    private static final String PARAM_RESULT = "result";
    
    private String wcsURL;
    private String result;
    
    @LiteralDataInput(identifier=PARAM_WCS_URL)
    public void setWcsURL(String wcsURL) {
        this.wcsURL = wcsURL;
    }
    
    @LiteralDataOutput(identifier=PARAM_RESULT)
    public String getResult() {
        return result;
    }
    
    @Execute
    public void process() {
        Preconditions.checkArgument(StringUtils.isNotBlank(wcsURL), "Invalid " + PARAM_WCS_URL);

        try {
            result = WCSCoverageInfoHelper.getWcsDescribeCoverages(wcsURL); 
        } catch (IOException ex) {
            LOGGER.error(ex.getMessage());
            addError(ex.getMessage());
            throw new RuntimeException("An error occured while processing request: " + ex.getMessage(),ex);
        }
    }
}
