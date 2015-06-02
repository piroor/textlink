(function(global) {
	var DEBUG = false;
	function mydump(aMessage) {
		if (DEBUG)
			dump('textlink content utils: '+aMessage +'\n');
	}
	mydump('CONTENT SCRIPT LOADED');

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;
	var Cr = Components.results;

	var { TextLinkConstants } = Cu.import('resource://textlink-modules/constants.js', {});
	var { TextLinkUtils } = Cu.import('resource://textlink-modules/utils.js', {});
	var { TextLinkUserActionHandler } = Cu.import('resource://textlink-modules/userActionHandler.js', {});

	function free() {
		cleanup =
			Cc = Ci = Cu = Cr =
			TextLinkConstants =
			TextLinkUtils =
			TextLinkUserActionHandler =
			messageListener =
			mydump =
			userActionHandler =
				undefined;
	}

	var messageListener = function(aMessage) {
		mydump('CONTENT MESSAGE LISTENED');
		mydump(JSON.stringify(aMessage.json));
		switch (aMessage.json.command)
		{
			case TextLinkConstants.COMMAND_SHUTDOWN:
				global.removeMessageListener(TextLinkConstants.MESSAGE_TYPE, messageListener);
				userActionHandler.destroy();
				free();
				return;

			case TextLinkConstants.COMMAND_NOTIFY_CONFIG_UPDATED:
				Object.keys(aMessage.json.config).forEach(function(aKey) {
					var value = aMessage.json.config[aKey];
					TextLinkUtils.onPrefValueChanged(aKey, value);
				});
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
})(this);
