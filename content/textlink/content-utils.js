(function(global) {
	function log(aMessage, ...aArgs) {
		TextLinkUtils.log('<content> '+aMessage, ...aArgs);
	}
	log('CONTENT SCRIPT LOADED');

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;
	var Cr = Components.results;

	var { TextLinkConstants } = Cu.import('resource://textlink-modules/constants.js', {});
	var { TextLinkUtils } = Cu.import('resource://textlink-modules/utils.js', {});
	var { TextLinkUserActionHandler } = Cu.import('resource://textlink-modules/userActionHandler.js', {});
	var { TextLinkSelectionHandler } = Cu.import('resource://textlink-modules/selectionHandler.js', {});

	function free() {
		cleanup =
			Cc = Ci = Cu = Cr =
			TextLinkConstants =
			TextLinkUtils =
			TextLinkUserActionHandler =
			messageListener =
			log =
			userActionHandler =
			selectionHandler =
				undefined;
	}

	var messageListener = function(aMessage) {
		log('CONTENT MESSAGE LISTENED', aMessage.json);
		switch (aMessage.json.command)
		{
			case TextLinkConstants.COMMAND_SHUTDOWN:
				log('shutting down...');
				global.removeMessageListener(TextLinkConstants.MESSAGE_TYPE, messageListener);
				userActionHandler.destroy();
				free();
				return;

			case TextLinkConstants.COMMAND_NOTIFY_CONFIG_UPDATED:
				log('updating config...');
				Object.keys(aMessage.json.config).forEach(function(aKey) {
					var value = aMessage.json.config[aKey];
					TextLinkUtils.onPrefValueChanged(aKey, value);
				});
				return;

			case TextLinkConstants.COMMAND_REQUEST_SELECTION_SUMMARY:
				log('getting summary...');
				selectionHandler.getSummary()
					.catch(function(aError) {
						log('Error: ', aError);
						Components.utils.reportError(aError);
						return null;
					})
					.then(function(aSummary) {
						log('summary: ', aSummary);
						global.sendAsyncMessage(TextLinkConstants.MESSAGE_TYPE, {
							command : TextLinkConstants.COMMAND_REPORT_SELECTION_SUMMARY,
							id      : aMessage.json.params.id,
							summary : aSummary
						});
					});
				return;

			case TextLinkConstants.COMMAND_REQUEST_CANCEL_SELECTION_SUMMARY:
				selectionHandler.summaryCancelled = true;
				return;

			case TextLinkConstants.COMMAND_REQUEST_SELECTION_URIS:
				log('getting uris...');
				selectionHandler.getURIs({
						select     : aMessage.json.params.select,
						onProgress : function(aURIs) {
							global.sendAsyncMessage(TextLinkConstants.MESSAGE_TYPE, {
								command : TextLinkConstants.COMMAND_REPORT_SELECTION_URIS_PROGRESS,
								uris    : aURIs
							});
						}
					})
					.catch(function(aError) {
						log('Error: ', aError);
						Components.utils.reportError(aError);
						return null;
					})
					.then(function(aURIs) {
						log('uris: ', aURIs);
						global.sendAsyncMessage(TextLinkConstants.MESSAGE_TYPE, {
							command : TextLinkConstants.COMMAND_REPORT_SELECTION_URIS,
							id      : aMessage.json.params.id,
							uris    : aURIs
						});
					});
				return;

			case TextLinkConstants.COMMAND_REQUEST_CANCEL_SELECTION_URIS:
				selectionHandler.urisCancelled = true;
				return;
		}
	};
	global.addMessageListener(TextLinkConstants.MESSAGE_TYPE, messageListener);

	var userActionHandler = new TextLinkUserActionHandler(global);
	userActionHandler.loadURI = function(aURI, aReferrer, aAction) {
		global.sendAsyncMessage(TextLinkConstants.MESSAGE_TYPE, {
			command  : TextLinkConstants.COMMAND_LOAD_URI,
			uri      : aURI,
			referrer : aReferrer,
			action   : aAction
		});
	};

	var selectionHandler = new TextLinkSelectionHandler(global);
})(this);
