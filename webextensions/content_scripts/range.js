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

  if (node.offsetParent &&
      /^inline/.test(window.getComputedStyle(node.offsetParent, null).display))
    return {
      text:  '',
      state: STATE_CONTINUE_VISUALLY,
    };

  return {
    text:  '\n',
    state: STATE_SEPARATED,
  };
}

function getPrecedingRanges(sourceRange) {
  const texts  = [];
  const ranges = [];
  const boundaryInlineNodes = [];
  const range = document.createRange();
  range.setStart(sourceRange.startContainer, sourceRange.startOffset);
  range.setEnd(sourceRange.startContainer, sourceRange.startOffset);
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
  return { texts, ranges, boundaryInlineNodes };
}

function getFollowingRanges(sourceRange) {
  const texts  = [];
  const ranges = [];
  const boundaryInlineNodes = [];
  const range = document.createRange();
  range.setStart(sourceRange.endContainer, sourceRange.endOffset);
  range.setEnd(sourceRange.endContainer, sourceRange.endOffset);
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
  return { texts, ranges, boundaryInlineNodes };
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
  do {
    if (node.nodeType != Node.ELEMENT_NODE)
      break;
    const style = window.getComputedStyle(node, null);
    if (style.display == 'none' ||
        /^(collapse|hidden)$/.test(style.visibility))
      return false;
  } while (node = node.parentNode);
  return true;
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
