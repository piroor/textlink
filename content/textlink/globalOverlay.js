(function(aGlobal) {
var { Promise } = Components.utils.import('resource://gre/modules/Promise.jsm', {});
var { inherit } = Components.utils.import('resource://textlink-modules/inherit.jsm', {});
var { prefs } = Components.utils.import('resource://textlink-modules/prefs.js', {});
var { TextLinkConstants } = Components.utils.import('resource://textlink-modules/constants.js', {});
var { TextLinkUtils } = Components.utils.import('resource://textlink-modules/utils.js', {});
var { TextLinkRangeUtils } = Components.utils.import('resource://textlink-modules/range.js', {});
var { TextLinkUserActionHandler } = Components.utils.import('resource://textlink-modules/userActionHandler.js', {});

var TextLinkService = inherit(TextLinkConstants, { 
	utils : TextLinkUtils,
	rangeUtils : new TextLinkRangeUtils(window, function() {
		return gBrowser.contentWindow;
	}),
	
	get window() 
	{
		return window;
	},

	get browser()
	{
		return 'gBrowser' in window ? window.gBrowser :
				this.document.getElementById('messagepane');
	},
 
	get browserURI() 
	{
		if (!this._browserURI) {
			var uri = prefs.getPref('browser.chromeURL');
			if (!uri) {
				try {
					var handler = Components.classes['@mozilla.org/commandlinehandler/general-startup;1?type=browser'].getService(Components.interfaces.nsICmdLineHandler);
					uri = handler.chromeUrlForTask;
				}
				catch(e) {
				}
			}
			if (uri.charAt(uri.length-1) == '/')
				uri = uri.replace(/chrome:\/\/([^\/]+)\/content\//, 'chrome://$1/content/$1.xul');
			this._browserURI = uri;
		}
		return this._browserURI;
	},
	_browserURI : null,
 
	get tooltip() 
	{
		return document.getElementById('textLinkTooltip-selectedURI');
	},
	get tooltipBox()
	{
		return document.getElementById('textLinkTooltip-selectedURI-box');
	},
 
	get contextMenu() 
	{
		return document.getElementById('contentAreaContextMenu');
	},
 
	get popupNode() 
	{
		var popup = this.contextMenu;
		return (gContextMenuContentData && gContextMenuContentData.popupNode) ||
				(popup && popup.triggerNode) ||
				document.popupNode ;
	},
 
	get bundle() { 
		if (!this._bundle) {
			this._bundle = document.getElementById('textlink-bundle');
		}
		return this._bundle;
	},
	_bundle : null,
 
	forbidDblclick: false,
	mousedownPosition: null,
	forbidDblclickTolerance: 24,
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;

			case 'popupshowing':
				if (aEvent.currentTarget == this.tooltip)
					this.buildTooltip();
				else if (aEvent.target == this.contextMenu)
					this.initContextMenu();
				return;

			case 'popuphiding':
				if (aEvent.currentTarget == this.tooltip)
					this.destroyTooltip();
				else if (aEvent.target == this.contextMenu)
					this.destroyContextMenu();
				return;

			case 'TabOpen':
				return this.initTab(aEvent.originalTarget, this.browser);

			case 'TabClose':
				return this.destroyTab(aEvent.originalTarget);
		}
	},
	
	buildTooltip : function() 
	{
		this.destroyTooltip();

		if (!this.popupNode)
			return;

		var buildLinesForURIs = (function(aURIs) {
			var fragment = document.createDocumentFragment();
			aURIs.forEach(function(aURI) {
				var line = document.createElement('description');
				line.setAttribute('value', aURI);
				fragment.appendChild(line);
			});
			this.tooltipBox.appendChild(fragment);
		}).bind(this);

		gBrowser.selectedTab.__textlink__contentBridge
			.getSelectionURIs(buildLinesForURIs)
			.then((function(aURIs) {
				var range = document.createRange();
				range.selectNodeContents(this.tooltipBox);
				range.deleteContents();
				range.detach();
				buildLinesForURIs(aURIs);
			}).bind(this));
	},
	destroyTooltip : function()
	{
		var range = document.createRange();
		range.selectNodeContents(this.tooltipBox);
		range.deleteContents();
		range.detach();

		gBrowser.selectedTab.__textlink__contentBridge
			.cancelSelectionURIs();
	},
  
	loadURI : function(aURI, aReferrer, aAction, aBrowser, aOpener)
	{
		if (aAction & TextLinkConstants.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/) ||
			aBrowser.localName != 'tabbrowser') {
			aBrowser.loadURI(aURI, aReferrer);
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', aURI, null, aReferrer);
		}
		else {
			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(aOpener);
			}
			aBrowser.loadOneTab(aURI, {
				referrerURI: aReferrer,
				charset: null,
				postData: null,
				inBackground: (aAction & TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB),
				relatedToCurrent: true,
			});
		}
	},
 
	openTextLinkIn : function(aAction, aTarget) 
	{
		var frame = this.rangeUtils.getCurrentFrame();
		var self = this;
		return this.rangeUtils.getSelectionURIRanges(this.rangeUtils.getEditableFromChild(aTarget) || frame)
			.then(function(aRanges) {
				if (aRanges.length)
					return self.openTextLinkInPostProcess(aAction, aTarget, aRanges);
			});
	},
	openTextLinkInPostProcess : function(aAction, aTarget, aRanges)
	{
		var selections = [];
		var uris = aRanges.map(function(aRange) {
				if (selections.indexOf(aRange.selection) < 0) {
					selections.push(aRange.selection);
					aRange.selection.removeAllRanges();
				}
				aRange.selection.addRange(aRange.range);
				return aRange.uri;
			});
		selections = void(0);

		if (aAction == TextLinkConstants.ACTION_COPY) {
			if (uris.length > 1) uris.push('');
			TextLinkUtils.setClipBoard(uris.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = TextLinkConstants.ACTION_OPEN_IN_CURRENT;

		if (
			uris.length > 1 &&
			(aAction == TextLinkConstants.ACTION_OPEN_IN_TAB ||
			aAction == TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			!PlacesUIUtils._confirmOpenInTabs(uris.length)
			) {
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			uris.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_CURRENT && uris.length == 1) {
			this.browser.loadURI(uris[0]);
			return;
		}
		this.openTextLinkInTabs(uris, aAction);
	},
	openTextLinkInTabs : function(aURIs, aAction)
	{
		var selectTab;
		var tabs = [];
		var b = this.browser;
		aURIs.forEach(function(aURI, aIndex) {
			if (
				aIndex == 0 &&
				(
					(aAction == TextLinkConstants.ACTION_OPEN_IN_CURRENT) ||
					(b.currentURI && (window.isBlankPageURL ? window.isBlankPageURL(b.currentURI.spec) : (b.currentURI.spec == 'about:blank')))
				)
				) {
				if ('TreeStyleTabService' in window) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				b.loadURI(aURI);
				if (!selectTab) selectTab = b.selectedTab;
				tabs.push(b.selectedTabs);
			}
			else {
				if ('TreeStyleTabService' in window && !TreeStyleTabService.checkToOpenChildTab(b)) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				let tab = b.addTab(aURI, {relatedToCurrent: true});
				if (!selectTab) selectTab = tab;
				tabs.push(tab);
			}
		}, this);

		if ('TreeStyleTabService' in window) // Tree Style Tab
			TreeStyleTabService.stopToOpenChildTab(b);

		if (selectTab &&
			aAction != TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}

		return tabs;
	},
 
	init : function() 
	{
		prefs.addPrefListener(this);
		this.migratePrefs();
		this.initPrefs();

		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.contextMenu.addEventListener('popupshowing', this, false);
		this.contextMenu.addEventListener('popuphiding', this, false);

		if (prefs.getPref('browser.tabs.remote.autostart')) {
			window.messageManager.loadFrameScript(TextLinkConstants.CONTENT_SCRIPT, true);
		}
		else {
			this.userActionHandler = new TextLinkUserActionHandler(window, this.browser);
			this.userActionHandler.loadURI = (function(aURI, aReferrer, aAction, aOpener) {
				aReferrer = aReferrer && TextLinkUtils.makeURIFromSpec(aReferrer);
				this.loadURI(aURI, aReferrer, aAction, this.browser, aOpener);
			}).bind(this);
		}

		Array.forEach(this.browser.tabContainer.childNodes, function(aTab) {
			this.initTab(aTab, this.browser);
		}, this);
		this.browser.tabContainer.addEventListener('TabOpen',  this, true);
		this.browser.tabContainer.addEventListener('TabClose', this, true);

		// hacks.js
		this.overrideExtensions();
	},
	
	initTab : function(aTab, aTabBrowser) 
	{
		aTab.__textlink__contentBridge = new TextLinkContentBridge(aTab, aTabBrowser);
	},
 
	initContextMenu : function() 
	{
		var items = [
				'context-openTextLink-current',
				'context-openTextLink-window',
				'context-openTextLink-tab',
				'context-openTextLink-copy'
			];

		items.forEach(function(aID) {
			gContextMenu.showItem(aID, false);
			var item = this.setLabel(aID, 'label-processing');
			if (item) {
				item.setAttribute('disabled', true);
				item.setAttribute('uri-finding', true);
				item.classList.add('menuitem-iconic');
			}
		}, this);

		if (
			(
				!TextLinkUtils.contextItemCurrent &&
				!TextLinkUtils.contextItemWindow &&
				!TextLinkUtils.contextItemTab &&
				!TextLinkUtils.contextItemCopy
			) ||
			(
				(
					!gContextMenu.isTextSelected ||
					!gContextMenu.isContentSelected
				) &&
				(
					!gContextMenu.onTextInput ||
					!selection
				)
			)
			)
			return;

		gContextMenu.showItem('context-openTextLink-current',
			TextLinkUtils.contextItemCurrent);
		gContextMenu.showItem('context-openTextLink-window',
			TextLinkUtils.contextItemWindow);
		gContextMenu.showItem('context-openTextLink-tab',
			TextLinkUtils.contextItemTab);
		gContextMenu.showItem('context-openTextLink-copy',
			TextLinkUtils.contextItemCopy);

		gBrowser.selectedTab.__textlink__contentBridge
			.getSelectionSummary()
			.then((function(aSummary) {
				if (aSummary) {
					var targets = [
						/\%s1/i, aSummary.first,
						/\%s2/i, aSummary.last,
						/\%s/i,  aSummary.first
					];
					var attr = aSummary.last ? 'label-base-multiple' : 'label-base-single' ;

					items.forEach(function(aID) {
						var item = this.setLabel(aID, attr, targets);
						if (item) {
							item.removeAttribute('disabled');
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
						}
					}, this);
				}
				else {
					items.forEach(function(aID) {
						var item = this.setLabel(aID, 'label-disabled');
						if (item) {
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
						}
					}, this);
				}
			}).bind(this));
	},
	setLabel : function(aID, aAttr, aTargets)
	{
		var item = document.getElementById(aID);
		if (!item)
			return;
		var base = item.getAttribute(aAttr);
		if (aTargets) {
			for (var i = 0; i < aTargets.length; i+=2)
				base = base.replace(aTargets[i], aTargets[i+1]);
		}

		item.setAttribute('label', base);

		return item;
	},

	destroyContextMenu : function()
	{
		gBrowser.selectedTab.__textlink__contentBridge
			.cancelSelectionSummary();
	},
  
	destroy : function() 
	{
		prefs.removePrefListener(this);

		window.removeEventListener('unload', this, false);

		this.contextMenu.removeEventListener('popupshowing', this, false);
		this.contextMenu.removeEventListener('popuphiding', this, false);

		this.browser.tabContainer.removeEventListener('TabOpen',  this, true);
		this.browser.tabContainer.removeEventListener('TabClose', this, true);

		if (prefs.getPref('browser.tabs.remote.autostart')) {
			window.messageManager.sendAsyncMessage(this.MESSAGE_TYPE, {
				command : this.COMMAND_SHUTDOWN,
				params  : {}
			});
		}
		else {
			this.userActionHandler.destroy();
		}

		Array.forEach(this.browser.tabContainer.childNodes, function(aTab) {
			this.destroyTab(aTab);
		}, this);
	},
	
	destroyTab : function(aTab) 
	{
		if (aTab.__textlink__contentBridge) {
			aTab.__textlink__contentBridge.destroy();
			delete aTab.__textlink__contentBridge;
		}
	},

	observe : function(aSubject, aTopic, aData) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = prefs.getPref(aData);
		TextLinkUtils.onPrefValueChanged(aData, value);

		var configs = {};
		configs[aData] = value;
		window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
			command : TextLinkConstants.COMMAND_NOTIFY_CONFIG_UPDATED,
			config  : configs
		});
	},
	domains : [
		'textlink.',
		'network.enableIDN',
		'network.IDN.blacklist_chars'
	],

	get prefKeys() {
		if (!this._prefKeys) {
			this._prefKeys = [
				'network.enableIDN',
				'network.IDN.blacklist_chars',
				'textlink.scheme',
				'textlink.scheme.fixup.table',
				'textlink.scheme.fixup.default',
				'textlink.find_click_point.strict',
				'textlink.relative.enabled',
				'textlink.multibyte.enabled',
				'textlink.multiline.enabled',
				'textlink.idn.enabled',
				'textlink.idn.scheme',
				'textlink.i18nPath.enabled',
				'textlink.gTLD',
				'textlink.ccTLD',
				'textlink.IDN_TLD',
				'textlink.extraTLD',
				'textlink.idn.lazyDetection.separators',
				'textlink.part.exception.whole',
				'textlink.part.exception.start',
				'textlink.part.exception.end',
				'textlink.contextmenu.openTextLink.current',
				'textlink.contextmenu.openTextLink.window',
				'textlink.contextmenu.openTextLink.tab',
				'textlink.contextmenu.openTextLink.copy'
			];
			this._prefKeys = this._prefKeys.concat(prefs.getDescendant('textlink.actions.'));
		}
		return this._prefKeys;
	},
	initPrefs : function() 
	{
		this.prefKeys.sort().forEach(function(aPref) {
			this.observe(null, 'nsPref:changed', aPref);
		}, this);
	},
 
	migratePrefs : function()
	{
		// migrate old prefs
		var orientalPrefs = [];
		switch (prefs.getPref('textlink.prefsVersion'))
		{
			case 0:
				[
					'textlink.schemer:textlink.scheme',
					'textlink.schemer.fixup.table:textlink.scheme.fixup.table',
					'textlink.schemer.fixup.default:textlink.scheme.fixup.default'
				].forEach(function(aPref) {
					var keys = aPref.split(':');
					var value = prefs.getPref(keys[0]);
					if (value !== null) {
						prefs.setPref(keys[1], value);
						prefs.clearPref(keys[0]);
					}
				}, this);
			default:
				break;
		}
		prefs.setPref('textlink.prefsVersion', this.kPREF_VERSION);
	}
   
}); 
aGlobal.TextLinkService = TextLinkService;


function TextLinkContentBridge(aTab, aTabBrowser) 
{
	this.init(aTab, aTabBrowser);
}
TextLinkContentBridge.prototype = inherit(TextLinkConstants, {
	mTab : null,
	mTabBrowser : null,
	init : function TLCB_init(aTab, aTabBrowser)
	{
		this.mTab = aTab;
		this.mTabBrowser = aTabBrowser;
		this.handleMessage = this.handleMessage.bind(this);
		this.resolvers = {};

		var manager = window.messageManager;
		manager.addMessageListener(this.MESSAGE_TYPE, this.handleMessage);

		this.mTab.addEventListener('TabRemotenessChange', this, false);

		this.notifyConfigUpdatedMessage();
	},
	destroy : function TLCB_destroy()
	{
		this.mTab.removeEventListener('TabRemotenessChange', this, false);

		var manager = window.messageManager;
		manager.removeMessageListener(this.MESSAGE_TYPE, this.handleMessage);

		delete this.mTab;
		delete this.mTabBrowser;
		delete this.resolvers;
	},
	sendAsyncCommand : function TLCB_sendAsyncCommand(aCommandType, aCommandParams)
	{
		var manager = this.mTab.linkedBrowser.messageManager;
		manager.sendAsyncMessage(this.MESSAGE_TYPE, {
			command : aCommandType,
			params  : aCommandParams || {}
		});
	},
	handleMessage : function TLCB_handleMessage(aMessage)
	{
//		dump('*********************handleMessage*******************\n');
//		dump('TARGET IS: '+aMessage.target.localName+'\n');
//		dump(JSON.stringify(aMessage.json)+'\n');

		if (aMessage.target != this.mTab.linkedBrowser)
		  return;

		switch (aMessage.json.command)
		{
			case this.COMMAND_LOAD_URI:
				var params = aMessage.json;
				var referrer = params.referrer && TextLinkUtils.makeURIFromSpec(params.referrer);
				TextLinkService.loadURI(params.uri, referrer, params.action, this.mTabBrowser, this.mTab);
				return;

			case this.COMMAND_REPORT_SELECTION_SUMMARY:
				var id = aMessage.json.id;
				if (id in this.resolvers) {
					let resolver = this.resolvers[id];
					delete this.resolvers[id];
					resolver(aMessage.json.summary);
				}
				return;

			case this.COMMAND_REPORT_SELECTION_URIS:
				var id = aMessage.json.id;
				if (id in this.resolvers) {
					let resolver = this.resolvers[id];
					delete this.resolvers[id];
					resolver(aMessage.json.uris);
				}
				return;

			case this.COMMAND_REPORT_SELECTION_URIS_PROGRESS:
				if (typeof this.onSelectionURIProgress == 'function')
					this.onSelectionURIProgress(aMessage.json.uris);
				return;
		}
	},
	handleEvent: function TLCB_handleEvent(aEvent)
	{
		switch (aEvent.type)
		{
			case 'TabRemotenessChange':
				return this.notifyConfigUpdatedMessage();
		}
	},
	notifyConfigUpdatedMessage : function TLCB_notifyConfigUpdatedMessage()
	{
		var configs = {};
		TextLinkService.prefKeys.forEach(function(aKey) {
			configs[aKey] = prefs.getPref(aKey);
		});
		this.mTab.linkedBrowser.messageManager.sendAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
			config  : configs
		});
	},
	getSelectionSummary : function TLCB_getSelectionSummary()
	{
		return new Promise((function(aResolve, aReject) {
			var id = Date.now() + '-' + Math.floor(Math.random() * 65000);
			this.sendAsyncCommand(this.COMMAND_REQUEST_SELECTION_SUMMARY, {
				id : id
			});
			return this.resolvers[id] = aResolve;
		}).bind(this));
	},
	cancelSelectionSummary : function TLCB_cancelSelectionSummary()
	{
		this.resolvers = {};
		this.sendAsyncCommand(this.COMMAND_REQUEST_CANCEL_SELECTION_SUMMARY);
	},
	getSelectionURIs : function TLCB_getSelectionURIs(aOnProgress)
	{
		this.onSelectionURIProgress = aOnProgress;
		return new Promise((function(aResolve, aReject) {
			var id = Date.now() + '-' + Math.floor(Math.random() * 65000);
			this.sendAsyncCommand(this.COMMAND_REQUEST_SELECTION_URIS, {
				id : id
			});
			return this.resolvers[id] = aResolve;
		}).bind(this));
	},
	cancelSelectionURIs : function TLCB_cancelSelectionURIs()
	{
		this.onSelectionURIProgress = null;
		this.resolvers = {};
		this.sendAsyncCommand(this.COMMAND_REQUEST_CANCEL_SELECTION_URIS);
	}
});
aGlobal.TextLinkContentBridge = TextLinkContentBridge;

})(this);
 
