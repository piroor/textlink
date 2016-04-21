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
	getCurrentURI : function(aTab) {
		return new Promise(function(aResolve, aReject) {
			chrome.tabs.sendMessage(
				aTab.id,
				{
					type   : TextLinkConstants.COMMAND_REQUEST_CURRENT_URI
				},
				{},
				function(aURI) {
					aResolve(aURI);
				}
			);
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
					log('respond uris: ', aURIs);
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
					log('respond summaries: ', aURIs);
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
  
	openURI : function(aParams)
	{
		var aURI       = aParams.uri;
		var aReferrer  = aParams.referrer;
		var aAction    = aParams.action;
		var aOpenerTab = aParams.openerTab;
		log('openURI', aParams);
		var active = !(aAction & TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB);
		if (aAction & TextLinkConstants.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/)) {
			return chrome.tabs.sendMessage(aOpenerTab.id, {
				type     : TextLinkConstants.COMMAND_LOAD_URI,
				uri      : aURI,
				referrer : aReferrer
			});
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			return chrome.windows.create({
				url     : aURI,
				focused : active
			});
		}
		else {
			return chrome.tabs.create({
				url         : aURI,
				// this parameter does not supported yet and raises an error...
				// openerTabId : aOpenerTab.id,
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
				log('openTextLinkIn:error' + aError);
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
			this.setClipBoard(aURIs.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = TextLinkConstants.ACTION_OPEN_IN_CURRENT;

		if (
			aURIs.length > 1 &&
			(aAction == TextLinkConstants.ACTION_OPEN_IN_TAB ||
			aAction == TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			false // !PlacesUIUtils._confirmOpenInTabs(aURIs.length)
			) {
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_WINDOW) {
			aURIs.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == TextLinkConstants.ACTION_OPEN_IN_CURRENT &&
			aURIs.length == 1) {
			this.browser.loadURI(aURIs[0]);
			return;
		}
		this.getCurrentURI(aParams.tab)
			.then((function(aURI) {
				aParams.currentURI = aURI;
				this.openTextLinkInTabs(aParams);
			}).bind(this));
	},
	openTextLinkInTabs : function(aParams)
	{
		var aAction = aParams.action;
		var aURIs = aParams.uris;
		var aOpenerTab = aParams.tab;
		var aCurrentURI = aParams.currentURI;
		log('openTextLinkInTabs', aParams);
		var tabActivated = false;
		var promisedTabs = [];
		aURIs.forEach(function(aURI, aIndex) {
			if (
				aIndex == 0 &&
				(
					(aAction == TextLinkConstants.ACTION_OPEN_IN_CURRENT) ||
					(
						aCurrentURI &&
						(window.isBlankPageURL ?
							window.isBlankPageURL(aCurrentURI) :
							(aCurrentURI == 'about:blank')
						)
					)
				)
				) {
//				if ('TreeStyleTabService' in window) // Tree Style Tab
//					TreeStyleTabService.readyToOpenChildTab(b, true);
				this.openURI({
					uri       : aURI,
					referrer  : aCurrentURI,
					action    : TextLinkConstants.ACTION_OPEN_IN_CURRENT
				});
				tabActivated = true;
				promisedTabs.push(Promise.resolve(aOpenerTab));
			}
			else {
//				if ('TreeStyleTabService' in window && !TreeStyleTabService.checkToOpenChildTab(b)) // Tree Style Tab
//					TreeStyleTabService.readyToOpenChildTab(b, true);
				let action = aAction;
				if (tabActivated)
					action |= TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB; // second and later tabs must stay background!
log('tab '+aIndex+' : action=' + action);
				promisedTabs.push(this.openURI({
					uri       : aURI,
					referrer  : aCurrentURI,
					action    : action,
					openerTab : aOpenerTab
				}));
				if (!tabActivated) tabActivated = true;
			}
		}, this);

//		if ('TreeStyleTabService' in window) // Tree Style Tab
//			TreeStyleTabService.stopToOpenChildTab(b);

		return Promise.all(promisedTabs).then(function(aTabs) {
			log('opened tabs: ', aTabs);
			if (aTabs.length > 0 &&
				!(aAction & TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB)) {
				chrome.tabs.update(aTabs[0].id, {
					active : true
				});
//				if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
//				if ('setFocusInternal' in b) b.setFocusInternal();
			}
			return aTabs;
		});
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
	},

	setClipBoard : function(aString) 
	{
		var container = document.createElement('textarea');
		document.documentElement.appendChild(container);

		container.value = aString;
		container.select();
		document.execCommand('copy');

		container.parentNode.removeChild(container);
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
			TextLinkService.openURI({
				uri       : aMessage.uri,
				referrer  : aMessage.referrer,
				action    : aMessage.action,
				openerTab : aSender.tab
			});
			break;

		case TextLinkConstants.COMMAND_REPORT_SELECTION_URIS_PROGRESS:
//			TextLinkService.onSelectionURIProgress(aMessage.uris);
			break;
	}
});
