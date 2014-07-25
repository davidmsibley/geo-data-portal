var Dataset = function() {
    // This is set when the user selects a dataset from the dropdown or enters
    // one directly into the textbox and hits the select button. Use this in
    // getSelectedDatasetURL instead of the value of the textbox, in case the
    // user changes the textbox without hitting the select button.
    var _datasetURL = '';
    var gWmsURL = '';
    var _userEmail;
    var _userFilename;
    var _HTML_ID =  'dataset';
    
    var _ALGORITHM_DROPDOWN_CONTAINER = '#algorithm-dropdown-container';
    var _ALGORITHM_DROPDOWN = '#algorithm-dropdown';
    var _ALGORITHM_DOC_LINK = '#algorithm-documentation-link';
    var _ALGORITHM_DOC_CONTAINER = '#algorithm-documentation';
    var _ALGORITHM_CONFIG_LINK = '#configure-algorithm-link';
    var _ALGORITHM_CONFIGURATION_SUMMARY = '#algorithm-configuration-summary';
    var _ALGORITHM_DYNAMIC_CONTAINER_CONTENT = '#algorithm-dynamic-container-content';
    var _CSW_CLIENT = '#csw-client-div';
    var _CSW_HOST_SET_BUTTON = '#csw-host-set-button';
    var _CSW_HOST_PICK_BUTTON = '#csw-host-pick-button';
    var _CSW_URL_INPUT_BOX = '#csw-url-input-box';
    var _DATASET_ID = '#datasetId';
    var _DATASET_ID_LABEL = '#dataset-id-label';
    var _DATASET_ID_SELECTBOX = '#dataset-id-selectbox';
    var _DATASET_ID_TOOLTIP = '#dataset-id-tooltip';
    var _DATASET_URL_INPUT_BOX = '#dataset-url-input-box';
    var _DATE_PICKER_TABLE = '#date-pickers-table';
    var _DATE_PICKER_TOOLTIP = '#date-picker-tooltip';
    var _DATE_RANGE_FROM_INPUT_BOX = '#date-range-from-inputbox';
    var _DATE_RANGE_TO_INPUT_BOX = '#date-range-to-inputbox';
    var _EMAIL_INPUT_BOX = '#user-email';
    var _FILENAME_INPUT_BOX = '#user-filename';
    var _EMAIL_WHEN_FINISHED_ALGORITHM = 'gov.usgs.cida.gdp.wps.algorithm.communication.EmailWhenFinishedAlgorithm';
    var _FROM_DATE_PICKER = '#from-date-picker';
    var _MISSING_INPUT_SUMMARY = '#missing-input-summary';
    var _TO_DATE_PICKER = '#to-date-picker';
    var _RETRIEVE_OUTPUT_BUTTON = '#retrieve-output-button';
    var _RETRIEVE_OUTPUT_URL;
    var _RETRIEVE_PROC_INFO_BUTTON = '#retrieve-process-info-button';
    var _SELECT_DATASET_BUTTON = '#select-dataset-button';
    var _SUBMIT_FOR_PROCESSING_LINK = '#submit-for-processing-link';
    var _REDIR_TO_SB_BUTTON = "#redirect-to-sb-button";
    var _WMS_LABEL = '#wms-label';
    var _WMS_LAYER_SELECTBOX = '#wms-layer-selectbox';
    var _WMS_TOOLTIP = '#wms-tooltip';
    
    var _algorithmList;
    var _configured;
    var _hasTimeRange = false;
    var _usingCache = false;
    var gDatasetType;
    var _datasetTypeEnum = {
        WCS: 'wcs',
        OPENDAP: 'opendap'
    };

    function createAlgorithmDropdown() {
        logger.debug('GDP: Checking for populated Algorithm object.');
        
        if (!Algorithm.isPopulated()) {
            logger.warn('GDP: createAlgorithmDropdown() was called but the Algorithm object was not populated.');
            $(_ALGORITHM_DROPDOWN).append(
                $(Constant.optionString).attr('value', 'No Algorithms Found - Reload application')
                );
            $(_ALGORITHM_DROPDOWN).attr('disabled', 'disabled');
            logger.warn('GDP: Algorithm dropdown creation failed.');
            return false;
        }
        
        logger.debug('GDP: Creating algorithm dropdown container.');
        if (_algorithmList.length === 1) {
            logger.trace('GDP: Configured to display a single algorithm.');
            $(_ALGORITHM_DROPDOWN_CONTAINER).prepend('Algorithm: ' + Algorithm.algorithms[_algorithmList[0]].title);
            $(_ALGORITHM_DROPDOWN).addClass('hidden');
            $(_ALGORITHM_DROPDOWN).append(
                $(Constant.optionString).attr({
                    'value' : _algorithmList[0],
                    'selected' : 'selected'
                })
                );
            configureDocumentationLink(Algorithm.algorithms[_algorithmList[0]].title, Algorithm.algorithms[_algorithmList[0]].abstrakt);
            bindAlgorithmDropDown();
            bindSubmitForProcessingButton()
            logger.debug('GDP: Algorithm dropdown successfully created.');
            return true;
        } 
        
        logger.trace('GDP: Configured to display a multiple algorithms.');
        $(_ALGORITHM_DROPDOWN_CONTAINER).prepend($(Constant.labelString).attr('for', $(_ALGORITHM_DROPDOWN).attr('id')).html('Choose an algorithm: '));
        $(_ALGORITHM_DROPDOWN).append($(Constant.optionString).attr('value', ''));
        
        if (_algorithmList.length == 0) {
            logger.trace('GDP: Configured to display all algorithms. Populating dropdown.');
            // For each algorithm we use the 'ows:Identifier' long name as the option value
            // We use the title as the display value for the dropdown
            $.each(Algorithm.algorithms, function(i,v) {
                $(_ALGORITHM_DROPDOWN).append($(Constant.optionString).attr('value', i).html(v.title));
            });
            
            configureDocumentationLink('All Algorithms', 
                function() {
                    var aText = ''; 
                    $.each(Algorithm.algorithms, function(i,v) {
                        aText += '<h3>' + v.title + '</h3>';
                        aText += v.abstrakt + '<br /><br />';
                    })
                    return aText;
                }()
                );
            
        } else {
            logger.trace('GDP: Configured to display a limited list of algorithms. Populating dropdown.');
            $.each(_algorithmList, function(i,v) {
                if (!Algorithm.algorithms[v]) {
                    logger.warn('GDP: Configured to display algorithm"'+v+'" but algorithm does not exist on server. Possible misconfiguration. Skipping to next algorithm.');
                    _algorithmList.splice(i,1);
                    return true;
                }
                $(_ALGORITHM_DROPDOWN).append($(Constant.optionString).attr('value', v).html(Algorithm.algorithms[v].title));
            })
            
            configureDocumentationLink('All Algorithms', 
                function() {
                    var aText = ''; 
                    $.each(_algorithmList, function(i,v) {
                        aText += '<h3>' + Algorithm.algorithms[v].title + '</h3>';
                        aText += Algorithm.algorithms[v].abstrakt + '<br /><br />';
                    })
                    return aText;
                }()
                );
        }
            
        bindAlgorithmDropDown();
        bindSubmitForProcessingButton()
        return true;
    }

    function configureDocumentationLink(title, abstractText) {
        logger.debug('GDP: Adding algorithm documentation for: ' + title);
        $(_ALGORITHM_DOC_CONTAINER).html((abstractText) ? abstractText : 'This algorithm does not contain documentation.');
        
        $(_ALGORITHM_DOC_LINK).unbind('click');
        $(_ALGORITHM_DOC_LINK).click(function() {
            logger.debug('GDP: User has clicked on the documentation link for algorithm: ' + title);
            $(_ALGORITHM_DOC_CONTAINER).dialog({
                buttons: {
                    'OK' : function() {
                        $(this).dialog("close");
                    }
                },
                title: title + ' Description',
                width: '80%',
                height: 'auto',
                modal: true,
                resizable: false,
                draggable: false,
                zIndex: 9999
            });
        });
    }

    function bindAlgorithmDropDown() {
        // Bind the dropdown list
        $(_ALGORITHM_DROPDOWN).change(function() {
            var selectedAlgorithm = $(_ALGORITHM_DROPDOWN).find('option:selected').val();
                
            // Did the user select the blank option? 
            if (!selectedAlgorithm) {
                logger.debug('GDP: User has selected the blank option in the algorithm dropdown');
                
                logger.debug('GDP: Hiding configure link');
                $(_ALGORITHM_CONFIG_LINK).fadeOut(Constant.ui.fadespeed);
                
                logger.debug('GDP: Hiding submit link');
                $(_SUBMIT_FOR_PROCESSING_LINK).fadeOut(Constant.ui.fadespeed);
                
                logger.debug('GDP: Clearing the configuration summary');
                $(_ALGORITHM_CONFIGURATION_SUMMARY).fadeOut(Constant.ui.fadespeed);
                
                logger.debug('GDP: Hiding Redirect To ScienceBase Button');
                $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                
                logger.debug('GDP: Hiding CSW Client');
                $(_CSW_CLIENT).fadeOut(Constant.ui.fadespeed);
                
                if (_algorithmList.length === 0) {
                    logger.trace('GDP: Configuring documentation for all algorithms.');
                    configureDocumentationLink('All Algorithms', 
                        function() {
                            var aText = ''; 
                            $.each(Algorithm.algorithms, function(i,v) {
                                aText += '<h3>' + v.title + '</h3>';
                                aText += v.abstrakt + '<br /><br />';
                            });
                            return aText;
                        }()
                        );
                } else {
                    logger.trace('GDP: Configuring documentation for a limited subset of algorithms.');
                    configureDocumentationLink('All Algorithms', 
                        function() {
                            var aText = ''; 
                            $.each(_algorithmList, function(i,v) {
                                aText += '<h3>' + Algorithm.algorithms[v].title + '</h3>';
                                aText += Algorithm.algorithms[v].abstrakt + '<br /><br />';
                            })
                            return aText;
                        }()
                        );
                }
            } else {
                logger.debug('GDP: User has selected an algorithm ('+selectedAlgorithm+') in the dropdown');
                
                logger.debug('GDP: Configuring documentation for: ' + Algorithm.algorithms[selectedAlgorithm].title);
                configureDocumentationLink(Algorithm.algorithms[selectedAlgorithm].title, Algorithm.algorithms[selectedAlgorithm].abstrakt);
                
                if (Algorithm.algorithms[selectedAlgorithm].needsConfiguration) {
                    populateDynamicContent(Algorithm.algorithms[selectedAlgorithm].xml);
                } else {
                    logger.debug('GDP: ' + Algorithm.algorithms[selectedAlgorithm].title + ' does not need configuration.');

                    logger.debug('GDP: Hiding configuration link');
                    $(_ALGORITHM_CONFIG_LINK).fadeOut(Constant.ui.fadeSpeed);

                    logger.debug('GDP: Displaying submit link');
                    $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);

                    logger.debug('GDP: Erasing contents in configuration summary');
                    $(_ALGORITHM_CONFIGURATION_SUMMARY).fadeOut(Constant.ui.fadeSpeed);
                    
                    logger.debug('GDP: Hiding Redirect To ScienceBase Button');
                    $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                    
                }
                
                if (Algorithm.algorithms[selectedAlgorithm].inputs['DATASET_URI'] != undefined) {
                    logger.debug('GDP: Algorithm requires a CSW dataset. Setting up the CSW client.');
                    setupCSWClientView();    
                    $(_CSW_CLIENT).fadeIn(Constant.ui.fadeSpeed);
                } else {
                    logger.debug('GDP: Algorithm does not require a CSW dataset. Hiding the CSW client.');
                    $(_CSW_CLIENT).fadeOut(Constant.ui.fadeSpeed);
                }
                
            }
        });
    }

    /**
     * Goes through the WPS DescribeProcess response and uses each <input> field
     * to create a dynamic form
     */
    function populateDynamicContent (xml) {
        logger.trace('GDP: Removing all information from the algorithm dynamic input container and beginning rebuild.');
        $(_ALGORITHM_DYNAMIC_CONTAINER_CONTENT).html('');
        
        var isIE7 = $.browser.msie  && parseInt($.browser.version, 10) === 7;
        var algorithm = $(xml).find('ns1|Identifier').first().text();
        
        // If we find that this algorithm doesn't take TIME_START and we HAVE a TIME_START,
        // that means we don't have the right dataset for this algorithm
        // NOTE- This was commented out and we will be using the reverse logic. We will test whether or not 
        // a dataset is valid based on the algorithm chosen
        //        if (Dataset.getFromDate() && !$(xml).find('DataInputs > Input > ns1|Identifier:contains(TIME_START)').length) {
        //            // show error
        //            showErrorNotification("The dataset you chose is not compatible with this algorithm.");
        //            $('#submitForProcessingButton').attr('disabled', '');
        //            return;
        //        }

        logger.debug('GDP: Populating dynamic configuration information for algorithm: ' + Algorithm.algorithms[algorithm].title);
        
        // Add the algorithm full name to the container in a hidden field
        $(_ALGORITHM_DYNAMIC_CONTAINER_CONTENT).append(
            $(Constant.divString).addClass('hidden').append(
                $(Constant.inputString).attr({
                    'id' : 'di_algorithm_identifier',
                    'name' : 'di_algorithm_identifier',
                    'type' : 'hidden',
                    'value' : algorithm
                })
                )
            );

        // For each input field we add the HTML element for this type of field
        $(xml).find('DataInputs > Input').each(function(index, element){
            $(_ALGORITHM_DYNAMIC_CONTAINER_CONTENT).append(
                createHTMLInputField(element)
                );
            $('.di_identifier').hide();
        });
        initializeTips();
        
        bindDynamicInputElements();

        logger.debug('GDP: Algorithm requires further configuration. Displaying configuration modal window.');
        
        $(_ALGORITHM_DYNAMIC_CONTAINER_CONTENT).dialog({
            buttons: {
                'OK' : function() {
                    _configured = true;
                    logger.debug('GDP: Algorithm is now configured.');
                    
                    logger.debug('GDP: Closing the configuration dialog.');
                    $(this).dialog("close");
                    
                    logger.trace('GDP: Displaying algorithm configuration link.');
                    $(_ALGORITHM_CONFIG_LINK).fadeIn(Constant.ui.fadeSpeed);
                    
                    $(_ALGORITHM_CONFIG_LINK).click(function() {
                        $(_ALGORITHM_DROPDOWN).trigger('change');
                    });
                    
                    populateConfigurationSummary();

                    logger.trace('GDP: Displaying submit link.');
                    $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
                }
            },
            title: 'Configure ' + Algorithm.algorithms[algorithm].title,
            width: isIE7 ? $(window).width() * .75 : 'auto',
            height: isIE7 ? $(window).height() * .75 : 'auto',
            resizable: true,
            draggable: false,
            modal: true,
            zIndex: 9999
        });
    }

    function submitForProcessingCallback(xml) {
        showThrobber(true);
        if (!WPS.checkWpsResponse(xml, 'Error submitting request for processing.')) {
            $(_RETRIEVE_OUTPUT_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            $(_RETRIEVE_PROC_INFO_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
            return false;
        }

        var statusLocation = $(xml).find('ns|ExecuteResponse').attr('statusLocation');

        var wpsInputs = {
            'wps-checkpoint': [statusLocation],
            'email': [_userEmail]
        };
        
        if(_userFilename.length > 0) {
        	wpsInputs = {
                'wps-checkpoint': [statusLocation],
                'email': [_userEmail],
                'filename': [_userFilename]
            };
        }
        
        if (ScienceBase.useSB && Constant.endpoint && Constant.endpoint.redirect_url) {
            wpsInputs['callback-base-url'] = [Constant.endpoint.redirect_url + "?result="];
        }

        if (_userEmail) {
            logger.info('GDP:dataset.js::submitForProcessingCallback:User entered an email address '+_userEmail+' during process submittal. Email when finished algorithm will be dispatched to check for process completion.');
            WPS.sendWpsExecuteRequest(Constant.endpoint.proxy + Constant.endpoint.utilitywps, _EMAIL_WHEN_FINISHED_ALGORITHM, wpsInputs, ['result'], false, emailCallback);
        }

        var statusID = (statusLocation.split('?')[1]).split('id=')[1];

        var intervalID = window.setInterval(function() {
            $.ajax({
                url : Constant.endpoint.proxy + Constant.endpoint.statuswps,
                data : {
                    'id': statusID
                },
                success : function(data, textStatus, XMLHttpRequest) {
                    statusCallback(XMLHttpRequest.responseText, intervalID, statusID);
                },
                error : function() {
                //$(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
                //window.clearInterval(intervalID);
                }
            });
        }, 5000);

        showNotification('Processing your request.');
    }
    
    function emailCallback(xml) {
        WPS.checkWpsResponse(xml, 'Error setting up email acknowledgment.');
    }

    function statusCallback(xmlText, intervalID, statusID) {
        // Workaround and extra logging for bug where empty xml is returned. 
        // Ignore it and keep rechecking.
        if (!xmlText || xmlText == '') {
            logger.warn('GDP: RetrieveResultServlet returned empty response. Retrying.');
            return;
        }
        
        var xml = $.xmlDOM(xmlText);
        
        if (xml.length == 0) {
            logger.warn('GDP: RetrieveResultServlet response is not valid xml. Retrying. Invalid xml = \'' + xmlText + '\'');
            return;
        } 

        xml = xml[0];
        if (!WPS.checkWpsResponse(xml, 'Error checking status of submission. Automatic checking has been cancelled.')) {
            logger.warn('GDP: error xml = \'' + xmlText + '\'');
            window.clearInterval(intervalID);
            hideThrobber(true);
            logger.debug('GDP: Hiding retrieve process output link');
            $(_RETRIEVE_OUTPUT_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Hiding retrieve process information link');
            $(_RETRIEVE_PROC_INFO_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Showing submit for processing link');
            $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Hiding Redirect To ScienceBase Button');
            $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            
            return;
        }
        
        if ($(xml).find('ns|ProcessStarted').length > 0) {
            logger.debug('GDP: STATUS: Process started.');
        } else if ($(xml).find('ns|ProcessSucceeded').length > 0) {
            window.clearInterval(intervalID);
            hideThrobber(true);
            
            logger.debug('GDP: STATUS: Process successfully completed.')
            showNotification('Your request has successfully completed.', true);
            _RETRIEVE_OUTPUT_URL = $(xml).find('ns|Output').find('ns|Reference').attr('href');
            
            if(_userFilename.length > 0) {
            	_RETRIEVE_OUTPUT_URL = _RETRIEVE_OUTPUT_URL + '&filename=' + _userFilename;
            }
            
            logger.debug('GDP: Showing submit for processing link');
            $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Binding retrieve output link');
            bindRetrieveOutputButton();
            
            logger.debug('GDP: Showing retrieve output link');
            $(_RETRIEVE_OUTPUT_BUTTON).fadeIn(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Binding retrieve process info link with status ID: ' + statusID);
            bindRetrieveProcInfoButton(statusID);
            
            logger.debug('GDP: Showing retrieve process information link');
            $(_RETRIEVE_PROC_INFO_BUTTON).fadeIn(Constant.ui.fadeSpeed);
            
            if (ScienceBase.useSB) {
                $(_REDIR_TO_SB_BUTTON).fadeIn(Constant.ui.fadeSpeed);
                $(_REDIR_TO_SB_BUTTON).click(function() {
                    
                    // Remove the "Do you want to leave this page OK/CANCEL"
                    // Only if not IE7 -- http://internal.cida.usgs.gov/jira/browse/GDP-505
                    if (!($.browser.msie  && parseInt($.browser.version) == 7) && Constant.ui.view_pop_unload_warning == 1) {
                        window.onbeforeunload = null;
                    }
                    
                    // Open a modal dialog warning about redirection for 5 seconds
                    $('<div />', {
                        id : 'redirect_window'
                    })
                    .html('You are being redirected to Science Base')
                    .append('body')
                        
                    var urlAndData = _RETRIEVE_OUTPUT_URL.split('?');
                    var resultUrl = encodeURIComponent(urlAndData[0] + '?id=' + statusID);
                    window.location = Constant.endpoint.redirect_url + "?result=" + resultUrl;
                })
            }
        } else if ($(xml).find('ns|ProcessFailed').length > 0) {
            window.clearInterval(intervalID);
            hideThrobber(true);
            logger.warn('GDP: STATUS: Process Failed: '+ $(xml).find('ns|ProcessFailed').find('ns1|ExceptionText').text())
            showErrorNotification('Process failed: ' + $(xml).find('ns|ProcessFailed').find('ns1|ExceptionText').text(), true);
            
            logger.debug('GDP: Hiding retrieve process output link');
            $(_RETRIEVE_OUTPUT_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Hiding retrieve process information link');
            $(_RETRIEVE_PROC_INFO_BUTTON).fadeOut(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Showing submit for processing link');
            $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
            
            logger.debug('GDP: Hiding Redirect To ScienceBase Button');
            $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
        } else {
            showErrorNotification('Unknown response received from server. This should not affect processing. Retrying.');
            logger.warning('GDP: STATUS: Unknown wps response = ' + '\'' + xmlText + '\'');
        }
    }

    function _createGetFeatureXML(featureType, attribute, featureIDs, options) {
        // For now, we're assuming that the geometry is associated with attribute
        // 'the_geom', which might not be true for all WFS servers. So make sure
        // that 'the_geom' is an attribute, and throw an error if not. Note that
        // this doesn't stop the submit process, it just presents the user with
        // the error. I put it here so that the assumption check is close to
        // where the assumption is made (below, when creating the xml).
        logger.debug('GDP: Creating XML needed for inline WFS call for process.')
        
        if (!options) options = {};
        
        AOI.callDescribeFeatureType(featureType, function(data) {
            var attrNames = [];

            $(data).find('xsd|complexType').find('xsd|element').each(function(index, elem) {
                attrNames.push($(elem).attr('name'));
            });

            if ($.inArray('the_geom', attrNames) == -1) {
                showErrorNotification('No "the_geom" attribute in WFS for ' + featureType);
            }
        });

        // TODO: don't hardcode 'the_geom'
        var xml =
        '<wfs:GetFeature \
                  service="WFS" \
                  version="1.1.0" \
                  outputFormat="text/xml; subtype=gml/3.1.1" \
                  xmlns:wfs="http://www.opengis.net/wfs" \
                  xmlns:ogc="http://www.opengis.net/ogc" \
                  xmlns:gml="http://www.opengis.net/gml" \
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" \
                  xsi:schemaLocation="http://www.opengis.net/wfs ../wfs/1.1.0/WFS.xsd"> \
               <wfs:Query typeName="' + featureType + '" ' + ((options.srs) ? 'srsName="' + options.srs + '"'  : '') + '> \
                 <wfs:PropertyName>the_geom</wfs:PropertyName> \
                 <wfs:PropertyName>' + attribute + '</wfs:PropertyName>';

        // If featureIDs == ['*'], include all features
        if (featureIDs[0] != '*') {
            xml += '<ogc:Filter>';

            for (var i = 0; i < featureIDs.length; i++) {
                xml += '<ogc:GmlObjectId gml:id="' + featureIDs[i] + '"/>';
            }

            xml += '</ogc:Filter>';
        }

        xml += '</wfs:Query> \
             </wfs:GetFeature>';
        return xml;
    }

    function displayNotReadyDialog(result) {
        logger.debug('GDP: Work is missing one or more configuration elements.');
        $(_MISSING_INPUT_SUMMARY).append($(Constant.tableString).attr('id', 'input_summary_table'));
        var inputSummaryTable = $('#input_summary_table');
        $.each(result, function(k,v){
            if (k === 'ready') return true; // (this is the same as 'continue')
            if (v.complete) {
                $(inputSummaryTable).append(
                    $(Constant.tableRowString).
                    append($(Constant.tableDataString).text(v.txt)).
                    append($(Constant.tableDataString).addClass('green-check-mark').text('&#x2714;'.htmlDecode()))
                    )
            } else {
                $(inputSummaryTable).append(
                    $(Constant.tableRowString).
                    append($(Constant.tableDataString).text(v.txt)).
                    append($(Constant.tableDataString).addClass('red-x').text('X'))
                    )
            }
        });

        $(_MISSING_INPUT_SUMMARY).removeClass("hidden");
        $(_MISSING_INPUT_SUMMARY).dialog({
            modal: true,
            title: 'Some inputs are missing.',
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                }
            },
            close: function(event,ui) {
                $(_MISSING_INPUT_SUMMARY).html('');
                $(_MISSING_INPUT_SUMMARY).addClass('hidden');
            },
            zIndex: 9999
        });
        return false;
    }

    function bindSubmitForProcessingButton() {
        var submitDialog = $('#submit-dialog');
        var submitDialogInfoText = $('#submit-dialog-info-text');
        var submitWpsAlgorithm;
        
        $(_SUBMIT_FOR_PROCESSING_LINK).click(function() {
            logger.debug('GDP: User has clicked the submit for processing button.');

            submitWpsAlgorithm = $(_ALGORITHM_DROPDOWN).find('option:selected').val();
            
            if (!submitWpsAlgorithm) {
                logger.debug('GDP: User has not selected an algorithm. Hiding submit button.');
                showNotification("Please choose an algorithm.");
                $(_RETRIEVE_OUTPUT_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                $(_RETRIEVE_PROC_INFO_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                $(_SUBMIT_FOR_PROCESSING_LINK).fadeOut(Constant.ui.fadeSpeed);
                $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                return;
            }

            var result = isReadyForSubmit();
            if (!result.ready) {
                logger.debug('GDP: Work is missing one or more configuration elements.');
                
                var inputSummaryTable = $(Constant.tableString).attr('id', 'input_summary_table');
                $(_MISSING_INPUT_SUMMARY).append(inputSummaryTable);
                
                $.each(result, function(k,v){
                    if (k === 'ready') return true; // (this is the same as 'continue' for $.jQuery.each())
                    if (v.complete) {
                        $(inputSummaryTable).append(
                            $(Constant.tableRowString).
                            append($(Constant.tableDataString).text(v.txt)).
                            append($(Constant.tableDataString).addClass('green-check-mark').text('&#x2714;'.htmlDecode()))
                            )
                    } else {
                        $(inputSummaryTable).append(
                            $(Constant.tableRowString).
                            append($(Constant.tableDataString).text(v.txt)).
                            append($(Constant.tableDataString).addClass('red-x').text('X'))
                            )
                    }
                });

                $(_MISSING_INPUT_SUMMARY).removeClass("hidden");
                $(_MISSING_INPUT_SUMMARY).dialog({
                    modal: true,
                    title: 'Some inputs are missing.',
                    model: true,
                    draggable: false, 
                    resizable: false,
                    buttons: {
                        Ok: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    close: function(event,ui) {
                        $(_MISSING_INPUT_SUMMARY).html('');
                        $(_MISSING_INPUT_SUMMARY).addClass('hidden');
                    },
                    zIndex: 9999
                });
                return false;
            }
        
            var featureType = AOI.getSelectedFeatureType();
            var attribute = AOI.getSelectedAttribute();
            var features = AOI.getSelectedFeatures();

            var datasetURL = Dataset.getSelectedDatasetURL();
            var datasetID = Dataset.getSelectedDatasetID();
            var fromDate = Dataset.getFromDate();
            var toDate = Dataset.getToDate();

            var miscOptions = createMiscOptionsJSON();

            var submitWpsStringInputs = {
                'FEATURE_ATTRIBUTE_NAME': attribute ? [attribute] : [],
                'DATASET_URI': datasetURL ? [datasetURL] : [],
                'DATASET_ID': datasetID ? datasetID : [],
                'TIME_START': fromDate ? [fromDate] : [],
                'TIME_END': toDate ? [toDate] : []

            };

            $.extend(submitWpsStringInputs, miscOptions, submitWpsStringInputs);

            // http://internal.cida.usgs.gov/jira/browse/GDP-172
            // Now we remove any inputs not found in the algorithm
            // First get all of the inputs from the process
            var processDescriptionInputsObject = new Object();
            $(WPS.processDescriptions[submitWpsAlgorithm]).find("DataInputs Input ns1|Identifier").each(function(){
                processDescriptionInputsObject[$(this).text()] = {
                    'minOccurs' : $(this).parent().attr("minOccurs"), 
                    'maxOccurs' : $(this).parent().attr("maxOccurs")
                }
            });
            
            if ($.isEmptyObject(processDescriptionInputsObject)) {
                showErrorNotification('You have not completed the configuration for this algorithm.  Please review your configuration inputs and try again.');
                return false;
            }
            
            // Test each element of our input strings against what the process has. if it's not in there, wipe it
            $.each(submitWpsStringInputs, function(k,v){
                if (!processDescriptionInputsObject[k]) delete submitWpsStringInputs[k]
            });

            var wfsXML = _createGetFeatureXML(featureType, attribute, features);
            var wfsWpsXML = WPS.createWfsWpsReference(Constant.endpoint.wfs, wfsXML);
            var submitWpsXmlInputs = {
                'FEATURE_COLLECTION': [wfsWpsXML]
            }
            
            $(submitDialogInfoText).html(Constant.ui.view_submit_dialog_info);
            $(submitDialog).dialog({
                buttons: {
                    'SUBMIT' : function() {
                        $(this).dialog("close");
                        _userEmail = $(_EMAIL_INPUT_BOX).val();
                        _userFilename = encodeURIComponent($(_FILENAME_INPUT_BOX).val());
                        $(_RETRIEVE_OUTPUT_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                        $(_RETRIEVE_PROC_INFO_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                        $(_SUBMIT_FOR_PROCESSING_LINK).fadeOut(Constant.ui.fadeSpeed);
                        $(_REDIR_TO_SB_BUTTON).fadeOut(Constant.ui.fadeSpeed);
                        var mimeType;
                        if (submitWpsStringInputs.hasOwnProperty('DELIMITER') &&
                            Object.prototype.toString.call(submitWpsStringInputs.DELIMITER) === "[object Array]" &&
                            submitWpsStringInputs.DELIMITER.length > 0) {
                                var delimiter = submitWpsStringInputs.DELIMITER[0] || 'COMMA';
                                if (delimiter === 'TAB') {
                                    mimeType = 'text/tab-separated-values';
                                } else if (delimiter === 'SPACE') {
                                    mimeType = 'text/plain';
                                } else {
                                    mimeType = 'text/csv';
                                }
                        }
                        WPS.sendWpsExecuteRequest(Constant.endpoint.proxy + Constant.endpoint.processwps, submitWpsAlgorithm, submitWpsStringInputs, ['OUTPUT'], true, submitForProcessingCallback, submitWpsXmlInputs, false, 'xml', mimeType);
                    },
                    'CANCEL' : function() {
                        $(this).dialog("close");
                        $(_SUBMIT_FOR_PROCESSING_LINK).fadeIn(Constant.ui.fadeSpeed);
                    }
                },
                title: 'Submit For Processing',
                height: 'auto',
                width: 'auto',
                modal: true,
                draggable: false,
                resizable: false,
                zIndex: 9999
            });
        });
    }

    function createMiscOptionsJSON() {
        var optionsJSON = {};
        $('.di_element_wrapper').each(function(i,e){
            var inputId = $(e).find('.di_identifier').html();

            // For every select box...
            $(e).find('.di_field:has("select")').each(function(ind, ele){
                $(ele).find("option:selected").each(function (inex, element) {
                    var selectedOption = $(this).text();
                    if (optionsJSON[inputId]) optionsJSON[inputId].push(selectedOption);
                    else optionsJSON[inputId] = new Array(selectedOption);
                });
            });

            // For every text box
            $(e).find('.di_field:has("input[type="text"]")').each(function(ind, ele){
                var enteredText = $(ele).find('input[type="text"]').val();
                if (optionsJSON[inputId]) optionsJSON[inputId].push(enteredText);
                else optionsJSON[inputId] = new Array(enteredText);
            });
            
            // For every checkbox
            $(e).find('.di_field:has("input[type="checkbox"]")').each(function(ind, ele){
                var checked = $(ele).find('input[type="checkbox"]').is(':checked');
                if (optionsJSON[inputId]) optionsJSON[inputId].push(checked);
                else optionsJSON[inputId] = new Array(checked);
            });
        });
        return optionsJSON;
    }

    function isReadyForSubmit() {
        logger.debug('GDP: Checking to ensure that the work has been properly configured for submittal');
        var algorithm_selected = $(_ALGORITHM_DROPDOWN).find('option:selected').val();
        var result = {
            'ready' : true,
            'algorithm_selected' : {
                'txt' : 'Algorithm Selected',
                'complete' : true
            },
            'featuretype_selected' : {
                'txt' : 'Feature Type Selected',
                'complete' : true
            },
            'attribute_selected' : {
                'txt' : 'Attribute Selected',
                'complete' : true
            },
            'available_attribute_value_selected' : {
                'txt' : 'Attribute Value(s) Selected',
                'complete' : true
            },
            'dataset_url_selected' : {
                'txt' : 'Dataset URL Entered',
                'complete' : true
            },
            'csw_url' : {
                'txt' : 'CSW URL Entered',
                'complete' : true
            },
            'datatype_selected' : {
                'txt' : 'Datatype(s) selected',
                'complete' : true
            },
            'date_start_selected' : {
                'txt' : 'Date Start selected',
                'complete' : true
            },
            'date_end_selected' : {
                'txt' : 'Date End selected',
                'complete' : true
            }
        };
        
        if (!algorithm_selected) result.algorithm_selected.complete = false; 
        if (!AOI.getSelectedFeatureType()) result.featuretype_selected.complete = false; 
        if (!AOI.getSelectedAttribute()) result.attribute_selected.complete = false;
        if (AOI.getSelectedFeatures().length == 0) result.available_attribute_value_selected.complete = false;
        if (!Dataset.getSelectedDatasetURL()) result.dataset_url_selected.complete = false;
        if (!Dataset.getCSWServerURL()) result.csw_url.complete = false;
        if (!Dataset.getSelectedDatasetID()) result.datatype_selected.complete = false;
        if (Dataset.hasTimeRange) {
            if (result.algorithm_selected.complete 
                && Algorithm.algorithms[algorithm_selected].inputs['TIME_START']
                && !Dataset.getFromDate()) {
                result.date_start_selected.complete = false;
            }
            if (result.algorithm_selected.complete 
                && Algorithm.algorithms[algorithm_selected].inputs['TIME_END']
                && !Dataset.getToDate()) {
                result.date_end_selected.complete = false;
            }
        } else {
            delete result.date_start_selected;
            delete result.date_end_selected;
        }
        
        result.ready = result.algorithm_selected.complete 
        && result.featuretype_selected.complete
        && result.attribute_selected.complete
        && result.available_attribute_value_selected.complete
        && result.dataset_url_selected.complete
        && result.csw_url.complete
        && result.datatype_selected.complete;
        result.ready &=  (result.date_start_selected == undefined) ? true : result.date_start_selected.complete
        result.ready &=  (result.date_end_selected == undefined) ? true : result.date_end_selected.complete;
        
        return result;
    }

    function populateConfigurationSummary() {
        logger.debug('GDP: Populating configuration summary.')
        var configurationMap = {};
        
        // Populate the JSON object
        $('.di_element_wrapper').each(function(wrapperIndex, wrapperElement){
            
            // Create the key for each of our inputs
            var identifier = $(wrapperElement).find('.di_identifier').html();
            var idMapElement = new Array();
            

            // For each input element within each wrapper, add value to map
            $(wrapperElement).find('input:not([type="hidden"])').each(function(inputIndex, inputElement){
                if (inputElement.type == 'checkbox') idMapElement.push((inputElement.checked) ? 'TRUE' : 'FALSE');
                else idMapElement.push($(inputElement).val());
            })

            // For each selectbox
            $(wrapperElement).find('select:not([type="hidden"]) option:selected').each(function(selectedIndex, selectedElement){
                idMapElement.push($(selectedElement).text());
            })

            // Put the key element into the JSON object
            configurationMap[identifier] = idMapElement;
        })

        
        $(_ALGORITHM_CONFIGURATION_SUMMARY).html('Algorithm configuration: ');
        var table = $(Constant.tableString);
        $.each(configurationMap, function(key, value) {
            var row = $(Constant.tableRowString);
            $(row).append($(Constant.tableDataString).html(key + ":"))
            $(value).each(function(arrayIndex, arrayValue) {
                var td = $(Constant.tableDataString).html(arrayValue);
                $(row).append(td);
            })
            $(table).append(row);
        })
        $(_ALGORITHM_CONFIGURATION_SUMMARY).append(table);
        $(_ALGORITHM_CONFIGURATION_SUMMARY).fadeIn(Constant.ui.fadeSpeed);
    }

    function bindDynamicInputElements() {
        $('.di_element_wrapper').each(function(i,e){
            
            // Bind all time fields as a calendar
            $(e).find('.di_field:has("input")').each(function(){
                if ($(this).find('.di_field_input').hasClass('dateTime')){
                    $(this).find('.di_field_input').datepicker({
                        'autoSize' : true,
                        'changeMonth' : true,
                        'changeYear' : true,
                        'defaultDate' : new Date(),
                        'duration' : 500,
                        'hideIfNoPrevNext': true
                    });
                }
            });
            
        });
    }

    /**
     * For each WPS DescribeProcess input element, create a representative HTML input field
     */
    function createHTMLInputField(xml) {
        var minOccurs = parseInt($(xml).attr('minOccurs'));
        var maxOccurs = parseInt($(xml).attr('maxOccurs'));
        var lastIndexId = $(_ALGORITHM_DYNAMIC_CONTAINER_CONTENT).find('div:last-child').prop('id');
        var lastIndex = parseInt(lastIndexId.substring(lastIndexId.length - 1));
        var index = (isNaN(lastIndex)) ? '0' : lastIndex + 1;  // This will be used for labeling the input container
        var identifierText = $(xml).find('ns1|Identifier').first().text();
        var titleText = $(xml).find('ns1|Title').first().text();
        var abstractText = $(xml).find('ns1|Abstract').first().text();
        var tooltip;
        
        // We ignore inputs with these titles since they're already plugged in by the user in previous steps
        if ($.inArray(identifierText, Algorithm.userConfigurables) > -1) {
            return '';
        }

        logger.debug('GDP:dataset.js::createHTMLInputField():Creating a dynamic input field for input: ' + identifierText);
        
        // Outer wrapper per input
        var containerDiv = $(Constant.divString).attr('id', 'di_element_wrapper_' + index).addClass('di_element_wrapper');

        // Create the title and identifier 
        var identifierContainer = $(Constant.divString).addClass('di_identifier').html(identifierText);
        $(containerDiv).append(identifierContainer);
        
        if (abstractText) {
            tooltip = $('<a></a>').addClass('tooltip').attr('title', abstractText).append(
                $('<img></img>').attr({
                    'src' : 'images/question-mark.png',
                    'alt' : 'informational question mark'
                })
                )
        }
        
        $(containerDiv).append($(Constant.spanString).addClass('di_algorithm_input_title').html(titleText).prepend(tooltip));
        if (!minOccurs) {
            $(containerDiv).append($(Constant.divString).html(' (Optional)'));
        }

        // Create the input element
        var inputContainer = $(Constant.divString).addClass('di_field'); // wrapper
        var defaultValue = null;
        
        if ($(xml).find('ComplexData').length) { 
            logger.trace('GDP:dataset.js::createHTMLInputField():' + identifierText + ' is a complex type.');
            var complexMimeType = $(Constant.inputString).attr('type', 'hidden').attr('name', 'di_field_mimetype').attr('value', $(xml).find('Default>Format>MimeType').text());
            var complexData = $(Constant.inputString).attr('type', 'hidden').attr('name', 'di_field_datatype').attr('value', 'complex');
            var complexSchema = $(Constant.inputString).attr('type', 'hidden').attr('name', 'di_field_schema').attr('value', $(xml).find('Default>Format>Schema').text());
            // Add the input box
            var complexInputBox = $(Constant.inputString).attr('type', 'text').attr('size', '40').addClass('di_field_input');

            $(inputContainer).append(complexData);
            $(inputContainer).append(complexMimeType);
            $(inputContainer).append(complexSchema);
            $(inputContainer).append(complexInputBox);
            
        } else if ($(xml).find('LiteralData').length) { // We have a literal datatype.
            logger.trace('GDP:dataset.js::createHTMLInputField():' + identifierText + ' is a literal type.');
            var prefix = $(xml).find('ns1|DataType').first()[0].prefix;
            var dataType = $(xml).find('ns1|DataType').first().attr(prefix + ':reference').split(':')[1];
            defaultValue = $(xml).find('DefaultValue').text();
            
            if (dataType == 'boolean') {
                var literalCheckbox = $(Constant.inputString).
                attr({
                    'type' : 'checkbox',
                    'name' : identifierText
                }).
                addClass('di_field_input');
                
                $(inputContainer).append(literalCheckbox);
                
                if (defaultValue.toLowerCase() == 'true') {
                    $(literalCheckbox).attr('checked','checked');
                } else {
                    $(literalCheckbox).removeAttr('checked');
                }
            } else if ($(xml).find('LiteralData').find('ns1|AnyValue').length) { 
                logger.trace('GDP:dataset.js::createHTMLInputField():Building a textbox');
                var literalDatatype = $(xml).find('ns1|DataType').first().attr(prefix + ':reference').split(':')[1];
                var literalInputBox = $(Constant.inputString).attr({
                    'type' : 'text',
                    'size' : '40'
                }).addClass(literalDatatype).addClass('di_field_input');
                $(literalInputBox).val(defaultValue);
                $(inputContainer).append(literalInputBox);
            } else  if ($(xml).find('LiteralData').find('ns1|AllowedValues').length) { 
                logger.trace('GDP:dataset.js::createHTMLInputField():Building a listbox');
                var literalListbox = $(Constant.selectString).addClass('di_field_input');
                $(xml).find('LiteralData').find('ns1|AllowedValues').find('ns1|Value').each(function(i,e){
                    $(literalListbox).append($(Constant.optionString).attr('value', $(e).text()).html($(e).text()));
                });
                if (maxOccurs > 1) literalListbox.attr('multiple', 'multiple');
                if (defaultValue) $(literalListbox).find("option:contains('"+defaultValue+"')").attr('selected','selected');
                $(inputContainer).append(literalListbox);
            }
        } else if ($(xml).find('BoundingBoxData').length) {
            logger.trace('GDP:dataset.js::createHTMLInputField():' + identifierText + ' is a boundingbox type.');
        //TODO- We've got nothing yet - Will complete once [if] we have BoundingBox inputs
        }

        // Append the input container we just created to the main container div
        $(containerDiv).append(inputContainer);
        return containerDiv;
    }

    function callWMS(data, wmsUrl, successCallback) {
        var defaultData = {
            'service': 'WMS',
            'version': '1.3.0'
        }

        var wmsData = {};

        // Merge defaultData with data, putting results in wmsData. If there are
        // any conflicts, the property from data will overwrite the one in
        // defaultData.
        $.extend(wmsData, defaultData, data);

        $.ajax({
            url: Constant.endpoint.proxy + wmsUrl,
            data: wmsData,
            success: function(data, textStatus, XMLHttpRequest) {
                successCallback(data);
            }
        });
    }

    function callWCS(data, wcsUrl, successCallback, errorCallback) {

        var defaultData = {
            'service': 'WCS',
            'version': '1.1.1'
        }

        var wcsData = {};

        // Merge defaultData with data, putting results in wcsData. If there are
        // any conflicts, the property from data will overwrite the one in
        // defaultData.
        $.extend(wcsData, defaultData, data);

        // This ajax might error, since we're assuming all urls with http or
        // an unspecified protocol is a wcs call. However, we don't want to show
        // an error if this fails, because we'll be retrying using a different
        // service.
        ajaxNoErrorNotification({
            url: Constant.endpoint.proxy + wcsUrl,
            data: wcsData,
            success: function(data, textStatus, XMLHttpRequest) {
                // TODO: if not wcs response, errorCallback

                successCallback(data);
            },
            error: errorCallback
        });
    }

    function wcsDatasetSelected(datasetURL, errorCallback) {
        logger.debug('GDP: Attempting to retrieve grids using WCS.');
        gDatasetType = _datasetTypeEnum.WCS;

        callWCS({
            'request' : 'GetCapabilities'
        },
        datasetURL,
        populateDatasetIdSelect,
        errorCallback
        );
    }

    function opendapDatasetSelected(datasetURL, useCache) {
        useCache = useCache || false;
        logger.debug('GDP: Attempting to retrieve grids using OpenDAP.');
        gDatasetType = _datasetTypeEnum.OPENDAP;
        _usingCache = useCache;

        var wpsAlgorithm = 'gov.usgs.cida.gdp.wps.algorithm.discovery.ListOpendapGrids';
        var wpsInputs = {
            'catalog-url': [datasetURL],
            'allow-cached-response': [useCache]
        };
        var wpsOutput = ['result_as_json'];

        WPS.sendWpsExecuteRequest(
				Constant.endpoint.proxy + Constant.endpoint.utilitywps,
				wpsAlgorithm,
				wpsInputs,
				wpsOutput,
				false,
				populateDatasetIdSelect,
				null,
				true,
				'json',
				'application/json');
    }

    /**
     * Takes a WCS GetCapabilities response and parses out all of the id, title and abstract
     * elements.
     * 
     * Result is an array in the format of:
     * {
     *  id : id,
     *  title : title,
     *  description : description
     * }
     * 
     */
    function _parseWCS(params) {
        var xml = params.xml;
        var result = [];
        var namespace = '*|';
        
        logger.debug('GDP: Parsing WCS response');
        
        // GeoServer has the wcs namespace whereas ArcGIS has the wcs namespace as default
        
        // First try to pick out CoverageDescription from the default namespace
        var coverageDescription = $(xml).find(namespace + 'CoverageSummary');
        
        if (!coverageDescription.length) {
            // CoverageDescription was not in the default namespace. The only other
            // place it would be would be in the wcs: namespace which we have $.xmlns
            // globally initialized with
            namespace = 'wcs111|';
            coverageDescription = $(xml).find(namespace + 'CoverageSummary');
        }
        
        $.each(coverageDescription, function(index, element) {
            var id = $(element).find('>'+namespace+'Identifier').text();
            var title = $(element).find('>ns1|Title').text() || $(element).find('>ows|Title').text();
            var description = $(element).find('>ns1|Abstract').text() || $(element).find('>ows|Abstract').text();
                
            result.push({
                id : id,
                title : title,
                description : description
            })
            
        });
        
        return result;
    }

	function populateDatasetIdSelect(data) {
		logger.debug('GDP: Populating dataset ID select box.');
		$(_DATASET_ID_SELECTBOX).empty();

		if (gDatasetType === _datasetTypeEnum.WCS) {
			// Parse the WCS to get all of the ids, titles and abstracts (descriptions)
			var wcsResp = _parseWCS({
				xml: data
			});

			$.each(wcsResp, function(index, item) {
				// Populate the dataset ID selectbox with the results from the WCS call
				var displayName = item.title + (item.description !== '' ? ' - ' + item.description : '');
				$(_DATASET_ID_SELECTBOX).append(
						// name attr used for matching wms
						$(Constant.optionString).attr('value', item.id).attr('name', item.title).html(displayName)
						);

			});
		} else { //     == datasetTypeEnum.OPENDAP
			if (!data
					|| !data.datatypecollection
					|| !data.datatypecollection.types) {
				showErrorNotification("GDP: A WPS error was encountered: Error getting dataset ID's from server.");
				hideThrobber();
				logger.error("GDP: A WPS error was encountered: Error getting dataset ID's from server.");
				return;
			} else {
				$(data.datatypecollection.types).each(function(index, type) {
					var description = type.description;
					var shortName = type.shortname;
					var units = type.unitsstring;

					// display description if one exists and it doesn't match the shortName
					var descriptionString = (description !== '' && description !== shortName) ? ' - ' + description : '';
					var unitsString = units !== '' ? ' (' + units + ')' : '';
					var displayName = shortName + descriptionString + unitsString;

					$(_DATASET_ID_SELECTBOX).append(
							// name attr used for matching wms
							$(Constant.optionString).attr('value', shortName).attr('name', shortName).html(displayName)
							);
				});

				var firstOption = $(_DATASET_ID_SELECTBOX).find('option').first();
				firstOption.prop('selected', true); //GDP-321
				getTimeRange(_datasetURL, firstOption.val(), _usingCache);
			}
		}

		$(_DATASET_ID_TOOLTIP).fadeIn(Constant.ui.fadespeed);
		$(_DATASET_ID).fadeIn(Constant.ui.fadespeed);
		$(_DATASET_ID_LABEL).fadeIn(Constant.ui.fadespeed);

	}

    function getTimeRange(datasetURL, selectedGrid, useCache) {
        useCache = useCache || false;
        logger.debug('GDP: Attaining grid time range for dataset: ' + datasetURL + ' and selected grid: ' + selectedGrid);
        var getTimeRangeWpsAlgorithm = 'gov.usgs.cida.gdp.wps.algorithm.discovery.GetGridTimeRange';
        var getTimeRangeWpsInputs = {
            'catalog-url': [datasetURL],
            'grid': [selectedGrid],
            'allow-cached-response': [useCache]
        };
        var getTimeRangeWpsOutput = ['result_as_json'];

        WPS.sendWpsExecuteRequest(
			Constant.endpoint.proxy + Constant.endpoint.utilitywps,
			getTimeRangeWpsAlgorithm,
			getTimeRangeWpsInputs,
			getTimeRangeWpsOutput,
			false,
			initDatePickers,
			null,
			true,
			'json',
			'application/json'
			);
    }

	function initDatePickers (json) {
		if (!json || !json.availabletimes) {
			$(_DATASET_ID_TOOLTIP).hide();
			$(_DATASET_ID_LABEL).hide();
			$(_DATASET_ID).hide();
			$(_WMS_LABEL).hide();
			$(_WMS_TOOLTIP).hide();
			$(_WMS_LAYER_SELECTBOX).hide();
			$(_DATE_PICKER_TABLE).hide();
			$(_DATE_PICKER_TOOLTIP).hide();
			return false;
		}
		
		_hasTimeRange = false;
		if (!json.availabletimes.time || json.availabletimes.time.length === 0) {
			logger.debug('GDP: This grid does not contain a time range.');
			return true;
		}
		
		var startTime = json.availabletimes.time[0];
		var endTime = json.availabletimes.time[1];
		if (!startTime || !endTime) {
			logger.debug('GDP: This grid does not contain a time range.');
			return true;
		}
		_hasTimeRange = true;
		logger.debug('GDP: Initiating date pickers for grid timerange.');


		var fromDate = $.datepicker.parseDate('yy-mm-dd', startTime.split('T')[0]);
		var toDate = $.datepicker.parseDate('yy-mm-dd', endTime.split('T')[0]);
		logger.debug('GDP: Grid time range is from ' + fromDate + ' to ' + toDate);

		$(_DATE_RANGE_FROM_INPUT_BOX).datepicker("destroy");
		$(_DATE_RANGE_TO_INPUT_BOX).datepicker("destroy");
		$(_DATE_RANGE_FROM_INPUT_BOX).datepicker();
		$(_DATE_RANGE_TO_INPUT_BOX).datepicker();
		$(_DATE_RANGE_FROM_INPUT_BOX).datepicker('setDate', fromDate);
		$(_DATE_RANGE_TO_INPUT_BOX).datepicker('setDate', toDate);
		$.datepicker.setDefaults({
			'minDate': fromDate,
			'maxDate': toDate,
			'autoSize': true,
			'changeMonth': true,
			'changeYear': true,
			'defaultDate': new Date(),
			'duration': 500,
			'hideIfNoPrevNext': true
		});

		$(_DATE_RANGE_FROM_INPUT_BOX).blur(function () {
			var fromDate = $(this).datepicker('option', 'minDate');
			var toDate = $(this).datepicker('option', 'maxDate');
			var formattedBeginDate = (fromDate.getMonth() + 1) + "/" + fromDate.getDate() + "/" + fromDate.getFullYear();
			var formattedToDate = (toDate.getMonth() + 1) + "/" + toDate.getDate() + "/" + toDate.getFullYear();

			if (!$(this).val())
				$(this).val(formattedBeginDate);
			if (new Date($(this).val()).getTime() > toDate.getTime())
				$(this).val(formattedToDate);
			if (new Date($(this).val()).getTime() > new Date($(_DATE_RANGE_TO_INPUT_BOX).val()).getTime())
				$(this).val($(_DATE_RANGE_TO_INPUT_BOX).val());
			if (new Date($(this).val()).getTime() < fromDate.getTime())
				$(this).val(formattedBeginDate);
		});
		$(_DATE_RANGE_TO_INPUT_BOX).blur(function () {
			var fromDate = $(this).datepicker('option', 'minDate');
			var toDate = $(this).datepicker('option', 'maxDate');
			var formattedBeginDate = (fromDate.getMonth() + 1) + "/" + fromDate.getDate() + "/" + fromDate.getFullYear();
			var formattedToDate = (toDate.getMonth() + 1) + "/" + toDate.getDate() + "/" + toDate.getFullYear();

			if (!$(this).val())
				$(this).val(formattedToDate);
			if (new Date($(this).val()).getTime() > toDate.getTime())
				$(this).val(formattedToDate);
			if (new Date($(this).val()).getTime() < new Date($(_DATE_RANGE_FROM_INPUT_BOX).val()).getTime())
				$(this).val($(_DATE_RANGE_FROM_INPUT_BOX).val());
			if (new Date($(this).val()).getTime() < fromDate.getTime())
				$(this).val(formattedBeginDate);
		});

		$(_DATE_PICKER_TOOLTIP).fadeIn(Constant.ui.fadespeed);
		$(_DATE_PICKER_TABLE).fadeIn(Constant.ui.fadespeed);
		$(_DATASET_ID_TOOLTIP).fadeIn(Constant.ui.fadespeed);
		$(_DATASET_ID).fadeIn(Constant.ui.fadespeed);
		$(_DATASET_ID_LABEL).fadeIn(Constant.ui.fadespeed);
		return true;
	}

    function getWmsLayers(wmsURL) {
        callWMS({
            'request' : 'GetCapabilities'
        }, wmsURL, populateWmsLayerSelectbox);
    }

    function populateWmsLayerSelectbox(xml) {
        $(_WMS_LAYER_SELECTBOX).empty();

        // TODO check for WMS failure
        //if (!WPS.checkWpsResponse(xml, "Error getting dataset WMS layers from server.")) return;

        // Add blank option that is initial selection
        $(_WMS_LAYER_SELECTBOX).append($(Constant.optionString).attr('value', ''));
        
        // Only add Layers that have a Name element as a child
        // Using nodeName here to fix jQuery parsing bug in IE
        $(xml).find('[nodeName="Layer"]:has(> [nodeName="Name"])').each(function(index, element) {
            var option = $(Constant.optionString);
            option.val($(element).find('> [nodeName="Name"]').text());
            option.text($(element).find('> [nodeName="Abstract"]').text() || $(element).find('> [nodeName="Title"]').text() );

            $(_WMS_LAYER_SELECTBOX).append(option);
        });

        $(_WMS_TOOLTIP).fadeIn(Constant.ui.fadespeed);
        $(_WMS_LABEL).fadeIn(Constant.ui.fadespeed);
        $(_WMS_LAYER_SELECTBOX).fadeIn(Constant.ui.fadespeed);
    }

    function wmsLayerSelected(wmsURL, layer) {
        logger.debug('GDP: User has selected a WMS Layer');
        if (layer == '') {
            logger.debug('GDP: User\'s WMS Layer was blank. Clearing dataset overlay.');
            clearDatasetOverlay();
            return;
        }
        
        setDatasetOverlay(wmsURL, layer);
    }

    function getMatchingWmsOption(datasetIdTitle) {
        // HACK: find longest WMS layer title which is a substring
        // of the dataset ID title, or vice versa.
        var matches = [];
        $(_WMS_LAYER_SELECTBOX).children().each(function(index, element) {
            var wmsTitle = $(element).text();

            if (datasetIdTitle.contains(wmsTitle) || wmsTitle.contains(datasetIdTitle)) {
                matches.push(element);
            }
        });

        if (matches.length > 0) {
            // Array.map not supported in IE7, IE8
            var strLengths = [];
            $(matches).each(function(index, elem) {
                strLengths.push($(elem).text().length);
            });

            var indexOfLongestMatch = $.inArray(Math.max.apply(null, strLengths), strLengths);

            return matches[indexOfLongestMatch];

        } else {
            // Return first (blank) option
            return $(_WMS_LAYER_SELECTBOX).children(':eq(0)');
        }
    }

    function cswFillInCapabilities(xml) {
        var queryableElement = $('#queryable');
        var defaultQueryables = ['AnyText','Title','Subject'];
        var queryables = new Array();

        // Pull out the queryables
        $(xml).find('ows|Constraint[name="SupportedISOQueryables"]').children().each(function(qIndex, qElement) {
            queryables.push($(qElement).text());
        });
        $(xml).find('ows|Constraint[name="AdditionalQueryables"]').children().each(function(qIndex, qElement) {
            queryables.push($(qElement).text());
        });

        $(queryableElement).html('');
        if (queryables.length) {
            $(queryables).each(function(sIndex, sElement){
                $(queryableElement).append(
                    $(Constant.optionString).attr('value', sElement).html(sElement)
                    );
            });
        } else {
            $(defaultQueryables).each(function(di,de){
                $(queryableElement).append(
                    $(Constant.optionString).attr('value', de.toLowerCase()).html(de)
                    );
            })
        }
        $(queryableElement).find('option[value="AnyText"]').attr('selected','selected');
        GDPCSWClient.setCSWHost($(_CSW_URL_INPUT_BOX).val());
    }

    /**
     * This sets up a configuration of the application where we only have one
     * algorithm to display to the user.
     */
    //    function setupSingleAlgorithmView(algorithm) {
    //        // TODO - Currently if we have a single algorithm with nothing to configure, the configure link shows up anyway.
    //        // When a user clicks it, it goes away and nothing happens. We need a way to know before this view shows up whether or
    //        // not we can configure the algorithm.  If not, don't show the link or remove it at this point.
    //        var singleAlgorithm = Algorithm.algorithms[algorithm]
    //            
    //        // Protect ourselves from front-end garbage -- This means config is configured for a nonexistent algorithm -- default to the dropdown
    //        if (!singleAlgorithm) {
    //            populateAlgorithmDropdownView();
    //        } else {
    //            var abstractText = singleAlgorithm.abstrakt;
    //            var title = singleAlgorithm.title;
    //
    //            // Append the current algorithm we're displaying to the html body
    //            $('#algorithm_dropdown_container').append($('<span></span>').attr('id', 'algorithm_display_span').append('Algorithm: ', title));
    //            $('#algorithm_dropdown_container').append('&nbsp;&nbsp;<a href="#" id="configure_algorithm_link"> Configure</a>');
    //            if (abstractText) {
    //                $('#algorithm_dropdown_container').append('&nbsp;&nbsp;<a href="#" id="algorithm_documentation_link"> Documentation</a>');
    //                configureDocumentationLink(singleAlgorithm.title, abstractText);
    //            }
    //            
    //            // Wire up the configure link
    //            $('#configure_algorithm_link').click(function() { 
    //                populateDynamicContent(singleAlgorithm.xml); 
    //            });
    //        }
    //    }

    function setupCSWClientView() {
        logger.debug("GDP: Setting up CSW Client.");
        
        var showSimpleCSWClient = parseInt(Constant.ui.view_simple_csw_client);
        var showCSWURLInputBox = parseInt(Constant.ui.view_show_csw_url_input);
        var showCSWDatasetUrl = parseInt(Constant.ui.view_show_csw_dataset_url);
        var showDisplayDatasetsButton = parseInt(Constant.ui.view_show_display_datasets_button);
        
        var dsUrl = $.url().param('dataset') || Constant.incoming.dataset || ''; //TODO- We can actually probably use the parseURI script for this. 
        
        var CSWDialogTableRow = $('.csw-dialog-tablerow');
        var searchSubmitButton = $('#dataset_search_submit_button');
        var CSWSearchInput = $('#csw_search_input');
        var datasetURLInputRow = $('#dataset-url-input-row');
        var cswUrlInputRow = $('#csw-url-input-row');
        
        if (!parseInt(Constant.ui.view_show_csw_dialog)) {
            logger.trace('GDP: Application configuration is set to not show the CSW dialog. Hiding.');
            $(CSWDialogTableRow).fadeOut(Constant.ui.fadeSpeed);
        }
        
        if (Constant.ui.default_csw_search.length > 0) {
            logger.trace('GDP: Default CSW search term is set to "'+Constant.ui.default_csw_search+'"');
            $(CSWSearchInput).val(Constant.ui.default_csw_search);
        }
        
        if (!showCSWURLInputBox && Constant.endpoint.csw.length > 0) {
            logger.trace('GDP: Application configuration is set to hide the CSW URL input box. Hiding.');
            $(cswUrlInputRow).hide();
        }
        
        if (showSimpleCSWClient && Constant.endpoint.csw.length > 0) {
            logger.trace('GDP: Application configuration is set to show the "simple" CSW dialog.');
            $(CSWDialogTableRow).hide();
            
            // http://internal.cida.usgs.gov/jira/browse/GDP-445
            $(datasetURLInputRow).show();
            if (showDisplayDatasetsButton) {
                searchSubmitButton.show();
            } else {
                searchSubmitButton.hide();
            }
            
            logger.trace('GDP: Appending the Submit buttom for the CSW client into the "simple" CSW client.');
            searchSubmitButton.attr('value', 'Display Available Datasets');
            $(_CSW_CLIENT).find('tbody').prepend(
                $(Constant.tableRowString).append(
                    $(Constant.tableDataString).attr('colspan','4').append(
                        $(Constant.divString).attr('id','simple_csw_button_div').append(
                            searchSubmitButton
                            )
                        )
                    )
                );
        } else  if (!showCSWDatasetUrl) {
            logger.trace('GDP: Application configuration is set to not show the URL row in the CSW client. Hiding.');
            $(datasetURLInputRow).hide();
        }

        if (Constant.endpoint.csw.length > 0) {
            logger.trace('GDP: Adding default endpoint URL "'+Constant.endpoint.csw+'" to the CSW endpoint URL inputbox.');
            $(_CSW_URL_INPUT_BOX).val(Constant.endpoint.csw);
            CSW.sendCSWGetCapabilitiesRequest($(_CSW_URL_INPUT_BOX).val(), cswFillInCapabilities, Constant.config.csw.cache, Constant.endpoint.proxy);
        }

        $(_CSW_HOST_SET_BUTTON).click(function() {
            if ($(_CSW_URL_INPUT_BOX).val()) {
                CSW.sendCSWGetCapabilitiesRequest($(_CSW_URL_INPUT_BOX).val(), cswFillInCapabilities, Constant.config.csw.cache, Constant.endpoint.proxy);
            } else {
                logger.warn('GDP: User clicked CSW Endpoint Set button without setting a CSW endpoint.')
                showErrorNotification('A CSW endpoint must be defined.');
            }
        });
        $(_CSW_HOST_PICK_BUTTON).click(function() {
            var serverHTML = $('<ul />');
            var picklist = Constant.ui.csw_picklist.split('|');
            
            for (var pickListIndex = 0;pickListIndex < picklist.length;pickListIndex = pickListIndex + 2) {
                $(serverHTML).append(
                    $('<li />', {
                        'class' : 'server-picker-li',
                        'title' : picklist[pickListIndex]
                    }).html(picklist[pickListIndex + 1]));
            }
            
            $('body')
            .append($('<div />', {
                id : 'host-pick-modal-window'
            }).html(serverHTML));
            
            var dialog = $('#host-pick-modal-window').dialog({
                title: 'Choose a CSW server',
                height: 'auto',
                width: 'auto',
                modal: true,
                resizable: false,
                draggable: false,
                zIndex: 9999
            });
            
            $('.server-picker-li').click(function(){
                var serverURL = this.innerHTML;
                Dataset.setCSWServerURL(serverURL);
                $(_CSW_HOST_SET_BUTTON).click();
                
                if (this.innerHTML === Constant.endpoint['sciencebase-csw']) {
                    GDPCSWClient.sbConstraintFeature = false;
					GDPCSWClient.sbConstraintCoverage = true;
                } else {
					GDPCSWClient.sbConstraintFeature = false;
					GDPCSWClient.sbConstraintCoverage = false;
                }
                
                $(dialog).dialog('close');
            });
            
        });
        
        $(_SELECT_DATASET_BUTTON).click(function() {
            logger.debug('GDP: User has selected a dataset. ');
            Dataset.datasetSelected($(_DATASET_URL_INPUT_BOX).val());
        });

        if (Constant.ui.default_dataset_url.length > 0) {
            logger.trace('GDP: Adding default dataset URL "'+Constant.ui.default_dataset_url+'" to the CSW dataset URL inputbox.');
            $(_DATASET_URL_INPUT_BOX).val(Constant.ui.default_dataset_url);
            Dataset.setDatasetUrl($(_DATASET_URL_INPUT_BOX).val());
        }
        
        // Ref: http://internal.cida.usgs.gov/jira/browse/GDP-344
        if (dsUrl) {  //Incoming dataset URL should override a default dataset URL if one exists
            logger.trace('GDP: Adding dataset URL "'+ decodeURIComponent(dsUrl) +'" parsed from incoming URL.');
            $(_DATASET_URL_INPUT_BOX).val(decodeURIComponent(dsUrl));
            Dataset.setDatasetUrl($(_DATASET_URL_INPUT_BOX).val());
        }

        $(_DATASET_ID_SELECTBOX).change(function() {
            if ($(this).val() == '') {
                logger.debug('GDP: User has selected a blank option in the dataset ID selectbox.');
                logger.debug('GDP: Selecting blank option in WMS layers selectbox and clearing WMS layer from map');
                $(_WMS_LAYER_SELECTBOX).children(':eq(0)').attr('selected', 'selected');
                clearDatasetOverlay();
                return;
            }
            logger.debug('GDP: User has selected an option in the dataset ID selectbox: ' + $(this).val());
            // Try to match up dataset ID with wms layer by comparing their titles.
            if (gWmsURL) {
                var datasetIdTitle = $(this).children(':selected').attr('name');
                var selectedElement = getMatchingWmsOption(datasetIdTitle);

                $(selectedElement).attr('selected', 'selected');
                wmsLayerSelected(gWmsURL, $(selectedElement).val());
            }

        });

        $(_WMS_LAYER_SELECTBOX).change(function() {
            wmsLayerSelected(gWmsURL, $(this).val());
        });

        var datePickerOptions = {
            changeMonth: true,
            changeYear: true,
            inline: true,
            yearRange: '-2000:+2000' // display all years in dropdown
        }

        $(_FROM_DATE_PICKER).datepicker(datePickerOptions);
        $(_TO_DATE_PICKER).datepicker(datePickerOptions);
        
        
        $(_CSW_HOST_SET_BUTTON).button({
            'label' : 'Set'
        });
        $(_CSW_HOST_PICK_BUTTON).button({
            'label' : 'Pick'
        });
        $(searchSubmitButton).button();
        $(_SELECT_DATASET_BUTTON).button({
            'label' : 'Select'
        });
        
        if (!Constant.ui.csw_picklist) {
            $(_CSW_HOST_PICK_BUTTON).hide();
        }
    }
    
    function bindRetrieveOutputButton() {
        $(_RETRIEVE_OUTPUT_BUTTON).click(function() {
            var urlAndData = _RETRIEVE_OUTPUT_URL.split('?');
           	$.download(urlAndData[0], urlAndData[1], 'get');
        });
    }

    function bindRetrieveProcInfoButton(statusID) {
        $(_RETRIEVE_PROC_INFO_BUTTON).click(function(){
            var urlAndData = _RETRIEVE_OUTPUT_URL.split('?');
            $.download(Constant.endpoint.proxy + urlAndData[0],'id=' + statusID + '&attachment=true', 'get');
        });
    }
    
    return {
        htmlID: _HTML_ID,
        hasTimeRange : _hasTimeRange,
        datasetTypeEnum : _datasetTypeEnum,
        createGetFeatureXML : _createGetFeatureXML,
        parseWCS : _parseWCS,
        cswHostSetButton : _CSW_HOST_SET_BUTTON,
        init: function() {
            logger.info("GDP: Initializing Dataset/Submit View.");
            
            _algorithmList = (Constant.ui.view_algorithm_list.length > 0) ? Constant.ui.view_algorithm_list.split(',') : new Array();
            logger.debug('GDP: We are working with ' + ((_algorithmList.length === 0) ? 'all' : _algorithmList.length) + ' algorithm(s).');
            
            _usingCache = Constant.incoming.useCache;
            
            createAlgorithmDropdown();
            
            $(_ALGORITHM_DOC_LINK).button({
                'label' : 'Documentation'
            });
            
            $(_ALGORITHM_CONFIG_LINK).button({
                'label' : 'Configure'
            });
            
            $(_SUBMIT_FOR_PROCESSING_LINK).button({
                'label' : 'Submit For Processing'
            });
            
            $(_RETRIEVE_OUTPUT_BUTTON).button({
                'label' : 'Retrieve Output'
            });
            
            $(_RETRIEVE_PROC_INFO_BUTTON).button({
                'label' : 'Retreive Process Input'
            });
            
            $(_REDIR_TO_SB_BUTTON).button({
                'label' : 'Redirect To Science Base'
            });
            
            if ($(_DATASET_URL_INPUT_BOX).val()) {
                $(_SELECT_DATASET_BUTTON).click();
            }
        },

        getCSWServerURL: function() {
            return $(_CSW_URL_INPUT_BOX).val();
        },
        setCSWServerURL: function(val) {
            return $(_CSW_URL_INPUT_BOX).val(val);
        },

        getSelectedDatasetURL: function() {
            return _datasetURL;
        },

        getSelectedDatasetID: function() {
            return $(_DATASET_ID_SELECTBOX).val();
        },

        getFromDate: function() { 
            if (gDatasetType !== this.datasetTypeEnum.OPENDAP) return null;

            var from = $(_DATE_RANGE_FROM_INPUT_BOX).datepicker('getDate');

            // For now, use only full days, starting at 00:00:00 UTC
            return $.datepicker.formatDate('yy-mm-ddT00:00:00.000Z', from);
        },

        getToDate: function() {
            if (gDatasetType !== this.datasetTypeEnum.OPENDAP) return null;
            
            var to = $(_DATE_RANGE_TO_INPUT_BOX).datepicker('getDate');
            return $.datepicker.formatDate('yy-mm-ddT00:00:00.000Z', to);
        },
		
        setDatasetType: function(datasetType) {
            gDatasetType = datasetType;
        },

        datasetSelected : function(datasetURL, wmsURL, useCache){
            useCache = undefined === useCache ? _usingCache : useCache;
            _datasetURL = datasetURL;
            
            $(_DATASET_ID_TOOLTIP).hide();
            $(_DATASET_ID_LABEL).hide();
            $(_DATASET_ID).hide();
            $(_WMS_LABEL).hide();
            $(_WMS_TOOLTIP).hide();
            $(_WMS_LAYER_SELECTBOX).hide();
            $(_DATE_PICKER_TABLE).hide();
            $(_DATE_PICKER_TOOLTIP).hide();

            clearDatasetOverlay();

            if (datasetURL === '') {
                logger.debug('GDP: User has entered nothing or selected a blank option for the dataset URL. Halting further view changes.');
                showNotification("You have not entered a valid dataset URL. Please try again.")
                return;
            }

            var uri = parseUri(datasetURL);

            if (uri.protocol === '') {
                // initially assume http
                datasetURL = datasetURL.replace(/^/, 'http://');
                uri.protocol = 'http';
            }

            // TODO: need a cleaner way of testing service type and failing over
            // to a different service
            if (uri.protocol === 'http' || uri.protocol === 'https') {

                // Try wcs first. If it doesn't succeed, try opendap.
                wcsDatasetSelected(datasetURL, function() {
                    // This will be used as the error callback inside of wcsDatasetSelected
                    datasetURL = datasetURL.replace(/^http:\/\//, 'dods://');
                    _datasetURL = datasetURL;
                    opendapDatasetSelected(datasetURL, useCache);
                });
                
            } else if (uri.protocol === 'dods') {
                opendapDatasetSelected(datasetURL, useCache);
            } else {
                showErrorNotification("Unknown dataset protocol: " + uri.protocol);
            }

            gWmsURL = wmsURL || Constant.ui.default_wms_url;
            if (gWmsURL) getWmsLayers(gWmsURL);
        },
        stepLoading: function() {
            if (_algorithmList.length === 1 
                && Algorithm.algorithms[_algorithmList[0]].needsConfiguration
                && !_configured) {
                logger.trace('GDP: Single algorithm view found and algorithm chosen needs configuration. Automatically displaying configuration window.');
                $(_ALGORITHM_DROPDOWN).trigger('change');
            }
            return true;
        },
		displayMultipleOpenDAPSelection: function (id) {
			var csw_response = GDPCSWClient.getRecordById(id),
				stylesheet = "lib/xsl/multi-service-endpoint.xsl",
				processor = new XSLTProcessor(),
				serializer = new XMLSerializer(),
				xslt,
				XmlDom,
				output,
				outputDiv;

			xslt = GDPCSWClient.loadDocument(stylesheet);
			processor.importStylesheet(xslt);

			XmlDom = processor.transformToDocument(csw_response);
			output = serializer.serializeToString(XmlDom.documentElement);
			outputDiv = document.getElementById("metadata");
			outputDiv.innerHTML = output;

			$(outputDiv).dialog({
				modal: true,
				width: '90%',
				height: $(window).height() / 1.25,
				resizable: true,
				draggable: true,
				'title': 'Choose a data set',
				zIndex: 9999
			});
			$(outputDiv).scrollTop(0);
		},
		createCSWResponseDialog: function(request) {
			var outputId = request === "getrecordbyid" ? "metadata" : "csw-output";
			var outputDiv = document.getElementById(outputId);
			outputDiv.innerHTML = replaceURLWithHTMLLinks(outputDiv.innerHTML);
			
			$(outputDiv).dialog({
				modal: true,
				width: '90%',
				height: request === "getrecordbyid" ? $(window).height() / 1.25 : 'auto',
				resizable: true,
				draggable: true,
				title: request === "getrecordbyid" ? 'Dataset metadata' : 'Choose a data set',
				zIndex: 9999
			});

			// If a user has previously viewed metadata and has scrolled down,
			// the new window opens up scrolled down to the location they were 
			// at previously. This fixes that issue.
			$(outputDiv).scrollTop(0);

			// Some hackery needs to happen here because IE8 will have window.onunload triggered 
			// when selecting a dataset even though it just calls javascript and doesn't try to leave the
			// page
			// http://stackoverflow.com/a/7651818
			$(window).data('beforeunload', window.onbeforeunload);
			$('a[href^="javascript:"]').hover(
					function() {
						window.onbeforeunload = null;
					},
					function() {
						window.onbeforeunload = $(window).data('beforeunload');
					}
			);
		},
		selectDatasetById: function (id, title) {
			var csw_response = GDPCSWClient.getRecordById(id),
				selectedDataset,
				useCache = false,
				wmsURL,
				// We are doing this because we don't know which format the data might be in, if we can tell, we shouldn't iterate
				datasetSelectors = [
					'[nodeName="csw:GetRecordByIdResponse"] > [nodeName="csw:Record"] [nodeName="dc:URI"]',
					'[nodeName="csw:GetRecordByIdResponse"] > [nodeName="gmd:MD_Metadata"] > [nodeName="gmd:identificationInfo"] > ' +
							'[nodeName="srv:SV_ServiceIdentification"] > [nodeName="srv:containsOperations"] > [nodeName="srv:SV_OperationMetadata"] > ' +
							'[nodeName="srv:connectPoint"] > [nodeName="gmd:CI_OnlineResource"] > [nodeName="gmd:linkage"] > [nodeName="gmd:URL"]',
					'[nodeName="csw:GetRecordByIdResponse"] > [nodeName="gmd:MD_Metadata"] > [nodeName="gmd:distributionInfo"] > ' +
							'[nodeName="gmd:MD_Distribution"] > [nodeName="gmd:transferOptions"] > [nodeName="gmd:MD_DigitalTransferOptions"] > ' +
							'[nodeName="gmd:onLine"] > [nodeName="gmd:CI_OnlineResource"] > [nodeName="gmd:linkage"] > [nodeName="gmd:URL"]'
				],
				shouldCacheSelectors = [
					'[nodeName="csw:GetRecordByIdResponse"] > [nodeName="gmd:MD_Metadata"] > [nodeName="gmd:identificationInfo"] > ' +
							'[nodeName="gmd:MD_DataIdentification"] > [nodeName="gmd:status"] > [nodeName="gmd:MD_ProgressCode"]'
				];

			for (var i = 0; i < datasetSelectors.length; i++) {
				$(csw_response).find(datasetSelectors[i]).each(function(index, elem) {
					var text = $(elem).text();

					if (text.toLowerCase().contains("dods")) {
						Dataset.setDatasetType(Dataset.datasetTypeEnum.OPENDAP);
						selectedDataset = text.indexOf('?') !== -1 ? text.substring(0, text.indexOf('?')) : text;
					} else if (text.toLowerCase().contains("wcs") && !selectedDataset) {
						Dataset.setDatasetType(Dataset.datasetTypeEnum.WCS);
						selectedDataset = text.indexOf('?') !== -1 ? text.substring(0, text.indexOf('?')) : text;
					} else if (text.toLowerCase().contains("wms")) {
						wmsURL = text.indexOf('?') !== -1 ? text.substring(0, text.indexOf('?')) : text;
					}
				});
			}

			for (i = 0; i < shouldCacheSelectors.length; i++) {
				$(csw_response).find(shouldCacheSelectors[i]).each(function(index, elem) {
					var codeListValue = $(elem).attr("codeListValue");

					if (codeListValue.toLowerCase() === "completed") {
						useCache = true;
					}
				});
			}

			if (!selectedDataset) {
				showErrorNotification("No dataset found for this CSW Record");
			} else {
				Dataset.datasetSelected(selectedDataset, wmsURL, useCache);
				$('#dataset-url-input-box').val(selectedDataset);
				if (parseInt(Constant.ui.view_show_csw_chosen_dataset_title, 10)) {
					$('#dataset-selected-title').fadeOut(Constant.fadeSpeed, function() {
						$('#dataset-selected-title').html('Selected Dataset: ' + title);
						$('#dataset-selected-title').fadeIn(Constant.fadeSpeed);
					});
				}

				$('#csw-output').dialog('close');
			}
		},
		selectSubdataset: function(selectedDataset, wmsURL, title, useCache) {
			Dataset.datasetSelected(selectedDataset, wmsURL, useCache);
			$('#dataset-url-input-box').val(selectedDataset);
			if (parseInt(Constant.ui.view_show_csw_chosen_dataset_title, 10) && title) {
				$('#dataset-selected-title').fadeOut(Constant.fadeSpeed, function() {
					$('#dataset-selected-title').html('Selected Dataset: ' + title);
					$('#dataset-selected-title').fadeIn(Constant.fadeSpeed);
				});
			}
			$('#metadata').dialog('close');
			$('#csw-output').dialog('close');
		},
		setDatasetUrl: function (url) {
			if (url) {
				$('#dataset-url-input-box').val(url);

				if ($('#metadata').length) {
					$('#metadata').dialog('close');
				}
				if ($('#csw-output').length) {
					$('#csw-output').dialog('close');
				}

				$('#select-dataset-button').trigger('click');
			}
		}
    };
};
