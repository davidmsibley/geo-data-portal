package gov.usgs.cida.gdp.wps.parser;

import com.vividsolutions.jts.geom.Geometry;
import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import org.geotools.feature.FeatureIterator;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.instanceOf;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.junit.Assert.assertThat;
import org.junit.BeforeClass;
import org.junit.Ignore;
import org.junit.Test;
import org.opengis.feature.Feature;
import org.opengis.feature.simple.SimpleFeature;

/**
 *
 * @author tkunicki
 */
public class GMLStreamingFeatureCollectionTest {

    private static File conusStates;
    private static File arcGis;

    @BeforeClass
    public static void before() throws URISyntaxException {
        URL url = GMLStreamingFeatureCollectionTest.class.getResource("/gml/conus-states-sample.xml");
        conusStates = new File(url.toURI());

        url = GMLStreamingFeatureCollectionTest.class.getResource("/gml/arcgis-sample.xml");
        arcGis = new File(url.toURI());
    }

    public GMLStreamingFeatureCollectionTest() {
    }

    @Test
    public void testSimpleWFSParse() {
        GMLStreamingFeatureCollection fc = new GMLStreamingFeatureCollection(conusStates);
        assertThat(fc, notNullValue());
        assertThat(fc.getBounds(), notNullValue());
        assertThat(fc.getSchema(), notNullValue());
        assertThat(fc.size(), equalTo(1));

        FeatureIterator fi = null;
        try {
            fi = fc.features();
            assertThat(fi, notNullValue());
            assertThat(fi.hasNext(), is(true));
            while (fi.hasNext()) {
                Feature f = fi.next();
                assertThat(f, instanceOf(SimpleFeature.class));
                SimpleFeature sf = (SimpleFeature) f;
                Object go = sf.getDefaultGeometry();
                assertThat(go, instanceOf(Geometry.class));
            }
        } finally {
            if (fi != null) {
                fi.close();
            }
        }
    }

	@Ignore
    @Test
    public void testArcGISWFSParse() {
        GMLStreamingFeatureCollection fc = new GMLStreamingFeatureCollection(arcGis);
        assertThat(fc, notNullValue());
        assertThat(fc.getBounds(), notNullValue());
        assertThat(fc.getSchema(), notNullValue());
        assertThat(fc.size(), equalTo(1));

        FeatureIterator fi = null;
        try {
            fi = fc.features();
            assertThat(fi, notNullValue());
            assertThat(fi.hasNext(), is(true));
            while (fi.hasNext()) {
                Feature f = fi.next();
                assertThat(f, instanceOf(SimpleFeature.class));
                SimpleFeature sf = (SimpleFeature) f;
                Object go = sf.getDefaultGeometry();
                assertThat(go, instanceOf(Geometry.class));
            }
        } finally {
            if (fi != null) {
                fi.close();
            }
        }
    }
}
