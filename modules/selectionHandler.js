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
 
const EXPORTED_SYMBOLS = ['TextLinkSelectionHandler']; 

const Cc = Components.classes;
const Ci = Components.interfaces;

var { Promise } = Components.utils.import('resource://gre/modules/Promise.jsm', {});

var { TextLinkConstants } = Components.utils.import('resource://textlink-modules/constants.js', {});
var { TextLinkUtils } = Components.utils.import('resource://textlink-modules/utils.js', {});
var { TextLinkRangeUtils } = Components.utils.import('resource://textlink-modules/range.js', {});
 
function TextLinkSelectionHandler(aGlobal, aEventTarget) 
{
	this.rangeUtils = new TextLinkRangeUtils(aGlobal, function() {
		return aGlobal.content;
	});
	this.global = aGlobal;
}
TextLinkSelectionHandler.prototype = {
	get contentDocument() {
		return this.global.content.document;
	},

	get popupNode() {
		return null;
	},

	destroy : function()
	{
		delete this.global;
	},

	lastSummary : null,

	getSummary : function()
	{
		var target = this.rangeUtils.getEditableFromChild(this.popupNode);
		var selection = this.rangeUtils.getSelection(target);
		selection = selection && selection.toString();
		if (this.lastSelection) {
			if (this.lastSelection == selection)
				return Promise.resolve(this.lastSummary);
		}
		this.lastSelection = selection;

		var assertContinuable = (function() {
//			if (!this.global.gContextMenu)
//				throw new Error('context menu is already closed');
		}).bind(this);

		var uris = [];
		var foundURIs = {};
		return this.rangeUtils.getFirstSelectionURIRange(target, false, null, assertContinuable)
			.then((function(aFirstRange) {
				assertContinuable();
				if (aFirstRange) {
					uris.push(aFirstRange.uri);
					aFirstRange.range.detach();
					foundURIs[aFirstRange.uri] = true;
				}
				return this.rangeUtils.getLastSelectionURIRange(target, false, foundURIs, assertContinuable);
			}).bind(this))
			.then((function(aLastRange) {
				assertContinuable();
				if (aLastRange) {
					uris.push(aLastRange.uri);
					aLastRange.range.detach();
				}

				if (uris.length > 0) {
					var summary = {};

					summary.first = summary.firstURI = uris[0];
					if (summary.first.length > 20)
						summary.first = summary.first
										.substring(0, 15)
										.replace(/\.+$/, '')+'..';

					if (uris.length > 1) {
						summary.last = summary.lastURI = uris[uris.length-1];
						if (summary.last.length > 20)
							summary.last = summary.last
											.substring(0, 15)
											.replace(/\.+$/, '')+'..';
					}
					return this.lastSummary = summary;
				}
				else {
					return this.lastSummary = {};
				}
			}).bind(this))
			.catch((function(e) {
				this.lastSelection = null;
				throw e;
			}).bind(this));
	}
};
