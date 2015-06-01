(function(aGlobal) {

var TextLinkService = { 
	
	get window() 
	{
		return window;
	},

	get browser()
	{
		return this.rangeUtils.browser;
	},
 
	get browserURI() 
	{
		if (!this._browserURI) {
			var uri = this.utils.prefs.getPref('browser.chromeURL');
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
		return popup && popup.triggerNode || document.popupNode ;
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
				if (aEvent.currentTarget == this.tooltip) {
					this.buildTooltip(aEvent);
				}
				else if (aEvent.target == this.contextMenu) {
					this.initContextMenu();
				}
				return;

			case 'popuphiding':
				this.destroyTooltip();
				this.stopProgressiveBuildTooltip();
				return;

			case 'keypress':
				if (aEvent.keyCode != aEvent.DOM_VK_ENTER &&
					aEvent.keyCode != aEvent.DOM_VK_RETURN)
					return;
				break;

			case 'mousedown':
				if (aEvent.detail == 2) {
					this.forbidDblclick = false;
					this.mousedownPosition = { x: aEvent.screenX, y: aEvent.screenY };
				}
				return;
			case 'mouseup':
				if (aEvent.detail != 2)
					return;
				if (document.commandDispatcher.focusedElement instanceof HTMLAnchorElement) {
					// Fix for https://github.com/piroor/textlink/issues/14
					this.forbidDblclick = true;
					return;
				}
				let pos = this.mousedownPosition;
				if (pos) {
					this.mousedownPosition = null;
					let delta = Math.sqrt(
						Math.pow(aEvent.screenX - pos.x, 2),
						Math.pow(aEvent.screenY - pos.y, 2)
					);
					if (delta > this.forbidDblclickTolerance)
						this.forbidDblclick = true;
				}
				return;
			case 'dblclick':
				if (this.forbidDblclick)
					return;
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
				this.utils.evaluateXPath(
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

		for (let i in this.utils.actions)
		{
			let action = this.utils.actions[i];
			if (this.actionShouldHandleEvent(action, aEvent)) {
				actions.push(action);
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
		if (!this.popupNode)
			return;

		var target = this.rangeUtils.getEditableFromChild(this.popupNode);
		var selection = this.rangeUtils.getSelection(target);
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
			this.tooltip.findURIsIterator = this.rangeUtils.getURIRangesIterator(target);
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
			ranges.sort(this.rangeUtils._compareRangePosition);

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
		var target = this.utils.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			aAction == this.utils.ACTION_DISABLED ||
			aEvent.button > 0 ||
			target.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var b = aEvent.currentTarget;
		if (!b) return;

		var frame = target.ownerDocument.defaultView;

		var self = this;
		this.rangeUtils.getSelectionURIRanges(frame, this.rangeUtils.FIND_FIRST, this.utils.strict)
			.then(function(aRanges) {
				if (aRanges.length)
					self.openClickedURIPostProcess(aEvent, aAction, b, frame, aRanges);
			});
	},
	openClickedURIPostProcess : function(aEvent, aAction, aBrowser, aFrame, aRanges)
	{
		var range = aRanges[0];

		range.selection.removeAllRanges();
		range.selection.addRange(range.range);

		if (aAction & this.utils.ACTION_SELECT) return;

		if (aAction & this.utils.ACTION_COPY) {
			this.utils.setClipBoard(range.uri);
			return;
		}

		var uri = range.uri;
		var referrer = (aAction & this.utils.ACTION_STEALTH) ?
					null :
					this.utils.makeURIFromSpec(aFrame.location.href) ;
		this.loadURI(uri, referrer, aBrowser, aEvent, aAction);
	},
	loadURI : function(aURI, aReferrer, aBrowser, aEvent, aAction)
	{
		var frame = aEvent.originalTarget.ownerDocument.defaultView;

		if (aAction & this.utils.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/) ||
			aBrowser.localName != 'tabbrowser') {
			aBrowser.loadURI(aURI, aReferrer);
		}
		else if (aAction & this.utils.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', aURI, null, aReferrer);
		}
		else {
			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(frame);
			}
			aBrowser.loadOneTab(aURI, {
				referrerURI: aReferrer,
				charset: null,
				postData: null,
				inBackground: (aAction & this.utils.ACTION_OPEN_IN_BACKGROUND_TAB),
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

		if (aAction == this.utils.ACTION_COPY) {
			if (uris.length > 1) uris.push('');
			this.utils.setClipBoard(uris.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = this.utils.ACTION_OPEN_IN_CURRENT;

		if (
			uris.length > 1 &&
			(aAction == this.utils.ACTION_OPEN_IN_TAB ||
			aAction == this.utils.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			!PlacesUIUtils._confirmOpenInTabs(uris.length)
			) {
			return;
		}

		if (aAction == this.utils.ACTION_OPEN_IN_WINDOW) {
			uris.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == this.utils.ACTION_OPEN_IN_CURRENT && uris.length == 1) {
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
					(aAction == this.utils.ACTION_OPEN_IN_CURRENT) ||
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
			aAction != this.utils.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}

		return tabs;
	},
 
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.contextMenu.addEventListener('popupshowing', this, false);

		this.initBrowser(gBrowser);

		window.messageManager.loadFrameScript(this.CONTENT_SCRIPT, true);

		// hacks.js
		this.overrideExtensions();
	},
	
	initBrowser : function(aBrowser) 
	{
		aBrowser.addEventListener('mousedown', this, true);
		aBrowser.addEventListener('mouseup', this, true);
		aBrowser.addEventListener('dblclick', this, true);
		aBrowser.addEventListener('keypress', this, true);
	},
 
	initContextMenu : function() 
	{
		var items = [
				'context-openTextLink-current',
				'context-openTextLink-window',
				'context-openTextLink-tab',
				'context-openTextLink-copy'
			];
		var self = this;

		var target = this.rangeUtils.getEditableFromChild(this.popupNode);
		var selection = this.rangeUtils.getSelection(target);
		selection = selection && selection.toString();
		if (this.lastSelectionForContextMenu) {
			if (this.lastSelectionForContextMenu == selection)
				return;
		}
		this.lastSelectionForContextMenu = selection;

		items.forEach(function(aID) {
			gContextMenu.showItem(aID, false);
			var item = self.setLabel(aID, 'label-processing');
			if (item) {
				item.setAttribute('disabled', true);
				item.setAttribute('uri-finding', true);
				item.classList.add('menuitem-iconic');
			}
		});

		if (
			(
				!this.utils.contextItemCurrent &&
				!this.utils.contextItemWindow &&
				!this.utils.contextItemTab &&
				!this.utils.contextItemCopy
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
			this.utils.contextItemCurrent);
		gContextMenu.showItem('context-openTextLink-window',
			this.utils.contextItemWindow);
		gContextMenu.showItem('context-openTextLink-tab',
			this.utils.contextItemTab);
		gContextMenu.showItem('context-openTextLink-copy',
			this.utils.contextItemCopy);

		var check = function() {
				if (!gContextMenu) throw new Error('context menu is already closed');
			};

		var uris = [];
		var found = {};
		this.rangeUtils.getFirstSelectionURIRange(target, false, null, check)
			.then(function(aFirstRange) {
				check();
				if (aFirstRange) {
					uris.push(aFirstRange.uri);
					aFirstRange.range.detach();
					found[aFirstRange.uri] = true;
				}
				return self.rangeUtils.getLastSelectionURIRange(target, false, found, check);
			})
			.then(function(aLastRange) {
				check();
				if (aLastRange) {
					uris.push(aLastRange.uri);
					aLastRange.range.detach();
				}

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

					items.forEach(function(aID) {
						var item = self.setLabel(aID, attr, targets);
						if (item) {
							item.removeAttribute('disabled');
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
						}
					});
				}
				else {
					items.forEach(function(aID) {
						var item = self.setLabel(aID, 'label-disabled');
						if (item) {
							item.removeAttribute('uri-finding');
							item.classList.remove('menuitem-iconic');
						}
					});
				}
			})
			.catch(function(e) {
				self.lastSelectionForContextMenu = null;
			});
	},
	setLabel : function(aID, aAttr, aTargets)
	{
		var item = document.getElementById(aID);
		if (!item) return;
		var base = item.getAttribute(aAttr);
		if (aTargets) {
			for (var i = 0; i < aTargets.length; i+=2)
				base = base.replace(aTargets[i], aTargets[i+1]);
		}

		item.setAttribute('label', base);

		return item;
	},
  
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.contextMenu.removeEventListener('popupshowing', this, false);

		this.destroyBrowser(gBrowser);
	},
	
	destroyBrowser : function(aBrowser) 
	{
		aBrowser.removeEventListener('mousedown', this, true);
		aBrowser.removeEventListener('mouseup', this, true);
		aBrowser.removeEventListener('dblclick', this, true);
		aBrowser.removeEventListener('keypress', this, true);
	}
   
}; 
aGlobal.TextLinkService = TextLinkService;

	var namespace = {};
	Components.utils.import('resource://textlink-modules/utils.js', namespace);
	Components.utils.import('resource://textlink-modules/range.js', namespace);
	TextLinkService.utils = namespace.TextLinkUtils;
	TextLinkService.rangeUtils = new namespace.TextLinkRangeUtils(window);
})(this);
 
