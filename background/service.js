/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Text Link.
 *
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ******/


var TextLinkService = inherit(TextLinkConstants, { 	
	
	buildTooltip : function() 
	{
		this.cancelSelectionURIs({ select : false });

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
				log('error: ' + aError);
			});
	},
	getSelectionURIs : function(aParams) {
		this.cancelSelectionURIs(aParams);
		return new Promise(function(aResolve, aReject) {
				chrome.tabs.sendMessage(
					aParams.tab.id,
					{
						type   : TextLinkConstants.COMMAND_REQUEST_SELECTION_URIS,
						id     : aParams.tab.id,
						select : aParams.select || false
					},
					{},
					function(aURIs) {
						aResolve(aURIs);
					}
				);
		});
	},
	cancelSelectionURIs : function(aParams) {
		return new Promise(function(aResolve, aReject) {
				chrome.tabs.sendMessage(
					aParams.tab.id,
					{
						type   : TextLinkConstants.COMMAND_REQUEST_CANCEL_SELECTION_URIS,
						select : aParams.select || false
					},
					{},
					function() {
						aResolve();
					}
				);
		});
	},
	getSelectionSummary : function(aParams)
	{
		this.cancelSelectionSummary(aParams);
		return new Promise(function(aResolve, aReject) {
				chrome.tabs.sendMessage(
					aParams.tab.id,
					{
						type : TextLinkConstants.COMMAND_REQUEST_SELECTION_SUMMARY,
						id   : aParams.tab.id
					},
					{},
					function(aURIs) {
						aResolve(aURIs);
					}
				);
		});
	},
	cancelSelectionSummary : function TLCB_cancelSelectionSummary(aParams)
	{
		return new Promise(function(aResolve, aReject) {
				chrome.tabs.sendMessage(
					aParams.tab.id,
					{
						type : TextLinkConstants.COMMAND_REQUEST_CANCEL_SELECTION_SUMMARY,
						id   : aParams.tab.id
					},
					{},
					function() {
						aResolve();
					}
				);
		});
	},


	destroyTooltip : function()
	{
		var range = document.createRange();
		range.selectNodeContents(this.tooltipBox);
		range.deleteContents();
		range.detach();
	},
  
	openURI : function(aURI, aReferrer, aAction, aOpenerTabId)
	{
		log('loadURI', { action: aAction, uri: aURI });
		var active = !(aAction & TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB);
		if (aAction & TextLinkConstants.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/)) {
			chrome.tabs.sendMessage(aOpenerTabId, {
				type     : TextLinkConstants.COMMAND_LOAD_URI,
				uri      : aURI,
				referrer : aReferrer
			});
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			chrome.windows.create({
				url     : aURI,
				focused : active
			});
		}
		else {
			chrome.tabs.create({
				url         : aURI,
				// this parameter does not supported yet and raises an error...
				// openerTabId : aOpenerTabId,
				active      : active
			});
		}
	},
 
	openTextLinkIn : function(aParams) 
	{
		log('openTextLinkIn', aParams);
		return this.getSelectionURIs({
				select : true,
				tab    : aParams.tab
			})
			.then((function(aURIs) {
				log('openTextLinkIn:step2', { uris: aURIs });
				if (aURIs.length > 0) {
					aParams.uris = aURIs;
					this.openTextLinkInPostProcess(aParams);
				}
			}).bind(this))
			.catch(function(aError) {
				log('openTextLinkIn:error', aError);
			});
	},
	openTextLinkInPostProcess : function(aParams)
	{
		var aAction = aParams.action;
		var aURIs = aParams.uris;
		log('openTextLinkInPostProcess', aParams);
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
		this.openTextLinkInTabs(aParams);
	},
	openTextLinkInTabs : function(aParams)
	{
		var aAction = aParams.action;
		var aURIs = aParams.uris;
		log('openTextLinkInTabs', aParams);
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
 
	initContextMenu : function() 
	{
		log('initContextMenu');
		var isAvailableContext = (
				(
					gContextMenu.isTextSelected &&
					gContextMenu.isContentSelected
				) ||
				gContextMenu.onTextInput
			);
		gContextMenu.showItem('context-textLink-menu',
			configs.contextItemSubmenu && isAvailableContext);

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
				!configs.contextItemCurrent &&
				!configs.contextItemWindow &&
				!configs.contextItemTab &&
				!configs.contextItemCopy
			) ||
			!isAvailableContext
			)
			return;

		gContextMenu.showItem('context-openTextLink-current',
			configs.contextItemCurrent);
		gContextMenu.showItem('context-openTextLink-window',
			configs.contextItemWindow);
		gContextMenu.showItem('context-openTextLink-tab',
			configs.contextItemTab);
		gContextMenu.showItem('context-openTextLink-copy',
			configs.contextItemCopy);

		this.updateMenuItems(items);
	},
	initSubMenu : function() 
	{
		log('initSubMenu');
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
		log('updateMenuItems');
		this.getSelectionSummary()
			.then((function(aSummary) {
				log('updateMenuItems:getSelectionSummary', aSummary);
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
				log('updateMenuItems:error', aError);
			});
	},
	getSelectionSummary : function()
	{
		log('getSelectionSummary');
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
	}
});


//chrome.runtime.onStartup.addListener(function() {
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'context-menu',
	title    : chrome.i18n.getMessage('contextItem.menu.label'),
	contexts : ['selection']
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'submenu-context-current',
	parentId : 'context-menu',
	title    : chrome.i18n.getMessage('contextItem.current.processing'),
	contexts : ['selection'],
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_CURRENT, // TextLinkConstants.ACTION_OPEN_IN_TAB,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'submenu-context-tab',
	parentId : 'context-menu',
	title    : chrome.i18n.getMessage('contextItem.tab.processing'),
	contexts : ['selection'],
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_TAB, // TextLinkConstants.ACTION_OPEN_IN_CURRENT,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'submenu-context-window',
	parentId : 'context-menu',
	title    : chrome.i18n.getMessage('contextItem.window.processing'),
	contexts : ['selection'],
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_WINDOW,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'submenu-context-copy',
	parentId : 'context-menu',
	title    : chrome.i18n.getMessage('contextItem.copy.processing'),
	contexts : ['selection'],
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_COPY,
			tab    : aTab
		});
	}
});

/*
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'context-current',
	title    : chrome.i18n.getMessage('contextItem.current.processing'),
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_CURRENT, // TextLinkConstants.ACTION_OPEN_IN_TAB,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'context-tab',
	title    : chrome.i18n.getMessage('contextItem.tab.processing'),
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_TAB, // TextLinkConstants.ACTION_OPEN_IN_CURRENT,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'context-window',
	title    : chrome.i18n.getMessage('contextItem.window.processing'),
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_OPEN_IN_WINDOW,
			tab    : aTab
		});
	}
});
chrome.contextMenus.create({
	type     : 'normal',
	id       : 'context-copy',
	title    : chrome.i18n.getMessage('contextItem.copy.processing'),
	onclick  : function(aInfo, aTab) {
		TextLinkService.openTextLinkIn({
			action : TextLinkConstants.ACTION_COPY,
			tab    : aTab
		});
	}
});
*/
//});

//chrome.runtime.onSuspend.addListener(function() {
//	chrome.contextMenus.removeAll();
//});

chrome.runtime.onMessage.addListener(function(aMessage, aSender, aResponder) {
	switch (aMessage.type)
	{
		case TextLinkConstants.COMMAND_OPEN_URI_WITH_ACTION:
			TextLinkService.openURI(aMessage.uri, aMessage.referrer, aMessage.action, aSender.tab.id);
			break;

		case TextLinkConstants.COMMAND_REPORT_SELECTION_URIS_PROGRESS:
			TextLinkService.onSelectionURIProgress(aMessage.uris);
			break;
	}
});
