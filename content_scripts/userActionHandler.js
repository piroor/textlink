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
 * Portions created by the Initial Developer are Copyright (C) 2015-2016
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
 
function TextLinkUserActionHandler()
{
	this.rangeUtils = new TextLinkRangeUtils();

	document.addEventListener('mousedown', this, true);
	document.addEventListener('mouseup', this, true);
	document.addEventListener('dblclick', this, true);
	document.addEventListener('keypress', this, true);
}
TextLinkUserActionHandler.prototype = {
	destroy : function()
	{
		document.removeEventListener('mousedown', this, true);
		document.removeEventListener('mouseup', this, true);
		document.removeEventListener('dblclick', this, true);
		document.removeEventListener('keypress', this, true);
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
				let focusedElement = null; // Cc['@mozilla.org/focus-manager;1'].getService(Ci.nsIFocusManager).focusedElement;
				if (focusedElement && focusedElement instanceof HTMLAnchorElement) {
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
		log('handleUserActionEvent ', aEvent.type);
		this.getActionsForEvent(aEvent).some(function(aAction) {
			log('action:', aAction);
			try {
				this.openClickedURI(aEvent, aAction.action);
				return true;
			}
			catch(e) {
				log('error:' + e);
			}
			return false;
		}, this);
	},

	getActionsForEvent : function(aEvent) 
	{
		var actions = [];
		if (
			aEvent.originalTarget.ownerDocument != document ||
			aEvent.originalTarget.ownerDocument.designMode == 'on' ||
			(
				TextLinkUtils.evaluateXPath(
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

		return configs.actions.filter(function(aAction) {
			return this.actionShouldHandleEvent(aAction, aEvent);
		}, this);
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
		log('openClickedURI:', aAction);
		var target = TextLinkUtils.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			aAction == TextLinkConstants.ACTION_DISABLED ||
			aEvent.button > 0 ||
			target.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var frame = target.ownerDocument.defaultView;

		var self = this;
		this.rangeUtils.getSelectionURIRanges(frame, this.rangeUtils.FIND_FIRST, configs.findClickPointStrictly)
			.then(function(aRanges) {
				log('aRanges:', aRanges);
				if (aRanges.length > 0)
					self.openURIRanges({
						action : aAction,
						frame  : frame,
						ranges : aRanges
					});
			})
			.catch(function(aError) {
				log('error: '+aError);
			});
	},
	openURIRanges : function(aParams)
	{
		var aAction = aParams.action;
		var aRanges = aParams.ranges;
		var aFrame  = aParams.frame;

		if (aRanges.length == 0)
			return;

		if (aRanges.length == 1 &&
			aRanges[0].range instanceof Range) {
			let range = aRanges[0];
			range.selection.removeAllRanges();
			range.selection.addRange(range.range);
		}

		if (aAction & TextLinkConstants.ACTION_SELECT)
			return;

		if (aAction & TextLinkConstants.ACTION_COPY) {
			TextLinkUtils.setClipBoard(aRanges.map(function(aRange) {
				return aRange.uri;
			}).join('\n'));
			return;
		}

		for (let i = 0, maxi = aRanges.length; i < maxi; i++)
		{
			let uri = aRanges[i].uri;
			let referrer = (aAction & TextLinkConstants.ACTION_STEALTH) ?
					null :
					aFrame.location.href ;

		if (aAction & TextLinkConstants.ACTION_OPEN_IN_WINDOW ||
			aAction & TextLinkConstants.ACTION_STEALTH) {
			chrome.runtime.sendMessage({
				type     : TextLinkConstants.COMMAND_OPEN_URI_WITH_ACTION,
				uri      : uri,
				referrer : referrer,
				action   : aAction
			});
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_TAB) {
			let opened = aFrame.open(uri);
			opened.focus();
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB) {
			aFrame.open(uri);
			aFrame.focus();
		}
		else if (aAction & TextLinkConstants.ACTION_OPEN_IN_CURRENT) {
			aFrame.location.href = uri;
			aAction ^= TextLinkConstants.ACTION_OPEN_IN_CURRENT;
			aAction |= TextLinkConstants.ACTION_OPEN_IN_BACKGROUND_TAB;
		}
		}
	}
};
