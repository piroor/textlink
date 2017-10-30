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
        /^inline/.test(window.getComputedStyle(aNode, null).display))
      return '\n';
    return '';
  }
  return aNode.nodeValue;
}

function getPrecedingTextFromRange(aRange) {
  var walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.startContainer;
  var result = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE)
    result += walker.currentNode.nodeValue.substring(0, aRange.startOffset);
  while (walker.previousNode()) {
    let text = nodeToText(walker.currentNode);
    if (text.indexOf('\n') > -1)
      break;
    result += text;
  }
  return result;
}

function getFollowingTextFromRange(aRange) {
  var walker = createVisibleTextNodeWalker();
  walker.currentNode = aRange.endContainer;
  var result = '';
  if (walker.currentNode.nodeType == Node.TEXT_NODE)
    result += walker.currentNode.nodeValue.substring(aRange.endOffset);
  while (walker.nextNode()) {
    let text = nodeToText(walker.currentNode);
    if (text.indexOf('\n') > -1)
      break;
    result += text;
  }
  return result;
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
