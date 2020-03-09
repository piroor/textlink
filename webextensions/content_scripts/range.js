/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

function rangeToText(aRange) {
  const walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.startContainer;
  let result = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    let text = walker.currentNode.nodeValue;
    if (walker.currentNode == aRange.endContainer)
      text = text.substring(0, aRange.endOffset);
    text = text.substring(aRange.startOffset);
    result += text;
  }

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const position = aRange.endContainer.compareDocumentPosition(node);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING &&
        !(position & Node.DOCUMENT_POSITION_CONTAINED_BY))
      break;
    if (node == aRange.endContainer) {
      if (node.nodeType == Node.TEXT_NODE) {
        const text = node.nodeValue.substring(0, aRange.endOffset);
        result += text;
      }
      break;
    }
    result += nodeToText(node);
  }

  return result; // .replace(/\n\s*|\s*\n/g, '\n');
}

function nodeToText(aNode) {
  if (aNode.nodeType == Node.ELEMENT_NODE) {
    if (/^br$/i.test(String(aNode.localName)) ||
        !/^inline/.test(window.getComputedStyle(aNode, null).display))
      return '\n';
    return '';
  }
  return aNode.nodeValue;
}

function getPrecedingRange(aRange) {
  const range = document.createRange();
  range.setStart(aRange.startContainer, aRange.startOffset);
  range.setEnd(aRange.startContainer, aRange.startOffset);
  const walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.startContainer;
  let text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    text += walker.currentNode.nodeValue.substring(0, aRange.startOffset);
  }
  else {
    const previousNode = walker.currentNode.childNodes[aRange.startOffset];
    if (previousNode)
      walker.currentNode = previousNode;
  }
  while (walker.previousNode()) {
    if (walker.currentNode.nodeType == Node.TEXT_NODE) {
      range.setStart(walker.currentNode, 0);
    }
    else {
      range.setStartBefore(walker.currentNode);
    }
    const partialText = nodeToText(walker.currentNode);
    if (partialText.indexOf('\n') > -1) {
      break;
    }
    text = `${partialText}${text}`;
  }
  return { range, text };
}

function getFollowingRange(aRange) {
  const range = document.createRange();
  range.setStart(aRange.endContainer, aRange.endOffset);
  range.setEnd(aRange.endContainer, aRange.endOffset);
  const walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.endContainer;
  let text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    text += walker.currentNode.nodeValue.substring(aRange.endOffset);
  }
  else {
    const nextNode = walker.currentNode.childNodes[aRange.endOffset];
    if (nextNode)
      walker.currentNode = nextNode;
  }
  while (walker.nextNode()) {
    if (walker.currentNode.nodeType == Node.TEXT_NODE) {
      range.setEnd(walker.currentNode, walker.currentNode.nodeValue.length);
    }
    else {
      range.setEndAfter(walker.currentNode);
    }
    const partialText = nodeToText(walker.currentNode);
    if (partialText.indexOf('\n') > -1)
      break;
    text += partialText;
  }
  return { range, text };
}

function createVisibleTextNodeWalker() {
  return document.createTreeWalker(
    document,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    { acceptNode: (aNode) =>
      isNodeVisible(aNode) ?
        NodeFilter.FILTER_ACCEPT :
        NodeFilter.FILTER_REJECT },
    false
  );
}

function isNodeVisible(aNode) {
  if (aNode.nodeType == Node.TEXT_NODE)
    aNode = aNode.parentNode;
  do {
    if (aNode.nodeType != Node.ELEMENT_NODE)
      break;
    const style = window.getComputedStyle(aNode, null);
    if (style.display == 'none' ||
        /^(collapse|hidden)$/.test(style.visibility))
      return false;
  } while (aNode = aNode.parentNode);
  return true;
}


// returns rangeData compatible object
// See also: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/find/find
function getRangeData(aRange) {
  let startContainer = aRange.startContainer;
  let startOffset    = aRange.startOffset;
  let endContainer   = aRange.endContainer;
  let endOffset      = aRange.endOffset;
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

function getFieldRangeData(aField) {
  return {
    text:        aField.value,
    startOffset: aField.selectionStart,
    endOffset:   aField.selectionEnd
  };
}

function selectRanges(aRanges) {
  if (!Array.isArray(aRanges))
    aRanges = [aRanges];

  if (aRanges.length == 0)
    return;

  gChangingSelectionRangeInternally++;
  setTimeout(() => {
    gChangingSelectionRangeInternally--;
  }, 100);

  if ('fieldNodePos' in aRanges[0]) {
    // fake, text ranges
    const field = getFieldNodeAt(aRanges[0].fieldNodePos);
    if (!field)
      return;
    field.setSelectionRange(
      aRanges[0].startOffset,
      aRanges[aRanges.length - 1].endOffset
    );
    field.focus();
    return;
  }

  // ranges
  const selection = window.getSelection();
  selection.removeAllRanges();
  for (let range of aRanges) {
    range = createRangeFromRangeData(range);
    selection.addRange(range);
  }
}

function getTextNodePosition(aNode) {
  return evaluateXPath(
    'count(preceding::text())',
    aNode,
    XPathResult.NUMBER_TYPE
  ).numberValue;
}

const kINPUT_TEXT_CONDITION = `${toLowerCase('local-name()')} = "input" and ${toLowerCase('@type')} = "text"`;
const kTEXT_AREA_CONDITION  = `${toLowerCase('local-name()')} = "textarea"`;
var kFIELD_CONDITION      = `(${kINPUT_TEXT_CONDITION}) or (${kTEXT_AREA_CONDITION})`;

function getFieldNodePosition(aNode) {
  return evaluateXPath(
    `count(preceding::*[${kFIELD_CONDITION}])`,
    aNode,
    XPathResult.NUMBER_TYPE
  ).numberValue;
}

function createRangeFromRangeData(aData) {
  const range = document.createRange();
  range.setStart(getTextNodeAt(aData.startTextNodePos), aData.startOffset);
  range.setEnd(getTextNodeAt(aData.endTextNodePos), aData.endOffset);
  return range;
}

function getTextNodeAt(aPosition) {
  return evaluateXPath(
    `descendant::text()[position()=${aPosition+1}]`,
    document,
    XPathResult.FIRST_ORDERED_NODE_TYPE
  ).singleNodeValue;
}

function getFieldNodeAt(aPosition) {
  return evaluateXPath(
    `descendant::*[${kFIELD_CONDITION}][position()=${aPosition+1}]`,
    document,
    XPathResult.FIRST_ORDERED_NODE_TYPE
  ).singleNodeValue;
}
