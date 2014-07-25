<%@page import="gov.usgs.cida.config.DynamicReadOnlyProperties"%>
<%@page import="org.slf4j.LoggerFactory"%>
<%@page import="java.io.File"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE HTML>
<%!	protected DynamicReadOnlyProperties props = null;

	{
		try {
			props = new DynamicReadOnlyProperties();
			props = props.addJNDIContexts(new String[0]);
		} catch (Exception e) {
			LoggerFactory.getLogger("index.jsp").error("Could not find JNDI - Application will probably not function correctly");
		}
	}
	boolean development = Boolean.parseBoolean(props.getProperty("development"));
%>
<html lang="en">
	<head>
		<META HTTP-EQUIV="CONTENT-TYPE" CONTENT="text/html; charset=UTF-8" />
		<meta HTTP-EQUIV="X-UA-Compatible" CONTENT="IE=9">
		<meta NAME="viewport" CONTENT="width=device-width, initial-scale=1.0">
		<link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />
		<link rel="icon" href="favicon.ico" type="image/x-icon" />
		<!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
		<!--[if lt IE 9]>
		  <script src="../../assets/js/html5shiv.js"></script>
		  <script src="../../assets/js/respond.min.js"></script>
		<![endif]-->
		<jsp:include page="template/USGSHead.jsp">
			<jsp:param name="relPath" value="" />
			<jsp:param name="shortName" value="USGS Geo Data Portal" />
			<jsp:param name="title" value="USGS Geo Data Portal" />
			<jsp:param name="description" value="" />
			<jsp:param name="author" value="Ivan Suftin" />
			<jsp:param name="keywords" value="" />
			<jsp:param name="publisher" value="" />
			<jsp:param name="revisedDate" value="" />
			<jsp:param name="nextReview" value="" />
			<jsp:param name="expires" value="never" />
			<jsp:param name="development" value="<%= development%>" />
		</jsp:include>
	</head>
	<body>
		<div class="container">
			<div id="overlay"></div>
			<div class="row">
				<jsp:include page="template/USGSHeader.jsp">
					<jsp:param name="relPath" value="" />
					<jsp:param name="header-class" value="" />
					<jsp:param name="site-title" value="USGS Geo Data Portal" />
				</jsp:include>
			</div>

			<div class="row">
				<div class="well">
					<p>
						This page is a catalog of the datasets that have been tested to 
						work well for access with the Geo Data Portal. Select one of the 
						buttons below to see a list of these datasets. At its core, the 
						Geo Data Portal is an advanced Open Geospatial Consortium Web 
						Processing Service that can be used in a wide variety of 
						applications against any web-accessible standards-compliant 
						dataset. If you'd like to see all the datasets that are 
						compatible with one of the processing types the Geo Data 
						Portal can perform, select one of those buttons below.
					</p>
					<p class="text-center">
						<a href="https://my.usgs.gov/confluence/display/GeoDataPortal/GDP+Home" target="_blank">For more information about the Geo Data Portal, please visit the Geo Data Portal Documentation Home.</a>
					</p>
				</div>
			</div>

			<div id="row-choice-start" class="row">
				<div id="col-choice-start-dataset" class="col-md-5 text-center">
					<div class="row">
						<h1>Datasets</h1>
					</div>
					<div class="row">
						<div class="btn-group btn-group-justified" data-toggle="buttons">
							<label class="btn btn-primary">
								<input type="radio" id="btn-choice-dataset-all" name="btn-choice-dataset-all" />All
							</label>
							<label class="btn btn-primary">
								<input type="radio" id="btn-choice-dataset-climate" name="btn-choice-dataset-climate" />Climate
							</label>
							<label class="btn btn-primary">
								<input type="radio" id="btn-choice-dataset-landscape" name="btn-choice-dataset-landscape" />Landscape
							</label>
						</div>
					</div>
				</div>
				<div id="col-choice-start-algorithm" class="col-md-5 col-md-offset-2 text-center">
					<div class="row">
						<h1>Processing</h1>
					</div>
					<div class="row">
						<div class="btn-group btn-group-justified" data-toggle="buttons">
							<label class="btn btn-primary">
								<input type="radio" id="btn-choice-algorithm-areal" name="btn-choice-algorithm-areal" />Areal Statistics
							</label>
							<label class="btn btn-primary">
								<input type="radio" id="btn-choice-algorithm-subset" name="btn-choice-algorithm-subset" />Data Subsets
							</label>
						</div>
					</div>
				</div>
			</div>

			<div id="row-csw-group" class="row">
				<div id="row-csw-select" class="row text-center">
					<label>Select Dataset
						<select id="form-control-select-csw" class="form-control"></select>
					</label>
				</div>
				<div id="row-csw-select-child" class="row text-center">
					<div class="down-arrow">&darr;</div>
					<select id="form-control-select-csw-child" class="form-control"></select>
				</div>
				<div id="row-csw-desc" class="row">
					<div id="col-csw-information-title" class="text-center col-md-12">
						<p id="p-csw-information-title" class="lead"></p>
					</div>
					<div id="col-csw-information-content" class="col-md-12">
						<p id="p-csw-information-content"></p>
					</div>
				</div>
			</div>

			<div id="row-proceed" class="row text-center">
				<button id="btn-proceed" class="btn btn-success">Process Data with the Geo Data Portal</button>
			</div>
			<div id="row-proceed-placeholder" class="row text-center spacer">
				<button id="btn-proceed-placeholder" class="btn btn-default disabled" disabled="disabled">
					Select a dataset and processing type to use with the Geo Data Portal
				</button>
			</div>

			<div class="row spacer">
				<div class="well">
					<p>
						The increasing availability of downscaled climate projections 
						and other large data products that summarize or predict climate 
						and land use conditions, is making use of these data more common 
						in research and management. Scientists and decisionmakers often 
						need to construct ensembles and compare climate hindcasts and future 
						projections for particular spatial areas. These tasks generally 
						require an investigator to procure all datasets of interest en masse, 
						integrate the various data formats and representations into commonly 
						accessible and comparable formats, and then extract the subsets of the 
						datasets that are actually of interest.
						This process can be challenging 
						and time intensive due to data-transfer, -storage, and(or) -processing 
						limits, or unfamiliarity with methods of accessing climate and land use 
						data. Data management for modeling and assessing the impacts of future 
						climate conditions is also becoming increasingly expensive due to the 
						size of the datasets. The Geo Data Portal addresses these limitations, 
						making access to numerous climate datasets for particular areas of 
						interest a simple and efficient task.
					</p>
					<p class="text-center">
						<a href="<%= props.getProperty("gdp.endpoint.gdp", "/gdp/client/")%>?development=true" target="_blank">Geo Data Portal interface for developers and advanced users. Most users should select a dataset and processing type above.</a>
					</p>
				</div>
			</div>
			<div id="row-incoming-caller-info" class="row text-center">
				<%-- If user is coming through an external caller (like ScienceBase), this will have content --%>
			</div>

			<div class="row">
				<jsp:include page="template/USGSFooter.jsp">
					<jsp:param name="relPath" value="" />
					<jsp:param name="header-class" value="" />
					<jsp:param name="site-url" value="<script type='text/javascript'>document.write(document.location.href);</script>" />
					<jsp:param name="contact-info" value="<a href='mailto:gdp@usgs.gov?Subject=GDP%20Derivative%20Portal%20Help%20Request'>Contact the Geo Data Portal team</a>" />
				</jsp:include>
			</div>
		</div>
		<jsp:include page="WEB-INF/jsp/scripts.jsp">
			<jsp:param name="development" value="<%= development%>" />
		</jsp:include>

		<%-- Unrecoverable Error Modal --%>
		<div  class="modal fade" role="dialog" aria-labelledby="modal-window-label" aria-hidden="true" data-backdrop="static" data-keyboard="false" id='unrecoverable-error-modal'>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h4  aria-labelledby="modal-window-label" class="modal-title">Application Error</h4>
					</div>
					<div class="modal-body">
					</div>
				</div>
			</div>
		</div>

		<%-- Full Record Modal Window --%>
		<div  class="modal fade" role="dialog" aria-labelledby="modal-window-label" aria-hidden="true" id='full-record-modal'>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close close-button" data-dismiss="modal" style="color:#000000;">X</button>
						<h4  aria-labelledby="modal-window-label" class="modal-title">Dataset Information</h4>
					</div>
					<div class="modal-body">
						<div id="metadata"></div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" data-dismiss="modal" aria-hidden="true">Close</button>
					</div>
				</div>
			</div>
		</div>
	</body>
</html>
