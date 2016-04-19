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
 
function TextLinkSelectionHandler()
{
	this.rangeUtils = new TextLinkRangeUtils();
}
TextLinkSelectionHandler.prototype = {
	lastSummarySelection : null,
	lastSummary          : null,
	lastRangesSelection  : null,
	lastRanges           : [],
	summaryCancelled     : false,
	rangesCancelled      : false,
	set urisCancelled(aValue) {
		return this.rangesCancelled = aValue;
	},

	get focusedElement() {
		return null;
/*
		return Cc['@mozilla.org/focus-manager;1']
				.getService(Ci.nsIFocusManager)
				.focusedElement;
*/
	},

	destroy : function()
	{
	},

	getSummary : function()
	{
		log('getSummary');
		this.summaryCancelled = false;

		var target = this.rangeUtils.getEditableFromChild(this.focusedElement);
		var selection = this.rangeUtils.getSelection(target);
		selection = selection && selection.toString();
		if (this.lastSummarySelection) {
			if (this.lastSummarySelection == selection)
				return Promise.resolve(this.lastSummary);
		}
		this.lastSummarySelection = selection;

		var assertContinuable = (function() {
			if (this.summaryCancelled)
				throw new Error('context menu is already closed');
		}).bind(this);

		var uris = [];
		var foundURIs = {};
		return this.rangeUtils.getFirstSelectionURIRange(target, false, null, assertContinuable)
			.then((function(aFirstRange) {
				log('getSummary:first ', aFirstRange);
				assertContinuable();
				if (aFirstRange) {
					uris.push(aFirstRange.uri);
					aFirstRange.range.detach();
					foundURIs[aFirstRange.uri] = true;
				}
				return this.rangeUtils.getLastSelectionURIRange(target, false, foundURIs, assertContinuable);
			}).bind(this))
			.then((function(aLastRange) {
				log('getSummary:last ', aLastRange);
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
			.catch((function(aError) {
				log('getSummary:error ', aError);
				this.lastSummarySelection = null;
				this.lastSummary = null;
				throw aError;
			}).bind(this));
	},

	getRanges : function(aOnProgress)
	{
		this.rangesCancelled = false;
		if (this.getRangesTimer)
			clearInterval(this.getRangesTimer);

		var target = this.rangeUtils.getEditableFromChild(this.focusedElement);
		var selection = this.rangeUtils.getSelection(target);
		selection = selection && selection.toString();
		if (this.lastRangesSelection) {
			if (this.lastRangesSelection == selection)
				return Promise.resolve(this.lastRanges);
		}
		this.lastRangesSelection = selection;

		this.lastRanges.forEach(function(aRange) {
			try {
				aRange.range.detach();
			}
			catch(e) {
			}
		});
		this.lastRanges = [];

		var assertContinuable = (function() {
			if (this.rangesCancelled)
				throw new Error('operation was cancellled');
		}).bind(this);

		log('getRanges:start');
		var findURIsIterator = this.rangeUtils.getURIRangesIterator(target, null, null, null, assertContinuable);
		return new Promise((function(aResolve, aReject) {
			this.getRangesTimer = setInterval((function() {
				if (this.rangesCancelled) {
					log('getRanges:cancelled');
					clearInterval(this.getRangesTimer);
					this.getRangesTimer = null;
					this.lastRangesSelection = null;
					this.lastRanges.forEach(function(aRange) {
						try {
							aRange.range.detach();
						}
						catch(e) {
						}
					});
					this.lastRanges = [];
					return aReject();
				}
				try {
					assertContinuable();
					var range = findURIsIterator.next();
					this.lastRanges.push(range);
					log('getRanges:new range ', range);
					if (typeof aOnProgress == 'function')
						aOnProgress([range]);
				}
				catch(aError) {
					if (aError instanceof StopIteration) {
						findURIsIterator = null;
						clearInterval(this.getRangesTimer);
						this.getRangesTimer = null;
						log('getRanges:finish ', this.lastRanges);
						this.lastRanges.sort(this.rangeUtils._compareRangePosition);
						aResolve(this.lastRanges);
					}
					else {
						log('getRanges:error ' + aError);
						aReject(aError);
					}
				}
			}).bind(this), 1);
		}).bind(this));
	},

	getURIs : function(aOptions)
	{
		log('getURIs ', aOptions);
		aOptions = aOptions || {};
		return this.getRanges(function(aRanges) {
				var uris = aRanges.map(function(aRange) {
					return aRange.uri;
				});
				log('getURIs: uris ', uris);
				if (typeof aOptions.onProgress == 'function')
					aOptions.onProgress(uris);
			})
			.then(function(aRanges) {
				var selections = [];
				var uris = aRanges.map(function(aRange) {
					if (aOptions.select) {
						if (selections.indexOf(aRange.selection) < 0) {
							selections.push(aRange.selection);
							aRange.selection.removeAllRanges();
						}
						aRange.selection.addRange(aRange.range);
					}
					return aRange.uri;
				});
				selections = undefined;
				log('getURIs: final uris ', uris);
				return uris;
			})
			.catch(function(aError) {
				log('getURIs: error ' + aError);
				return [];
			});
	}
};
