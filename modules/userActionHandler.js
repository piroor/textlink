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
 * Portions created by the Initial Developer are Copyright (C) 2015
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
 
const EXPORTED_SYMBOLS = ['TextLinkUserActionHandler']; 

const Cc = Components.classes;
const Ci = Components.interfaces;

var { TextLinkConstants } = Components.utils.import('resource://textlink-modules/constants.js', {});
var { TextLinkUtils } = Components.utils.import('resource://textlink-modules/utils.js', {});
var { TextLinkRangeUtils } = Components.utils.import('resource://textlink-modules/range.js', {});
 
function TextLinkUserActionHandler(aGlobal, aEventTarget) 
{
	this.rangeUtils = new TextLinkRangeUtils(aGlobal, function() {
		return aGlobal.content;
	});

	this.global = aGlobal;
	this.target = aEventTarget || aGlobal;
	this.target.addEventListener('mousedown', this, true);
	this.target.addEventListener('mouseup', this, true);
	this.target.addEventListener('dblclick', this, true);
	this.target.addEventListener('keypress', this, true);
}
TextLinkUserActionHandler.prototype = {
	get contentDocument() {
		return this.global.content.document;
	},

	destroy : function()
	{
		this.target.removeEventListener('mousedown', this, true);
		this.target.removeEventListener('mouseup', this, true);
		this.target.removeEventListener('dblclick', this, true);
		this.target.removeEventListener('keypress', this, true);
		delete this.target;
		delete this.global;
	},

	forbidDblclick: false,
	mousedownPosition: null,
	forbidDblclickTolerance: 24,

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
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
				let focusedElement = Cc['@mozilla.org/focus-manager;1'].getService(Ci.nsIFocusManager).focusedElement;
				if (focusedElement instanceof aEvent.view.HTMLAnchorElement) {
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
			aEvent.originalTarget.ownerDocument != this.contentDocument ||
			aEvent.originalTarget.ownerDocument.designMode == 'on' ||
			(
				TextLinkUtils.evaluateXPath(
					'ancestor-or-self::*[1]',
					aEvent.originalTarget,
					Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue
					.localName
					.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			) {
			return actions;
		}

		for (let i in TextLinkUtils.actions)
		{
			let action = TextLinkUtils.actions[i];
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


	openClickedURI : function(aEvent, aAction) 
	{
		var target = TextLinkUtils.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			aAction == TextLinkConstants.ACTION_DISABLED ||
			aEvent.button > 0 ||
			target.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var b = aEvent.currentTarget;
		if (!b) return;

		var frame = target.ownerDocument.defaultView;

		var self = this;
		this.rangeUtils.getSelectionURIRanges(frame, this.rangeUtils.FIND_FIRST, TextLinkUtils.strict)
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

		if (aAction & TextLinkConstants.ACTION_SELECT) return;

		if (aAction & TextLinkConstants.ACTION_COPY) {
			TextLinkUtils.setClipBoard(range.uri);
			return;
		}

		var uri = range.uri;
		var referrer = (aAction & TextLinkConstants.ACTION_STEALTH) ?
					null :
					aFrame.location.href ;
		this.loadURI(uri, referrer, aAction, aFrame);
	},
	loadURI : function(aURI, aReferrer, aAction, aOpener)
	{
		//XXX REPLACE ME!
	}
};
