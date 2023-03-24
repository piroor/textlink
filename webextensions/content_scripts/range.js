/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

const STATE_CONTINUE_PHYSICALLY = 1 << 0;
const STATE_CONTINUE_VISUALLY   = 1 << 1;
const STATE_SEPARATED           = 1 << 2;

function rangeToText(range) {
  const walker = createVisibleTextNodeWalker();
  walker.currentNode = range.startContainer;
  let result = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    let text = walker.currentNode.nodeValue;
    if (walker.currentNode == range.endContainer)
      text = text.substring(0, range.endOffset);
    text = text.substring(range.startOffset);
    result += text;
  }

  const boundaryInlineNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const position = range.endContainer.compareDocumentPosition(node);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING &&
        !(position & Node.DOCUMENT_POSITION_CONTAINED_BY))
      break;
    if (node == range.endContainer) {
      if (node.nodeType == Node.TEXT_NODE) {
        const text = node.nodeValue.substring(0, range.endOffset);
        result += text;
      }
      break;
    }
    const { text, state } = nodeToText(node);
    result += text;
    if (state == STATE_CONTINUE_VISUALLY)
      boundaryInlineNodes.push(node.offsetParent);
  }

  return {
    text: result, // .replace(/\n\s*|\s*\n/g, '\n')
    boundaryInlineNodes,
  };
}

function nodeToText(node) {
  if (node.nodeType != Node.ELEMENT_NODE)
    return {
      text:  node.nodeValue,
      state: STATE_CONTINUE_PHYSICALLY,
    };

  if (/^br$/i.test(String(node.localName)))
    return {
      text: '\n',
      state: STATE_SEPARATED,
    };

  if (/^inline/.test(window.getComputedStyle(node, null).display))
    return {
      text:  '',
      state: STATE_CONTINUE_PHYSICALLY,
    };


  // We should treat inline-* block as virtual inline node, only when it is visually inline really.
  // For example, if it is a inlie-block but has 100% width of its container, it may not look as an inline block.
  // See also: https://github.com/piroor/textlink/issues/80
  const offsetParent = node.offsetParent;
  const containerWidth = offsetParent && parseFloat(window.getComputedStyle(findNearestContainerElement(offsetParent), null).width);
  if (offsetParent &&
      isInline(offsetParent, { containerWidth }) &&
      (isInline(findEffectivePreviousSibling(offsetParent), { containerWidth }) ||
       isInline(findEffectiveNextSibling(offsetParent), { containerWidth }) ||
       isInline(offsetParent.parentNode, { containerWidth })))
    return {
      text:  '',
      state: STATE_CONTINUE_VISUALLY,
    };

  return {
    text:  '\n',
    state: STATE_SEPARATED,
  };
}

function isInline(node, { containerWidth } = {}) {
  if (!node)
    return false;

  if (node.nodeType == Node.TEXT_NODE)
    return true;

  if (node.nodeType != Node.ELEMENT_NODE)
    return false;

  const display = window.getComputedStyle(node, null).display;
  if (display == 'inline' || !containerWidth)
    return true;

  return /^inline-/.test(display) && (node.getBoundingClientRect().width < containerWidth);
}

function findEffectivePreviousSibling(node) {
  if (!node)
    return null;

  const sibling = node.previousSibling;
  switch (sibling.nodeType) {
    case Node.TEXT_NODE:
      if (sibling.nodeValue.trim() == '')
        return findEffectivePreviousSibling(sibling);
      break;

    case Node.ELEMENT_NODE:
      return sibling;

    default:
      return findEffectivePreviousSibling(sibling);
  }
}

function findEffectiveNextSibling(node) {
  if (!node)
    return null;

  const sibling = node.nextSibling;
  switch (sibling.nodeType) {
    case Node.TEXT_NODE:
      if (sibling.nodeValue.trim() == '')
        return findEffectiveNextSibling(sibling);
      break;

    case Node.ELEMENT_NODE:
      return sibling;

    default:
      return findEffectiveNextSibling(sibling);
  }
}

function getPrecedingRanges(sourceRange) {
  const texts  = [];
  const ranges = [];
  const boundaryInlineNodes = [];
  const range = document.createRange();
  range.setStart(sourceRange.startContainer, sourceRange.startOffset);
  range.setEnd(sourceRange.startContainer, sourceRange.startOffset);

  const scanningBoundaryPoint = range.cloneRange();
  scanningBoundaryPoint.selectNodeContents(findNearestContainerElement(sourceRange.startContainer));
  scanningBoundaryPoint.collapse(true);
  const scanningRange = range.cloneRange();

  const walker = createVisibleTextNodeWalker();
  walker.currentNode = range.startContainer;
  let text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    text += walker.currentNode.nodeValue.substring(0, range.startOffset);
  }
  else {
    const previousNode = walker.currentNode.childNodes[range.startOffset];
    if (previousNode)
      walker.currentNode = previousNode;
  }
  while (walker.previousNode()) {
    // We should accept text nodes in the same container.
    scanningRange.selectNode(walker.currentNode);
    if (scanningRange.compareBoundaryPoints(Range.START_TO_END, scanningBoundaryPoint) <= 0) {
      //console.log('getPrecedingRanges: reached to the boundary', { container: scanningBoundaryPoint.startContainer, current: walker.currentNode });
      break;
    }

    if (walker.currentNode.nodeType == Node.TEXT_NODE) {
      range.setStart(walker.currentNode, 0);
    }
    else {
      range.setStartBefore(walker.currentNode);
    }
    const { text: partialText, state } = nodeToText(walker.currentNode);
    switch (state) {
      case STATE_CONTINUE_PHYSICALLY:
        text = `${partialText}${text}`;
        continue;

      case STATE_CONTINUE_VISUALLY:
        texts.unshift(text);
        ranges.unshift(range.cloneRange());
        boundaryInlineNodes.unshift(walker.currentNode.offsetParent);
        text = partialText;
        range.collapse(true);
        continue;

      case STATE_SEPARATED:
        break;
    }
  }
  texts.unshift(text);
  ranges.unshift(range);

  scanningBoundaryPoint.detach();
  scanningRange.detach();

  return { texts, ranges, boundaryInlineNodes };
}

function getFollowingRanges(sourceRange) {
  const texts  = [];
  const ranges = [];
  const boundaryInlineNodes = [];
  const range = document.createRange();
  range.setStart(sourceRange.endContainer, sourceRange.endOffset);
  range.setEnd(sourceRange.endContainer, sourceRange.endOffset);

  const scanningBoundaryPoint = range.cloneRange();
  scanningBoundaryPoint.selectNodeContents(findNearestContainerElement(sourceRange.endContainer));
  scanningBoundaryPoint.collapse(false);
  const scanningRange = range.cloneRange();

  const walker = createVisibleTextNodeWalker();
  walker.currentNode = range.endContainer;
  let text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    text += walker.currentNode.nodeValue.substring(range.endOffset);
  }
  else {
    const nextNode = walker.currentNode.childNodes[range.endOffset];
    if (nextNode)
      walker.currentNode = nextNode;
  }
  while (walker.nextNode()) {
    // We should accept text nodes in the same container.
    scanningRange.selectNode(walker.currentNode);
    if (scanningRange.compareBoundaryPoints(Range.END_TO_START, scanningBoundaryPoint) >= 0) {
      //console.log('getFollowingRanges: reached to the boundary', { container: scanningBoundaryPoint.endContainer, current: walker.currentNode });
      break;
    }

    if (walker.currentNode.nodeType == Node.TEXT_NODE) {
      range.setEnd(walker.currentNode, walker.currentNode.nodeValue.length);
    }
    else {
      range.setEndAfter(walker.currentNode);
    }
    const { text: partialText, state } = nodeToText(walker.currentNode);
    switch (state) {
      case STATE_CONTINUE_PHYSICALLY:
        text += partialText;
        continue;

      case STATE_CONTINUE_VISUALLY:
        texts.push(text);
        ranges.push(range.cloneRange());
        boundaryInlineNodes.push(walker.currentNode.offsetParent);
        text = partialText;
        range.collapse(false);
        continue;

      case STATE_SEPARATED:
        break;
    }
  }
  texts.push(text);
  ranges.push(range);

  scanningBoundaryPoint.detach();
  scanningRange.detach();

  return { texts, ranges, boundaryInlineNodes };
}

let nodeVisibilityCache;
function clearNodeVisibilityCache() {
  nodeVisibilityCache = null;
}

function createVisibleTextNodeWalker() {
  return document.createTreeWalker(
    document,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    { acceptNode: (node) =>
      isNodeVisible(node) ?
        NodeFilter.FILTER_ACCEPT :
        NodeFilter.FILTER_REJECT },
    false
  );
}

function isNodeVisible(node) {
  if (node.nodeType == Node.TEXT_NODE)
    node = node.parentNode;

  if (!nodeVisibilityCache)
    nodeVisibilityCache = new WeakMap();
  if (nodeVisibilityCache.has(node))
    return nodeVisibilityCache.get(node);

  // We should return earlier if the node is certainly invisible,
  // because getClientRects and elementsFromPointElements are slow.
  if (node.offsetWidth == 0 || node.offsetHeight == 0) {
    nodeVisibilityCache.set(node, false);
    return false;
  }

  const rects = node.getClientRects();
  if (rects.length == 0) {
    nodeVisibilityCache.set(node, false);
    return false;
  }

  const rect = rects[0];
  // elementsFromPointElements doesn't list "visibility: hidden" elements,
  // so we don't need to do double-check with computed style.
  const visibleElements = document.elementsFromPoint(rect.left, rect.top);
  const hit = new Set(visibleElements).has(node);
  nodeVisibilityCache.set(node, hit);
  return hit;
}


// returns rangeData compatible object
// See also: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/find/find
function getRangeData(range) {
  let startContainer = range.startContainer;
  let startOffset    = range.startOffset;
  let endContainer   = range.endContainer;
  let endOffset      = range.endOffset;
  if (startContainer.nodeType != Node.TEXT_NODE) {
    const possibleStartContainer = startContainer.childNodes[startOffset];
    startContainer = evaluateXPath(
      `self::text() || following::text()[1]`,
      possibleStartContainer,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue || possibleStartContainer;
    startOffset = 0;
  }
  if (endContainer.nodeType != Node.TEXT_NODE) {
    let possibleEndContainer = endContainer.childNodes[Math.max(0, endOffset - 1)];
    if (possibleEndContainer.nodeType != Node.TEXT_NODE) {
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false);
      walker.currentNode = possibleEndContainer;
      possibleEndContainer = walker.previousNode();
    }
    endContainer = possibleEndContainer;
    endOffset    = endContainer.nodeValue.length;
  }
  return {
    startTextNodePos: getTextNodePosition(startContainer),
    startOffset:      startOffset,
    endTextNodePos:   getTextNodePosition(endContainer),
    endOffset:        endOffset
  };
}

function getFieldRangeData(field) {
  return {
    text:        field.value,
    startOffset: field.selectionStart,
    endOffset:   field.selectionEnd
  };
}

function selectRanges(ranges) {
  if (!Array.isArray(ranges))
    ranges = [ranges];

  if (ranges.length == 0)
    return;

  gChangingSelectionRangeInternally++;
  setTimeout(() => {
    gChangingSelectionRangeInternally--;
  }, 100);

  if ('fieldNodePos' in ranges[0]) {
    // fake, text ranges
    const field = getFieldNodeAt(ranges[0].fieldNodePos);
    if (!field)
      return;
    field.setSelectionRange(
      ranges[0].startOffset,
      ranges[ranges.length - 1].endOffset
    );
    field.focus();
    return;
  }

  // ranges
  const selection = window.getSelection();
  selection.removeAllRanges();
  for (let range of ranges) {
    range = createRangeFromRangeData(range);
    selection.addRange(range);
  }
}

function getTextNodePosition(node) {
  return evaluateXPath(
    'count(preceding::text())',
    node,
    XPathResult.NUMBER_TYPE
  ).numberValue;
}

function findNearestContainerElement(node) {
  let container = node;
  if (container.nodeType != Node.ELEMENT_NODE)
    container = container.parentNode;
  while (container &&
         /^inline/.test(window.getComputedStyle(container, null).display)) {
    container = container.parentNode;
  }

  if (node.offsetParent &&
      container.contains(node.offsetParent))
    return node.offsetParent;

  return container;
}

const kINPUT_TEXT_CONDITION = `${toLowerCase('local-name()')} = "input" and ${toLowerCase('@type')} = "text"`;
const kTEXT_AREA_CONDITION  = `${toLowerCase('local-name()')} = "textarea"`;
var kFIELD_CONDITION      = `(${kINPUT_TEXT_CONDITION}) or (${kTEXT_AREA_CONDITION})`;

function getFieldNodePosition(node) {
  return evaluateXPath(
    `count(preceding::*[${kFIELD_CONDITION}])`,
    node,
    XPathResult.NUMBER_TYPE
  ).numberValue;
}

function createRangeFromRangeData(data) {
  const range = document.createRange();
  range.setStart(getTextNodeAt(data.startTextNodePos), data.startOffset);
  range.setEnd(getTextNodeAt(data.endTextNodePos), data.endOffset);
  return range;
}

function getTextNodeAt(position) {
  return evaluateXPath(
    `descendant::text()[position()=${position+1}]`,
    document,
    XPathResult.FIRST_ORDERED_NODE_TYPE
  ).singleNodeValue;
}

function getFieldNodeAt(position) {
  return evaluateXPath(
    `descendant::*[${kFIELD_CONDITION}][position()=${position+1}]`,
    document,
    XPathResult.FIRST_ORDERED_NODE_TYPE
  ).singleNodeValue;
}
