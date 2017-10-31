/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

function rangeToText(aRange) {
  var walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.startContainer;
  var result = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE) {
    let text = walker.currentNode.nodeValue;
    if (walker.currentNode == aRange.endContainer)
      text = text.substring(0, aRange.endOffset);
    text = text.substring(aRange.startOffset);
    result += text;
  }

  while (walker.nextNode()) {
    let node = walker.currentNode;
    let position = aRange.endContainer.compareDocumentPosition(node);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING &&
        !(position & Node.DOCUMENT_POSITION_CONTAINED_BY))
      break;
    if (node == aRange.endContainer) {
      if (node.nodeType == Node.TEXT_NODE) {
        let text = node.nodeValue.substring(0, aRange.endOffset);
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
  var range = document.createRange();
  range.setStart(aRange.startContainer, aRange.startOffset);
  range.setEnd(aRange.startContainer, aRange.startOffset);
  var walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.startContainer;
  var text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE)
    text += walker.currentNode.nodeValue.substring(0, aRange.startOffset);
  else
    walker.currentNode = walker.currentNode.childNodes[aRange.startOffset];
  while (walker.previousNode()) {
    range.setStartBefore(walker.currentNode);
    let partialText = nodeToText(walker.currentNode);
    if (partialText.indexOf('\n') > -1) {
      break;
    }
    text = `${partialText}${text}`;
  }
  return { range, text };
}

function getFollowingRange(aRange) {
  var range = document.createRange();
  range.setStart(aRange.endContainer, aRange.endOffset);
  range.setEnd(aRange.endContainer, aRange.endOffset);
  var walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.endContainer;
  var text = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE)
    text += walker.currentNode.nodeValue.substring(aRange.endOffset);
  else
    walker.currentNode = walker.currentNode.childNodes[aRange.endOffset];
  while (walker.nextNode()) {
    range.setEndAfter(walker.currentNode);
    let partialText = nodeToText(walker.currentNode);
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
    let style = window.getComputedStyle(aNode, null);
    if (style.display == 'none' ||
        /^(collapse|hidden)$/.test(style.visibility))
      return false;
  } while (aNode = aNode.parentNode);
  return true;
}
