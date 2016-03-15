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
		return TextLinkService.browser.contentWindow;
	}),
	
	get window() 
	{
		return window;
	},

	get browser()
	{
		return gBrowser;
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
 
	get subMenu() 
	{
		return document.getElementById('context-textLink-menu').firstChild;
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
				else if (aEvent.target != aEvent.currentTarget)
					return;
				if (aEvent.target == this.contextMenu)
					this.initContextMenu();
				else if (aEvent.target == this.subMenu)
					this.initSubMenu();
				return;

			case 'popuphiding':
				if (aEvent.currentTarget == this.tooltip)
					this.destroyTooltip();
				else if (aEvent.target != aEvent.currentTarget)
					return;
				if (aEvent.target == this.contextMenu ||
					aEvent.target == this.subMenu)
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
		if (this.selectionHandler)
			this.selectionHandler.urisCancelled = true;
		else
			this.browser.selectedTab.__textlink__contentBridge
				.cancelSelectionURIs({ select : false });

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

		this.getSelectionURIs({
			select     : false,
			onProgress : buildLinesForURIs
		})
			.then((function(aURIs) {
				var range = document.createRange();
				range.selectNodeContents(this.tooltipBox);
				range.deleteContents();
				range.detach();
				buildLinesForURIs(aURIs);
			}).bind(this))
			.catch(function(aError) {
				Components.utils.reportError(aError);
			});
	},
	getSelectionURIs : function(aOptions) {
		if (this.selectionHandler)
			return this.selectionHandler.getURIs(aOptions);
		else
			return this.browser.selectedTab.__textlink__contentBridge
					.getSelectionURIs(aOptions)
	},
	destroyTooltip : function()
	{
		var range = document.createRange();
		range.selectNodeContents(this.tooltipBox);
		range.deleteContents();
		range.detach();
	},
  
	loadURI : function(aURI, aReferrer, aAction, aBrowser, aOpener)
	{
		this.utils.log('loadURI', { action: aAction, uri: aURI });
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
		this.utils.log('openTextLinkIn', { action: aAction, target: aTarget });
		return this.getSelectionURIs({
				select : true
			})
			.then((function(aURIs) {
				this.utils.log('openTextLinkIn:step2', { uris: aURIs });
				if (aURIs.length > 0)
					this.openTextLinkInPostProcess(aAction, aTarget, aURIs);
			}).bind(this))
			.catch(function(aError) {
				this.utils.log('openTextLinkIn:error', aError);
				Components.utils.reportError(aError);
			});
	},
	openTextLinkInPostProcess : function(aAction, aTarget, aURIs)
	{
		this.utils.log('openTextLinkInPostProcess', { action: aAction, target: aTarget, uris: aURIs });
		if (aAction == TextLinkConstants.ACTION_COPY) {
			if (aURIs.length > 1)
				aURIs.push('');
			TextLinkUtils.setClipBoard(aURIs.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = TextLinkConstants.ACTION_OPEN_IN_CURRENT;

		if (
			aURIs.length > 1 &&
			(aAction == TextLinkConstants.ACTION_OPEN_IN_TAB ||
			aAction == TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			!PlacesUIUtils._confirmOpenInTabs(aURIs.length)
			) {
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			aURIs.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_CURRENT && aURIs.length == 1) {
			this.browser.loadURI(aURIs[0]);
			return;
		}
		this.openTextLinkInTabs(aURIs, aAction);
	},
	openTextLinkInTabs : function(aURIs, aAction)
	{
		this.utils.log('openTextLinkInTabs', { uris: aURIs, action: aAction });
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
		this.subMenu.addEventListener('popupshowing', this, false);
		this.subMenu.addEventListener('popuphiding', this, false);

		window.messageManager.loadFrameScript(TextLinkConstants.CONTENT_SCRIPT, true);

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
		this.utils.log('initContextMenu');
		var isAvailableContext = (
				(
					gContextMenu.isTextSelected &&
					gContextMenu.isContentSelected
				) ||
				gContextMenu.onTextInput
			);
		gContextMenu.showItem('context-textLink-menu',
			TextLinkUtils.contextMenuItem && isAvailableContext);

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
				item.removeAttribute('tooltip');
			}
		}, this);

		if (
			(
				!TextLinkUtils.contextItemCurrent &&
				!TextLinkUtils.contextItemWindow &&
				!TextLinkUtils.contextItemTab &&
				!TextLinkUtils.contextItemCopy
			) ||
			!isAvailableContext
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

		this.updateMenuItems(items);
	},
	initSubMenu : function() 
	{
		this.utils.log('initSubMenu');
		var items = [
				'submenu-context-openTextLink-current',
				'submenu-context-openTextLink-window',
				'submenu-context-openTextLink-tab',
				'submenu-context-openTextLink-copy'
			];

		items.forEach(function(aID) {
			var item = this.setLabel(aID, 'label-processing');
			if (item) {
				item.setAttribute('disabled', true);
				item.setAttribute('uri-finding', true);
				item.classList.add('menuitem-iconic');
				item.removeAttribute('tooltip');
			}
		}, this);
		this.updateMenuItems(items);
	},
	updateMenuItems : function(aItems)
	{
		this.utils.log('updateMenuItems');
		this.getSelectionSummary()
			.then((function(aSummary) {
				this.utils.log('updateMenuItems:getSelectionSummary', aSummary);
				if (aSummary && aSummary.first) {
					var targets = [
						/\%s1/i, aSummary.first,
						/\%s2/i, aSummary.last,
						/\%s/i,  aSummary.first
					];
					var attr = aSummary.last ? 'label-base-multiple' : 'label-base-single' ;

					aItems.forEach(function(aID) {
						var item = this.setLabel(aID, attr, targets);
						if (item) {
							item.removeAttribute('disabled');
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
							item.setAttribute('tooltip', this.tooltip.id);
						}
					}, this);
				}
				else {
					aItems.forEach(function(aID) {
						var item = this.setLabel(aID, 'label-disabled');
						if (item) {
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
						}
					}, this);
				}
			}).bind(this))
			.catch(function(aError) {
				this.utils.log('updateMenuItems:error', aError);
				Components.utils.reportError(aError);
			});
	},
	getSelectionSummary : function()
	{
		this.utils.log('getSelectionSummary');
		if (this.selectionHandler)
			return this.selectionHandler.getSummary();
		else
			return this.browser.selectedTab.__textlink__contentBridge
					.getSelectionSummary();
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
		if (this.selectionHandler)
			this.selectionHandler.summaryCancelled = true;
		else
			this.browser.selectedTab.__textlink__contentBridge
				.cancelSelectionSummary();
	},
  
	destroy : function() 
	{
		prefs.removePrefListener(this);

		window.removeEventListener('unload', this, false);

		this.contextMenu.removeEventListener('popupshowing', this, false);
		this.contextMenu.removeEventListener('popuphiding', this, false);
		this.subMenu.removeEventListener('popupshowing', this, false);
		this.subMenu.removeEventListener('popuphiding', this, false);

		this.browser.tabContainer.removeEventListener('TabOpen',  this, true);
		this.browser.tabContainer.removeEventListener('TabClose', this, true);

		window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_SHUTDOWN,
			params  : {}
		});

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
		TextLinkConstants.DOMAIN,
		'network.enableIDN',
		'network.IDN.blacklist_chars'
	],

	get prefKeys() {
		if (!this._prefKeys) {
			this._prefKeys = [
				'network.enableIDN',
				'network.IDN.blacklist_chars'
			];
			this._prefKeys = this._prefKeys.cocnat([
				'debug',
				'scheme',
				'scheme.fixup.table',
				'scheme.fixup.default',
				'find_click_point.strict',
				'relative.enabled',
				'multibyte.enabled',
				'multiline.enabled',
				'idn.enabled',
				'idn.scheme',
				'i18nPath.enabled',
				'gTLD',
				'ccTLD',
				'IDN_TLD',
				'extraTLD',
				'idn.lazyDetection.separators',
				'part.exception.whole',
				'part.exception.start',
				'part.exception.end',
				'contextmenu.submenu',
				'contextmenu.openTextLink.current',
				'contextmenu.openTextLink.window',
				'contextmenu.openTextLink.tab',
				'contextmenu.openTextLink.copy'
			].map(function(aKey) {
				return this.DOMAIN + aKey;
			, this}));
			this._prefKeys = this._prefKeys.concat(prefs.getDescendant(this.DOMAIN + 'actions.'));
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
		var version = prefs.getPref(this.DOMAIN + 'prefsVersion') ||
						prefs.getPref('textlink.prefsVersion') ||
						0;
		switch (version)
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
			case 1:
				{
					prefs.getDescendant('textlink.').forEach(function(aKey) {
						var value = prefs.getPref(aKey);
						var newKey = this.DOMAIN + aKey.replace(/^textlink\./, '');
						prefs.setPref(newKey, value);
					}, this);
				}
			default:
				break;
		}
		prefs.setPref(this.DOMAIN + 'prefsVersion', this.kPREF_VERSION);
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
		TextLinkService.utils.log('TextLinkContentBridge#handlemessage', {
			target : aMessage.target,
			json   : aMessage.json
		});

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
		TextLinkService.utils.log('TextLinkContentBridge#getSelectionSummary');
		this.cancelSelectionSummary();
		return new Promise((function(aResolve, aReject) {
			var id = this.getSelectionSummaryIDPrefix + Date.now() + '-' + Math.floor(Math.random() * 65000);
			this.sendAsyncCommand(this.COMMAND_REQUEST_SELECTION_SUMMARY, {
				id : id
			});
			return this.resolvers[id] = aResolve;
		}).bind(this));
	},
	getSelectionSummaryIDPrefix : 'selectionSummary-',
	cancelSelectionSummary : function TLCB_cancelSelectionSummary()
	{
		TextLinkService.utils.log('TextLinkContentBridge#cancelSelectionSummary');
		Object.keys(this.resolvers).forEach(function(aKey) {
			if (aKey.indexOf(this.getSelectionSummaryIDPrefix) == 0)
				delete this.resolvers[aKey];
		}, this);
		this.sendAsyncCommand(this.COMMAND_REQUEST_CANCEL_SELECTION_SUMMARY);
	},
	getSelectionURIs : function TLCB_getSelectionURIs(aOptions)
	{
		TextLinkService.utils.log('TextLinkContentBridge#getSelectionURIs', aOptions);
		this.cancelSelectionURIs(aOptions);
		aOptions = aOptions || {};
		this.onSelectionURIProgress = aOptions.onProgress;
		return new Promise((function(aResolve, aReject) {
			var id = this.getSelectionURIsIDPrefix + (aOptions.select ? 'select-' : '') +
						Date.now() + '-' + Math.floor(Math.random() * 65000);
			this.sendAsyncCommand(this.COMMAND_REQUEST_SELECTION_URIS, {
				id     : id,
				select : aOptions.select || false
			});
			return this.resolvers[id] = aResolve;
		}).bind(this));
	},
	getSelectionURIsIDPrefix : 'selectionURIs-',
	cancelSelectionURIs : function TLCB_cancelSelectionURIs(aOptions)
	{
		TextLinkService.utils.log('TextLinkContentBridge#cancelSelectionURIs', aOptions);
		aOptions = aOptions || {};
		this.onSelectionURIProgress = null;
		var prefix = this.getSelectionURIsIDPrefix + (aOptions.select ? 'select-' : '');
		Object.keys(this.resolvers).forEach(function(aKey) {
			if (aKey.indexOf(prefix) == 0)
				delete this.resolvers[aKey];
		}, this);
		this.sendAsyncCommand(this.COMMAND_REQUEST_CANCEL_SELECTION_URIS);
	}
});
aGlobal.TextLinkContentBridge = TextLinkContentBridge;

})(this);
 
