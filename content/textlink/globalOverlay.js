var TextLinkService = { 
	
	get window() 
	{
		return window;
	},

	get browser()
	{
		var w = this.window;
		return 'SplitBrowser' in w ? w.SplitBrowser.activeBrowser : w.gBrowser ;
	},
 
	get browserURI() 
	{
		if (!this._browserURI) {
			var uri = this.prefs.getPref('browser.chromeURL');
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
		return document.getElementById('contentAreaContextMenu') || // Firefox
					document.getElementById('messagePaneContext'); // Thunderbird
	},
 
	get popupNode() 
	{
		var popup = this.contextMenu;
		return popup && popup.triggerNode || document.popupNode ;
	},
 
	get bundle() { 
		if (!this._bundle) {
			this._bundle = document.getElementById('textlink-bundle');
		}
		return this._bundle;
	},
	_bundle : null,
 
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
				if (aEvent.currentTarget == this.tooltip) {
					this.buildTooltip(aEvent);
				}
				else {
					this.initContextMenu();
				}
				return;

			case 'popuphiding':
				this.destroyTooltip();
				this.stopProgressiveBuildTooltip();
				return;

			case 'SubBrowserAdded':
				this.initBrowser(aEvent.originalTarget.browser);
				return;

			case 'SubBrowserRemoveRequest':
				this.destroyBrowser(aEvent.originalTarget.browser);
				return;

			case 'keypress':
				if (aEvent.keyCode != aEvent.DOM_VK_ENTER &&
					aEvent.keyCode != aEvent.DOM_VK_RETURN)
					return;
				break;

			case 'UIOperationHistoryPreUndo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onPreUndoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;

			case 'UIOperationHistoryUndo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onUndoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;

			case 'UIOperationHistoryRedo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onRedoOpenTextLinkInTabs(aEvent);
						return;
				}

			case 'UIOperationHistoryRedo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onPostRedoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;
		}

		this.handleUserActionEvent(aEvent);
	},
	
	handleUserActionEvent : function(aEvent) 
	{
		this.getActionsForEvent(aEvent).some(function(aAction) {
			try {
				this.openClickedURI(aEvent, aAction.action);
				return true;
			}
			catch(e) {
			}
			return false;
		}, this);
	},
 
	getActionsForEvent : function(aEvent) 
	{
		var actions = [];
		if (
			aEvent.originalTarget.ownerDocument == document ||
			aEvent.originalTarget.ownerDocument.designMode == 'on' ||
			(
				this.evaluateXPath(
					'ancestor-or-self::*[1]',
					aEvent.originalTarget,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue
					.localName
					.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			) {
			return actions;
		}

		for (let i in this.actions)
		{
			let action = this.actions[i];
			if (this.actionShouldHandleEvent(action, aEvent)) {
				actions.push(this.actions[i]);
			}
		}
		return actions;
	},
 
	actionShouldHandleEvent : function(aAction, aEvent) 
	{
		var trigger;
		return (
			(
				(
					aEvent.type == 'keypress' &&
					(trigger = aAction.triggerKey.toLowerCase()) &&
					/(VK_[^-,|\s]+)/i.test(trigger) &&
					aEvent['DOM_'+RegExp.$1.toUpperCase()] &&
					(
						RegExp.$1.toUpperCase().search(/VK_(ENTER|RETURN)/) > -1 ?
							(
								aEvent.keyCode == aEvent.DOM_VK_ENTER ||
								aEvent.keyCode == aEvent.DOM_VK_RETURN
							) :
							aEvent.keyCode == aEvent['DOM_'+RegExp.$1.toUpperCase()]
					)
				) ||
				(
					(trigger = aAction.triggerMouse.toLowerCase()) &&
					(
						aEvent.type == 'dblclick' ?
							(aEvent.button == 0 && trigger.indexOf('dblclick') > -1) :
						aEvent.type == 'click' ?
							(aEvent.button == (trigger.indexOf('middleclick') > -1 ? 1 : 0 )) :
							false
					)
				)
			) &&
			(
				(
					trigger.indexOf('accel') > -1 ?
						(aEvent.ctrlKey || aEvent.metaKey) :
						(
							(trigger.indexOf('ctrl') > -1 == aEvent.ctrlKey) &&
							(trigger.indexOf('meta') > -1 == aEvent.metaKey)
						)
				) &&
				(trigger.indexOf('shift') > -1 == aEvent.shiftKey) &&
				(trigger.indexOf('alt') > -1 == aEvent.altKey)
			)
		);
	},
 
	buildTooltip : function(aEvent) 
	{
		this.stopProgressiveBuildTooltip();

		var target = this.getEditableFromChild(this.popupNode);
		var selection = this.getSelection(target);
		selection = selection ?
			[
				this.popupNode.ownerDocument.defaultView.location.href,
				(function() {
					var positions = [];
					for (let i = 0, maxi = selection.rangeCount; i < maxi; i++)
					{
						let range = selection.getRangeAt(i);
						let position = range.cloneRange();
						position.collapse(true);
						try {
							position.setStartBefore(range.startContainer.ownerDocument.documentElement);
							positions.push(position.toString().length+'+'+range.toString().length);
						}
						catch(e) {
						}
					}
					return positions.join(',');
				})(),
				selection.toString()
			].join('\n') :
			null ;

		if (this.tooltip.lastSelection != selection) {
			this.tooltip.findURIsIterator = this.getURIRangesIterator(target);
			this.tooltip.foundURIRanges   = [];
			this.tooltip.lastSelection    = selection;
		}

		this.tooltip.buildTimer = window.setInterval(function(aSelf) {
			if (aSelf.updateTooltip()) return;
			window.clearInterval(aSelf.tooltip.buildTimer);
			aSelf.tooltip.buildTimer       = null;
			aSelf.tooltip.foundURIRanges.forEach(function(aRange) {
				aRange.range.detach();
			});
			aSelf.tooltip.foundURIRanges   = [];
			aSelf.tooltip.findURIsIterator = null;
		}, 1, this);
	},
	stopProgressiveBuildTooltip : function()
	{
		if (this.tooltip.buildTimer) {
			window.clearInterval(this.tooltip.buildTimer);
			this.tooltip.buildTimer = null;
		}
	},
	updateTooltip : function()
	{
		this.destroyTooltip();

		var iterator = this.tooltip.findURIsIterator;
		if (iterator) {
			var ranges = this.tooltip.foundURIRanges;
			try {
				ranges.push(iterator.next());
			}
			catch(e if e instanceof StopIteration) {
			}
			catch(e) {
				return false;
			}
			ranges.sort(this._compareRangePosition);

			this.tooltip.foundURIs = ranges.map(function(aRange) {
				return aRange.uri;
			});
		}

		var fragment = document.createDocumentFragment();
		this.tooltip.foundURIs.forEach(function(aURI) {
			var line = document.createElement('description');
			line.setAttribute('value', aURI);
			fragment.appendChild(line);
		});

		this.tooltipBox.appendChild(fragment);
		return iterator;
	},
	destroyTooltip : function()
	{
		var range = document.createRange();
		range.selectNodeContents(this.tooltipBox);
		range.deleteContents();
		range.detach();
	},
  
	openClickedURI : function(aEvent, aAction) 
	{
		var target = this.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			aAction == this.ACTION_DISABLED ||
			aEvent.button > 0 ||
			target.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var b = aEvent.currentTarget;
		if (!b) return;

		var frame = target.ownerDocument.defaultView;

		var ranges = this.getSelectionURIRanges(frame, this.FIND_FIRST, this.strict);
		if (!ranges.length) return;

		var range = ranges[0];

		var selection = frame.getSelection();
		selection.removeAllRanges();
		selection.addRange(range.range);

		if (aAction & this.ACTION_SELECT) return;

		if (aAction & this.ACTION_COPY) {
			this.setClipBoard(range.uri);
			return;
		}

		var uri = range.uri;
		var referrer = (aAction & this.ACTION_STEALTH) ?
					null :
					this.makeURIFromSpec(frame.location.href) ;
		this.loadURI(uri, referrer, aEvent, aAction);
	},
	loadURI : function(aURI, aReferrer, aEvent, aAction)
	{
		var b = aEvent.currentTarget;
		var frame = aEvent.originalTarget.ownerDocument.defaultView;

		if (aAction & this.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/) ||
			b.localName != 'tabbrowser') {
			b.loadURI(aURI, aReferrer);
		}
		else if (aAction & this.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', aURI, null, aReferrer);
		}
		else {
			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(frame);
			}
			b.loadOneTab(aURI, aReferrer, null, null, (aAction & this.ACTION_OPEN_IN_BACKGROUND_TAB));
		}
	},
 
	openTextLinkIn : function(aAction, aTarget) 
	{
		var frame = this.getCurrentFrame();
		var uris = this.getSelectionURIRanges(this.getEditableFromChild(aTarget) || frame	);
		if (!uris.length) return;

		var selection = frame.getSelection();
		selection.removeAllRanges();
		uris = uris.map(function(aRange) {
				selection.addRange(aRange.range);
				return aRange.uri;
			});

		if (aAction == this.ACTION_COPY) {
			if (uris.length > 1) uris.push('');
			this.setClipBoard(uris.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = this.ACTION_OPEN_IN_CURRENT;

		if (
			uris.length > 1 &&
			(aAction == this.ACTION_OPEN_IN_TAB ||
			aAction == this.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			!PlacesController.prototype._confirmOpenTabs(uris.length)
			) {
			return;
		}

		if (aAction == this.ACTION_OPEN_IN_WINDOW) {
			uris.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == this.ACTION_OPEN_IN_CURRENT && uris.length == 1) {
			this.browser.loadURI(uris[i]);
			return;
		}

		if ('UndoTabService' in window && UndoTabService.isUndoable()) {
			let self = this;
			let state = UndoTabService.getTabState(this.browser.selectedTab);
			let oldSelected = this.browser.selectedTab;
			let entry;
			UndoTabService.doOperation(
				function(aInfo) {
					let tabs = self.openTextLinkInTabs(uris, aAction);
					let replace = tabs.length < uris.length;
					entry.data = UndoTabService.getTabOpetarionTargetsData({
						browser : self.browser,
						tabs : {
							oldSelected : oldSelected,
							newSelected : self.browser.selectedTab,
							first       : tabs[0]
						}
						}, {
						replace : replace,
						state   : replace ? state : null ,
						uris    : uris
					});
				},
				(entry = {
					name  : 'textlink-openTabs',
					label : this.bundle.getString('undo_openTextLinkInTabs_label')
				})
			);
		}
		else {
			this.openTextLinkInTabs(uris, aAction);
		}
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
					(aAction == this.ACTION_OPEN_IN_CURRENT) ||
					(b.currentURI && b.currentURI.spec == 'about:blank')
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
				let tab = b.addTab(aURI);
				if (!selectTab) selectTab = tab;
				tabs.push(tab);
			}
		}, this);

		if ('TreeStyleTabService' in window) // Tree Style Tab
			TreeStyleTabService.stopToOpenChildTab(b);

		if (selectTab &&
			aAction != this.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}

		return tabs;
	},
	onPreUndoOpenTextLinkInTabs : function(aEvent)
	{
		var data   = aEvent.entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (target.browser)
			data.tabs.newSelected = UndoTabService.getId(target.browser.selectedTab);
	},
	onUndoOpenTextLinkInTabs : function(aEvent)
	{
		var entry  = aEvent.entry;
		var data   = entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (!target.browser)
			return aEvent.preventDefault();

		if (target.tabs.oldSelected)
			target.browser.selectedTab = target.tabs.oldSelected;
		if (data.replace)
			UndoTabService.setTabState(target.tab, target.state);
	},
	onRedoOpenTextLinkInTabs : function(aEvent)
	{
		var entry  = aEvent.entry;
		var data   = entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		data.tabs.oldSelected = UndoTabService.getId(target.browser.selectedTab);
		if (!data.replace)
			return;

		if (!target.tabs.first)
			return aEvent.preventDefault();
		data.state = UndoTabService.getTabState(target.tabs.first);
		target.tabs.first.linkedBrowser.loadURI(data.uris[0]);
	},
	onPostRedoOpenTextLinkInTabs : function(aEvent)
	{
		var data   = aEvent.entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (target.tabs.newSelected)
			target.browser.selectedTab = target.tabs.newSelected;
	},
 
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.contextMenu.addEventListener('popupshowing', this, false);

		window.addEventListener('UIOperationHistoryPreUndo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryUndo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryRedo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryPostRedo:TabbarOperations', this, false);

		var appcontent = document.getElementById('appcontent');
		if (appcontent) {
			appcontent.addEventListener('SubBrowserAdded', this, false);
			appcontent.addEventListener('SubBrowserRemoveRequest', this, false);
		}

		this.initBrowser(gBrowser);

		// hacks.js
		this.overrideExtensions();
	},
	
	initBrowser : function(aBrowser) 
	{
		aBrowser.addEventListener('dblclick', this, true);
		aBrowser.addEventListener('keypress', this, true);
	},
 
	initContextMenu : function() 
	{
		var uris = [];
		var target;
		if (
			(
				this.contextItemCurrent ||
				this.contextItemWindow ||
				this.contextItemTab ||
				this.contextItemCopy
			) &&
			gContextMenu.isTextSelected &&
			gContextMenu.isContentSelected
			) {
			try {
				target = this.getEditableFromChild(this.popupNode);
				var first = this.getFirstSelectionURIRange(target);
				var found = {};
				if (first) {
					uris.push(first.uri);
					first.range.detach();
					found[first.uri] = true;
				}
				var last = this.getLastSelectionURIRange(target, false, found);
				if (last) {
					uris.push(last.uri);
					last.range.detach();
				}
			}
			catch(e) {
			}
		}

		gContextMenu.showItem('context-openTextLink-current',
			uris.length && this.contextItemCurrent);
		gContextMenu.showItem('context-openTextLink-window',
			uris.length && this.contextItemWindow);
		gContextMenu.showItem('context-openTextLink-tab',
			uris.length && this.contextItemTab);
		gContextMenu.showItem('context-openTextLink-copy',
			uris.length && this.contextItemCopy);
		if (uris.length) {
			var uri1, uri2;

			uri1 = uris[0];
			if (uri1.length > 20) uri1 = uri1.substring(0, 15).replace(/\.+$/, '')+'..';

			if (uris.length > 1) {
				uri2 = uris[uris.length-1];
				if (uri2.length > 20) uri2 = uri2.substring(0, 15).replace(/\.+$/, '')+'..';
			}

			var targets = [/\%s1/i, uri1, /\%s2/i, uri2, /\%s/i, uri1];
			var attr = (uris.length > 1) ? 'label-base-multiple' : 'label-base-single' ;

			[
				'context-openTextLink-current',
				'context-openTextLink-window',
				'context-openTextLink-tab',
				'context-openTextLink-copy'
			].forEach(function(aID) {
				var item = this.setLabel(aID, attr, targets);
			}, this);
		}
	},
	setLabel : function(aID, aAttr, aTargets)
	{
		var item = document.getElementById(aID);
		if (!item) return;
		var base = item.getAttribute(aAttr);
		for (var i = 0; i < aTargets.length; i+=2)
			base = base.replace(aTargets[i], aTargets[i+1]);

		item.setAttribute('label', base);

		return item;
	},
  
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.contextMenu.removeEventListener('popupshowing', this, false);

		var appcontent = document.getElementById('appcontent');
		if (appcontent) {
			appcontent.removeEventListener('SubBrowserAdded', this, false);
			appcontent.removeEventListener('SubBrowserRemoveRequest', this, false);
		}

		window.removeEventListener('UIOperationHistoryPreUndo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryUndo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryRedo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryPostRedo:TabbarOperations', this, false);

		this.destroyBrowser(gBrowser);
	},
	
	destroyBrowser : function(aBrowser) 
	{
		aBrowser.removeEventListener('dblclick', this, true);
		aBrowser.removeEventListener('keypress', this, true);
	}
   
}; 

(function() { 
	var namespace = {};
	Components.utils.import('resource://textlink-modules/utils.js', namespace);
	TextLinkService.__proto__ = TextLinkService.utils = namespace.TextLinkUtils;
	TextLinkService.utils.init();
})();
 
