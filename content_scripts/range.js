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
 
const INPUT_FIELD_CONDITITON = 'contains(" input INPUT textarea TEXTAREA textbox ", concat(" ", local-name(), " "))';
const IGNORE_NODE_CONDITION = 'contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " ")) or (contains(" a A ", concat(" ", local-name(), " ")) and @href) or @class="moz-txt-citetags"';
const IGNORE_TEXT_CONDITION = 'ancestor-or-self::*[contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " ")) or (contains(" a A ", concat(" ", local-name(), " ")) and @href) or @class="moz-txt-citetags"]';

function TextLinkRangeUtils(aGlobal, aCurrentFrameGetter) 
{
	this.global = aGlobal;
	this.currentFrameGetter = aCurrentFrameGetter;
}
TextLinkRangeUtils.prototype = {

	get Find()
	{
		throw new Error('NOT IMPLEMENTED'); // requires APIs of nsIFind
	},
  
// utilities 
	
	getSelection : function(aFrameOrEditable) 
	{
		if (
			!aFrameOrEditable ||
			(
				typeof aFrameOrEditable.Window != 'undefined' &&
				aFrameOrEditable instanceof aFrameOrEditable.Window
			)
			) {
			let frame = aFrameOrEditable;
			return frame && frame.getSelection();
		}
		else if (aFrameOrEditable instanceof Element) {
			return new SelectionInField(aFrameOrEditable);
		}
		return null;
	},
 
	getEditableFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return TextLinkUtils.evaluateXPath(
				'ancestor-or-self::*['+INPUT_FIELD_CONDITITON+'][1]',
				aNode,
				DOMXPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	getTextContentFromRange : function(aRange) 
	{
		var encoder = this._textEncoder;
		if (encoder) {
			try {
				encoder.init(
					aRange.startContainer.ownerDocument,
					'text/plain',
					encoder.OutputBodyOnly | encoder.OutputLFLineBreak
				);
				encoder.setRange(aRange);
				let result = encoder.encodeToString();
				encoder.init(
					aRange.startContainer.ownerDocument,
					'text/plain',
					encoder.OutputBodyOnly
				);
				encoder.setRange(null);
				return result;
			}
			catch(e) {
			}
		}
		return aRange.toString();
	},
	get _textEncoder()
	{
		return null; // not available in WebExtensions!
	},
  
// range operations 
	FIND_ALL    : 1,
	FIND_FIRST  : 2,
	FIND_LAST   : 4,
	ALLOW_SAME_URIS : 8,

	FIND_SINGLE : 6,

	ERRROR_FIND_MODE_NOT_SPECIFIED : 'you must specify find mode',
	ERRROR_NO_URI_RANGE : 'there is no range maybe URI',
	
	getURIRangesIterator : function(aFrameOrEditable, aMode, aStrict, aExceptionsHash, aContinuationChecker) 
	{
		if (!aMode)
			aMode = this.FIND_ALL;

		var ranges = [];
		var selection = this.getSelection(aFrameOrEditable);
		if (!selection || !selection.rangeCount)
			throw new Error(this.ERRROR_NO_URI_RANGE);

		var count, end, step;
		if (aMode & this.FIND_LAST) {
			count = selection.rangeCount-1;
			end   = -1;
			step  = -1;
		}
		else {
			count = 0;
			end   = selection.rangeCount;
			step  = 1;
		}
		for (; count != end; count += step)
		{
			let range = selection.getRangeAt(parseInt(count));
			try {
				let iterator = this.getURIRangesIteratorFromRange(range, aMode, aStrict, aExceptionsHash);
				while(true)
				{
					let foundRange = iterator.next();
					yield foundRange;
					ranges.push(foundRange);
					if (aContinuationChecker && typeof aContinuationChecker == 'function')
						aContinuationChecker();
				}
			}
			catch(e) {
			}
			if (
				ranges.length &&
				(range.collapsed || aMode & this.FIND_SINGLE)
				) {
				break;
			}
		}
	},
 
	getURIRangesIteratorFromRange : function(aBaseRange, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode)
			throw new Error(this.ERRROR_FIND_MODE_NOT_SPECIFIED);
		var ranges = [];

		var findRange = this.getFindRange(aBaseRange);
		var terms = this._getFindTermsFromRange(findRange, aMode);
		if (!terms.length)
			throw new Error(this.ERRROR_NO_URI_RANGE);

		var baseURI = aBaseRange.startContainer.ownerDocument.defaultView.location.href;
		var findOnlyFirst = aBaseRange.collapsed || aMode & this.FIND_SINGLE;

		var foundURIsHash = {};
		if (aExceptionsHash) {
			for (var i in aExceptionsHash)
			{
				foundURIsHash[i] = true;
			}
		}

		var rangeSet = this._getRangeSetFromRange(aBaseRange, findRange, aMode);
		var shouldReturnSingleResult = !(aMode & this.ALLOW_SAME_URIS);

		this.Find.findBackwards = (aMode & this.FIND_LAST);
		for (let i in terms)
		{
			let rangesForTerm = this._findRangesForTerm(
					terms[i],
					rangeSet,
					baseURI,
					aStrict,
					ranges,
					foundURIsHash,
					aMode
				);
			if (!rangesForTerm.length) continue;

			ranges = ranges.concat(rangesForTerm);
			if (shouldReturnSingleResult) {
				rangesForTerm.forEach(function(aRange) {
					foundURIsHash[aRange.uri] = true;
				});
			}
			for (let i in rangesForTerm)
			{
				yield rangesForTerm[i];
			}

			if (ranges.length && findOnlyFirst) break;
		}

		this._destroyRangeSet(rangeSet);
	},
	_getFindTermsFromRange : function(aRange, aMode)
	{
		var terms = [];
		var mayBeURIs = TextLinkUtils.matchURIRegExp(this.getTextContentFromRange(aRange));
		if (!mayBeURIs) {
			return terms;
		}
		if (aMode & this.FIND_LAST) {
			mayBeURIs = Array.slice(mayBeURIs).reverse();
		}
		mayBeURIs.forEach(function(aTerm) {
			if (typeof aTerm != 'string') aTerm = aTerm[0];
			aTerm = aTerm.replace(/^\s+|\s+$/g, '');
			aTerm = TextLinkUtils.sanitizeURIString(aTerm);
			if (!aTerm || terms.indexOf(aTerm) > -1) return;

			let hadlWidthTerm = TextLinkUtils.convertFullWidthToHalfWidth(aTerm);
			if (!TextLinkUtils.relativePathEnabled && TextLinkUtils.hasScheme(aTerm)) {
				let termForCheck = hadlWidthTerm;
				while (TextLinkUtils.hasScheme(termForCheck))
				{
					if (TextLinkUtils.hasLoadableScheme(termForCheck)) break;
					termForCheck = TextLinkUtils.removeScheme(termForCheck);
					aTerm = TextLinkUtils.removeScheme(aTerm);
				}
				if (!TextLinkUtils.hasLoadableScheme(termForCheck)) return;
			}
			else if (TextLinkUtils.URIExceptionPattern.test(hadlWidthTerm)) {
				return;
			}

			if (terms.indexOf(aTerm) < 0) terms.push(aTerm);
		}, this);
		if (aMode & this.FIND_ALL) {
			// 文字列長が長いものから先にサーチするために並べ替える（部分一致を除外するため）
			terms.sort(function(aA, aB) { return (aB.length - aA.length) || (aB - aA); });
		}
		return terms;
	},
	_getRangeSetFromRange : function(aBaseRange, aFindRange, aMode)
	{
		var findRange = aFindRange || this.getFindRange(aBaseRange);

		var editable = this.getEditableFromChild(findRange.startContainer);
		if (editable) {
			findRange.detach();
			findRange = editable.ownerDocument.createRange();
			findRange.selectNode(editable);
		}

		// use cloned range instead of range from selection,
		// because this operation may break the range.
		aBaseRange = aBaseRange.cloneRange();
		this._shrinkSelectionRange(aBaseRange);

		var startPoint = findRange.cloneRange();
		startPoint.collapse(!(aMode & this.FIND_LAST));
		var endPoint = findRange.cloneRange();
		endPoint.collapse(aMode & this.FIND_LAST);

		return {
			findRange  : findRange,
			startPoint : startPoint,
			endPoint   : endPoint,
			base       : aBaseRange
		};
	},
	_shrinkSelectionRange : function(aRange)
	{
		/**
		 * When I click "about" in a HTML like "<em>about:config</em>",
		 * Firefox creates selection range like "[<em>about]:config</em>".
		 * So, we must shrink the range like "<em>[about]:config</em>"
		 * for "strictly matching".
		 */

		var startContainer = aRange.startContainer;
		var startOffset = aRange.startOffset;
		var shrinkStartBase = startContainer;
		if (
			( // <startcontainer>text [<inline/>text]</startcontainer>
				startContainer.nodeType == Node.ELEMENT_NODE &&
				startOffset > 0 &&
				aRange.cloneContents().firstChild.nodeType == Node.ELEMENT_NODE &&
				(shrinkStartBase = startContainer.childNodes[startOffset])
			) ||
			( // <block>start container text [<inline>text]</inline></block>
				startContainer.nodeType != Node.ELEMENT_NODE &&
				String(startContainer.nodeValue).length == startOffset &&
				(shrinkStartBase = startContainer.nextSibling)
			)
			) {
			let node = TextLinkUtils.evaluateXPath(
					'following::text()[1] | descendant::text()[1]',
					shrinkStartBase,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			/**
			 * Don't use setStartBefore, because it reproduces wrong selection
			 * like "[<em>about]:config</em>".
			 */
			if (node) aRange.setStart(node, 0);
		}

		var endContainer = aRange.endContainer;
		var endOffset = aRange.endOffset;
		var shrinkEndBase = endContainer;
		if (
			(endOffset == 0 && endContainer.previousSibling) ||
			(
				endContainer.nodeType == Node.ELEMENT_NODE &&
				endOffset > 0 &&
				(shrinkEndBase = endContainer.childNodes[endOffset])
			)
			) {
			let node = TextLinkUtils.evaluateXPath(
					'preceding::text()[1] | descendant::text()[last()]',
					shrinkEndBase,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			if (node) aRange.setEnd(node, String(node.nodeValue).length);
		}
	},
	_destroyRangeSet : function(aRangeSet)
	{
		aRangeSet.findRange.detach();
		aRangeSet.startPoint.detach();
		aRangeSet.endPoint.detach();
		delete aRangeSet.findRange;
		delete aRangeSet.startPoint;
		delete aRangeSet.endPoint;
		delete aRangeSet.base;
	},
	_findRangesForTerm : function(aTerm, aRangeSet, aBaseURI, aStrict, aRanges, aFoundURIsHash, aMode)
	{
		if (!aFoundURIsHash) aFoundURIsHash = {};
		if (!aRanges) aRanges = [];
		if (this.Find.findBackwards) {
			aRangeSet.startPoint.setStart(aRangeSet.findRange.endContainer, aRangeSet.findRange.endOffset);
		}
		else {
			aRangeSet.startPoint.setStart(aRangeSet.findRange.startContainer, aRangeSet.findRange.startOffset);
		}
		aRangeSet.startPoint.collapse(true);
		var termRange;
		var uriRanges = [];
		var uriRange = null;
		var shouldReturnSingleResult = !(aMode & this.ALLOW_SAME_URIS);
		FIND_URI_RANGE:
		while (termRange = this.Find.Find(aTerm, aRangeSet.findRange, aRangeSet.startPoint, aRangeSet.endPoint))
		{
			let range = this.shrinkURIRange(termRange.cloneRange());
			let uri = TextLinkUtils.fixupURI(range.toString(), aBaseURI);
			let ranges = this.getFollowingURIPartRanges(range);
			if (ranges.length) {
				ranges.forEach(function(aRange) {
					uri += TextLinkUtils.convertFullWidthToHalfWidth(aRange.toString());
				}, this);
			}
			ranges.unshift(range);

			if (
				ranges.some(function(aRange) {
					return this._containsRange(aRangeSet.base, aRange, aStrict)
				}, this) &&
				uri &&
				!(uri in aFoundURIsHash)
				) {
				for (let i = 0, maxi = ranges.length; i < maxi; i++)
				{
					// 既に見つかったより長いURI文字列の一部である場合は除外する。
					let range = ranges[i];
					uriRange = {
						range     : range,
						uri       : uri,
						base      : aRangeSet.base,
						selection : this.getSelection(
							this.getEditableFromChild(range.startContainer) ||
							range.startContainer.ownerDocument.defaultView
						)
					};

					if (aRanges.some(function(aRange) {
							return this._containsRange(aRange.range, range, true);
						}, this))
						continue;

					uriRanges.push(uriRange);
					if (shouldReturnSingleResult) {
						break FIND_URI_RANGE;
					}
				}
			}

			if (shouldReturnSingleResult) {
				ranges.forEach(function(aRange) {
					aRange.detach();
				});
			}

			if (this.Find.findBackwards) {
				aRangeSet.startPoint.setEnd(termRange.startContainer, termRange.startOffset);
			}
			else {
				aRangeSet.startPoint.setEnd(termRange.endContainer, termRange.endOffset);
			}
			aRangeSet.startPoint.collapse(false);
		}
		if (termRange) termRange.detach();
		return uriRanges;
	},
	_containsRange : function(aBase, aTarget, aStrict)
	{/* nsIDOMRangeのcompareBoundaryPointsを使うと、テキスト入力欄内のRangeの比較時に
	    NS_ERROR_DOM_WRONG_DOCUMENT_ERR例外が発生してしまうので、代わりに
	    nsIDOMNSRangeのcomparePointを使う */
		return 	aStrict ?
			(
				(aBase.comparePoint(aTarget.startContainer, aTarget.startOffset) == 0 &&
				 aBase.comparePoint(aTarget.endContainer, aTarget.endOffset) == 0) ||
				(aTarget.comparePoint(aBase.startContainer, aBase.startOffset) == 0 &&
				 aTarget.comparePoint(aBase.endContainer, aBase.endOffset) == 0)
			) :
			(
				aBase.comparePoint(aTarget.startContainer, aTarget.startOffset) == 0 ||
				aBase.comparePoint(aTarget.endContainer, aTarget.endOffset) == 0 ||
				aTarget.comparePoint(aBase.startContainer, aBase.startOffset) == 0 ||
				aTarget.comparePoint(aBase.endContainer, aBase.endOffset) == 0
			);
	},
	_compareRangePosition : function(aA, aB)
	{
		return aB.range.comparePoint(aA.range.startContainer, aA.range.startOffset);
	},
	
	getFindRange : function(aBaseRange) 
	{
		var findRange = aBaseRange.cloneRange();

		if (this.getEditableFromChild(findRange.startContainer)) {
			let root = TextLinkUtils.evaluateXPath(
					'ancestor-or-self::node()[parent::*['+INPUT_FIELD_CONDITITON+']]',
					findRange.startContainer,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			// setStartBefore causes error...
			findRange.setStart(TextLinkUtils.evaluateXPath(
					'preceding-sibling::node()[1]',
					root,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue || root, 0);
			findRange.setEndAfter(TextLinkUtils.evaluateXPath(
					'(child::node()[last()] | following-sibling::node()[last()])[1]',
					root,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue || root);
			return findRange;
		}

		var expandToBefore = aBaseRange.collapsed;
		var expandToAfter  = aBaseRange.collapsed;
		if (!aBaseRange.collapsed) {
			let string = aBaseRange.toString();
			expandToBefore = TextLinkUtils.getURIPartFromStart(string);
			expandToAfter  = TextLinkUtils.getURIPartFromEnd(string);
		}
		if (expandToBefore)
			this._expandURIRangeToBefore(findRange);
		if (expandToAfter)
			this._expandURIRangeToAfter(findRange);

		return findRange;
	},
	_expandURIRangeToBefore : function(aRange)
	{
		var expandRange = aRange.cloneRange();
		expandRange.selectNode(aRange.startContainer);
		expandRange.setEnd(aRange.startContainer, aRange.startOffset);

		var node   = aRange.startContainer;
		var offset = aRange.startOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this._getFirstTextNodeFromRange(aRange);
			offset = 0;
		}
		var baseBlock = this._getParentBlock(node);
		var nodes = TextLinkUtils.evaluateXPath(
				'preceding::text()[not('+IGNORE_TEXT_CONDITION+')]',
				node
			);
		var i = nodes.snapshotLength-1,
			lastNode;
		while (node)
		{
			lastNode = node;
			if (this._getParentBlock(lastNode) != baseBlock) break;
			expandRange.setStart(lastNode, 0);
			let string = expandRange.toString();
			let part = TextLinkUtils.getURIPartFromEnd(string);
			if (!part.length) break;
			if (
				part.length < string.length ||
				(part.length == string.length && i == -1)
				) {
				offset = (expandRange.startContainer == aRange.startContainer ? string : expandRange.startContainer.textContent ).length - part.length;
				break;
			}
			if (i == -1) break;
			node = nodes.snapshotItem(i--);
			if (!node) break;
			offset = node.textContent.length;
			expandRange.selectNode(node);
		}
		if (
			lastNode &&
			(lastNode != aRange.startContainer || offset != aRange.startOffset)
			) {
			aRange.setStart(lastNode, offset);
		}

		expandRange.detach();
	},
	_expandURIRangeToAfter : function(aRange, aRanges)
	{
		var expandRange = aRange.cloneRange();
		expandRange.collapse(false);

		var node   = aRange.endContainer;
		var offset = aRange.endOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this._getLastTextNodeFromRange(aRange);
			offset = node && node.textContent.length || 0 ;
		}
		var baseBlock = this._getParentBlock(node);
		var nodes = TextLinkUtils.evaluateXPath(
				'following::text()[not('+IGNORE_TEXT_CONDITION+')]',
				node
			);
		var i = 0,
			maxi = nodes.snapshotLength,
			headPartIsFound = aRanges && TextLinkUtils.isHeadOfNewURI(aRange.toString()),
			lastNode;
		while (node)
		{
			lastNode = node;
			if (this._getParentBlock(lastNode) != baseBlock) break;
			expandRange.setEnd(lastNode, lastNode.textContent.length);
			if (expandRange.startContainer.nodeType == Node.ELEMENT_NODE) {
				// Edge case workaround:
				//   When a range starts with a text node and the text is a
				//   child of an element node, Gecko automatically changes the
				//   start point, for example:
				//
				//     <div>foobar<br/>[example]</div>
				//       startContainer: text(example)
				//       startOffset:    0
				//     => 
				//       startContainer: div
				//       startOffset:    2
				//
				//   However, this method expects that the start container is
				//   a text node. So, we have to revert the change manually.
				expandRange.setStart(this._getFirstTextNodeFromRange(expandRange), 0);
			}
			let string = expandRange.toString();
			let delta = 0;
			if (TextLinkUtils.multilineURIEnabled) {
				let originalString = string;
				string = string.replace(/^[\n\r]+|[\n\r]+$/g, '');
				delta = originalString.indexOf(string);

				originalString = string;
				string = string.replace(TextLinkUtils.URIExceptionPattern_start, '');
				if (originalString.indexOf(string) != 0) {
					string = '';
					delta = 0;
				}
			}
			if (!TextLinkUtils.multilineURIEnabled || string) {
				let part = TextLinkUtils.getURIPartFromStart(string, headPartIsFound);
				if (!part.length) break;
				let partRange;
				if (aRanges) {
					if (!headPartIsFound && TextLinkUtils.isHeadOfNewURI(part)) headPartIsFound = true;
					partRange = expandRange.cloneRange();
					aRanges.push(partRange);
					partRange.setStart(lastNode, partRange.startOffset + delta);
					partRange.setEnd(lastNode, partRange.startOffset + part.length);
				}
				if (
					part.length < string.length ||
					(part.length == string.length && i == maxi)
					) {
					offset = expandRange.startOffset + part.length + delta;
					if (aRanges) {
						partRange.setEnd(lastNode, offset);
					}
					break;
				}
			}
			if (i == maxi) break;
			node = nodes.snapshotItem(i++);
			if (!node) break;
			offset = 0;
			expandRange.selectNode(node);
		}
		if (
			!aRanges &&
			lastNode &&
			(lastNode != aRange.endContainer || offset != aRange.endOffset)
			) {
			aRange.setEnd(lastNode, offset);
		}

		expandRange.detach();
	},
	_getFirstTextNodeFromRange : function(aRange)
	{
		return TextLinkUtils.evaluateXPath(
				'descendant-or-self::text()[not('+IGNORE_TEXT_CONDITION+')][1]',
				aRange.startContainer.childNodes.item(aRange.startOffset) || aRange.startContainer.firstChild,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
	_getLastTextNodeFromRange : function(aRange)
	{
		return TextLinkUtils.evaluateXPath(
				'descendant-or-self::text()[not('+IGNORE_TEXT_CONDITION+')][last()]',
				aRange.endContainer.childNodes.item(aRange.endOffset) || aRange.endContainer.lastChild,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
	_getParentBlock : function(aNode)
	{
		if (!aNode) return null;
		var win = aNode.ownerDocument.defaultView;
		if (aNode.nodeType != Node.ELEMENT_NODE) aNode = aNode.parentNode;
		while (aNode)
		{
			let display = win.getComputedStyle(aNode, null).getPropertyValue('display');
			if (display != 'inline') break;
			aNode = aNode.parentNode;
		}
		return aNode;
	},
  
	getSelectionURIRanges : function(aFrameOrEditable, aMode, aStrict, aExceptionsHash, aContinuationChecker) 
	{
		if (!aMode) aMode = this.FIND_ALL;

		var iterator = this.getURIRangesIterator(aFrameOrEditable, aMode, aStrict, aExceptionsHash, aContinuationChecker);
		var ranges = [];
		var self = this;
		return new Promise(function(aResolve, aReject) {
				var timer = setInterval(function() {
					try {
						if (aContinuationChecker && typeof aContinuationChecker == 'function')
							aContinuationChecker();
						var start = Date.now();
						do {
							ranges.push(iterator.next());
						} while (Date.now() - start < 20);
					}
					catch(error) {
						clearInterval(timer);
						aReject(error);
					}
				}, 200);
			})
			.catch(function(aError) {
				if (!(aError instanceof StopIteration)) {
					Components.utils.reportError(aError);
					throw aError;
				}
			})
			.then(function() {
				if (aContinuationChecker && typeof aContinuationChecker == 'function')
					aContinuationChecker();
				if (aMode & self.FIND_ALL)
					ranges.sort(self._compareRangePosition);
				return ranges;
			});
	},
	
	getFirstSelectionURIRange : function(aFrameOrEditable, aStrict, aExceptionsHash, aContinuationChecker) 
	{
		return this.getSelectionURIRanges(aFrameOrEditable, this.FIND_FIRST, aStrict, aExceptionsHash, aContinuationChecker)
				.then(function(aRanges) {
					return aRanges.length ? aRanges[0] : null ;
				});
	},
 
	getLastSelectionURIRange : function(aFrameOrEditable, aStrict, aExceptionsHash, aContinuationChecker) 
	{
		return this.getSelectionURIRanges(aFrameOrEditable, this.FIND_LAST, aStrict, aExceptionsHash, aContinuationChecker)
				.then(function(aRanges) {
					return aRanges.length ? aRanges[0] : null ;
				});
	},
 
	getURIRangesFromRange : function(aBaseRange, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode) aMode = this.FIND_ALL;

		var iterator = this.getURIRangesIteratorFromRange(aBaseRange, aMode, aStrict, aExceptionsHash);
		var ranges = [];
		var self = this;
		return new Promise(function(aResolve, aReject) {
				var timer = setInterval(function() {
					try {
						var start = Date.now();
						do {
							ranges.push(iterator.next());
						} while (Date.now() - start < 20);
					}
					catch(error) {
						clearInterval(timer);
						aReject(error);
					}
				}, 200);
			})
			.catch(function(aError) {
				if (aError.message == self.ERRROR_NO_URI_RANGE)
					return true;
				if (!(aError instanceof StopIteration)) {
					Components.utils.reportError(aError);
					throw aError;
				}
				return false;
			})
			.then(function(aCanceled) {
				if (aCanceled) return [];

				if (aMode & self.FIND_ALL) {
					ranges.sort(self._compareRangePosition);
				}
				return ranges;
			});
	},
  
	shrinkURIRange : function(aRange) 
	{
		// 強制改行以降を切り落とす
		var nodes = TextLinkUtils.evaluateXPath(
				'following::*[local-name()="br" or local-name()="BR"] | '+
				'descendant-or-self::*[local-name()="br" or local-name()="BR"]',
				aRange.startContainer
			);
		var br;
		/* nsIDOMRangeのcompareBoundaryPointsを使うと、テキスト入力欄内のRangeの比較時に
		   NS_ERROR_DOM_WRONG_DOCUMENT_ERR例外が発生してしまうので、代わりに
		   nsIDOMNSRangeのcomparePointを使う */
		for (var i = 0, maxi = nodes.snapshotLength; i < maxi; i++)
		{
			br = nodes.snapshotItem(i);
			if (aRange.comparePoint(br, 0) < 0) { // before
				continue;
			}
			else if (aRange.comparePoint(br, 0) > 0) { // after
				break;
			}
			aRange.setEndBefore(br);
			break;
		}

		return aRange;
	},
 
	getFollowingURIPartRanges : function(aRange) 
	{
		var ranges = [];
		if (TextLinkUtils.multilineURIEnabled) {
			this._expandURIRangeToAfter(aRange, ranges);
		}
		return ranges;
	}
  
}; 
  
