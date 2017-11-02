/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'content';

var gTryingAction = false;
var gLastActionResult = null;
var gMatchAllProgress = 0;

async function onDblClick(aEvent) {
  if (aEvent.target.ownerDocument != document)
    return;
  var data = getSelectionEventData(aEvent);
  if (!data)
    return;
  gTryingAction = true;
  gLastActionResult = null;
  var textFieldSelection = isInputField(aEvent.target);
  gLastActionResult = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
  if (textFieldSelection &&
      gLastActionResult &&
      gLastActionResult.range)
    gLastActionResult.range.fieldNodePos = getFieldNodePosition(aEvent.target);
  postAction(gLastActionResult);
  await wait(500);
  gTryingAction = false;
}

async function onKeyPress(aEvent) {
  if (aEvent.target.ownerDocument != document)
    return;
  var data = getSelectionEventData(aEvent);
  if (!data)
    return;
  gTryingAction = true;
  gLastActionResult = null;
  var textFieldSelection = isInputField(aEvent.target);
  gLastActionResult = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
  if (textFieldSelection &&
      gLastActionResult &&
      gLastActionResult.range)
    gLastActionResult.range.fieldNodePos = getFieldNodePosition(aEvent.target);
  postAction(gLastActionResult);
  gTryingAction = false;
}

function postAction(aResult) {
  if (!aResult)
    return;

  if (aResult.action & kACTION_COPY)
    doCopy(aResult.uri);
  if (aResult.range)
    selectRanges(aResult.range);
}

function doCopy(aText) {
  var field = document.createElement('textarea');
  field.value = aText;
  document.body.appendChild(field);
  field.style.position = 'fixed';
  field.style.opacity = 0;
  field.style.pointerEvents = 'none';
  field.focus();
  field.select();
  document.execCommand('copy');
  field.parentNode.removeChild(field);
}


var gLastSelection = '';
var gFindingURIRanges = false;
var gLastSelectionChangeAt = 0;
var gLastURIRanges = Promise.resolve([]);
var gSelectionURIRanges = false;

async function onSelectionChange(aEvent) {
  if (gSelectionURIRanges)
    return;

  var changedAt = gLastSelectionChangeAt = Date.now();
  if (findURIRanges.delayed)
    clearTimeout(findURIRanges.delayed);

  await wait(200);
  if (changedAt != gLastSelectionChangeAt)
    return;

  if (gTryingAction) {
    while (gTryingAction) {
      await wait(500);
    }
    if (changedAt != gLastSelectionChangeAt)
      return;
    if (gLastActionResult) {
      gLastURIRanges = Promise.resolve([gLastActionResult]);
      return;
    }
  }

  if (isInputField(aEvent.target))
    onTextFieldSelectionChanged(aEvent.target);
  else
    onSelectionRangeChanged();
}

function onTextFieldSelectionChanged(aField) {
  var selectionRange = getFieldRangeData(aField);

  gLastSelection    = selectionRange.text.substring(selectionRange.startOffset, selectionRange.endOffset);
  gFindingURIRanges = true;

  browser.runtime.sendMessage({
    type: kNOTIFY_READY_TO_FIND_URI_RANGES
  });
  gLastURIRanges = new Promise(async (aResolve, aReject) => {
    var ranges = await browser.runtime.sendMessage({
      type:   kCOMMAND_FIND_URI_RANGES,
      base:   location.href,
      ranges: [selectionRange]
    });
    var position = getFieldNodePosition(aField);
    for (let range of ranges) {
      range.range.fieldNodePos = position;
    }
    gFindingURIRanges = false;
    aResolve(ranges);
  });
}

function onSelectionRangeChanged() {
  var selection     = window.getSelection();
  var selectionText = selection.toString()
  if (selectionText == gLastSelection)
    return;

  gLastSelection    = selectionText;
  gFindingURIRanges = true;

  browser.runtime.sendMessage({
    type: kNOTIFY_READY_TO_FIND_URI_RANGES
  });

  findURIRanges.delayed = setTimeout(() => {
    delete findURIRanges.delayed;
    gLastURIRanges = findURIRanges();
  }, 100);
}

async function findURIRanges() {
  var selection = window.getSelection();
  if (!selection.toString().trim()) {
    browser.runtime.sendMessage({
      type:   kCOMMAND_FIND_URI_RANGES,
      base:   location.href,
      ranges: []
    });
    return [];
  }

  var selectionRanges = [];
  for (let i = 0, maxi = selection.rangeCount; i < maxi; i++) {
    let selectionRange = selection.getRangeAt(i);
    let preceding      = getPrecedingRange(selectionRange);
    let following      = getFollowingRange(selectionRange);
    let rangeData = getRangeData(selectionRange);
    rangeData.text = `${preceding.text}${rangeToText(selectionRange)}${following.text}`;
    selectionRanges.push(rangeData);
  }
  var ranges = await browser.runtime.sendMessage({
    type:   kCOMMAND_FIND_URI_RANGES,
    base:   location.href,
    ranges: selectionRanges
  });
  gFindingURIRanges = false;
  return ranges;
}

function getSelectionEventData(aEvent) {
  var textFieldSelection = isInputField(aEvent.target);

  var selection = window.getSelection();
  if (!textFieldSelection && selection.rangeCount != 1)
    return null;

  var text, cursor;
  if (textFieldSelection) {
    cursor = getFieldRangeData(aEvent.target);
    text   = cursor.text;
  }
  else {
    let selectionRange = selection.getRangeAt(0);
    let preceding      = getPrecedingRange(selectionRange);
    let following      = getFollowingRange(selectionRange);
    text   = `${preceding.text}${rangeToText(selectionRange)}${following.text}`;
    cursor = getRangeData(selectionRange);
  }

  var data = {
    text, cursor,
    base:  location.href,
    event: {
      altKey:   aEvent.altKey,
      ctrlKey:  aEvent.ctrlKey,
      metaKey:  aEvent.metaKey,
      shiftKey: aEvent.shiftKey,
      inEditable: textFieldSelection || isEditableNode(aEvent.target)
    }
  };

  if (aEvent.type == 'dblclick' &&
      aEvent.button == 0) {
    data.event.type = 'dblclick';
  }
  else if (aEvent.type == 'keypress' &&
           (aEvent.keyCode == KeyEvent.DOM_VK_ENTER ||
            aEvent.keyCode == KeyEvent.DOM_VK_RETURN)) {
    data.event.type = 'enter';
  }
  else {
    return null;
  }
  return data;
}


function onFocused(aEvent) {
  var node = aEvent.target;
  if (!isInputField(node))
    return;
  node.addEventListener('selectionchange', onSelectionChange, { capture: true });
  window.addEventListener('unload', () => {
    node.removeEventListener('selectionchange', onSelectionChange, { capture: true });
  }, { once: true });
}

function isInputField(aNode) {
  return (
    aNode.nodeType == Node.ELEMENT_NODE &&
    evaluateXPath(`self::*[${kFIELD_CONDITION}]`, aNode, XPathResult.BOOLEAN_TYPE).booleanValue
  );
}

function isEditableNode(aNode) {
  if ((aNode.ownerDocument || aNode).designMode == 'on')
    return true;
  while (aNode) {
    if (aNode.contentEditable == 'true')
      return true;
    aNode = aNode.parentNode;
  }
  return false;
}


function onMessage(aMessage, aSender) {
  switch (aMessage.type) {
    case kCOMMAND_ACTION_FOR_URIS: return (async () => {
      var ranges = await gLastURIRanges;
      if (aMessage.action & kACTION_COPY) {
        let uris = ranges.map(aRange => aRange.uri).join('\n');
        if (ranges.length > 1)
          uris += '\n';
        doCopy(uris);
        selectRanges(ranges.map(aRange => aRange.range));
      }
      else {
        selectRanges(ranges.map(aRange => aRange.range));
        browser.runtime.sendMessage(clone(aMessage, {
          uris: ranges.map(aRange => aRange.uri)
        }));
      }
    })();

    case kCOMMAND_FETCH_URI_RANGES:
      return gLastURIRanges;

    case kNOTIFY_MATCH_ALL_PROGRESS:
      gMatchAllProgress = aMessage.progress;
      if (aMessage.showInContent)
        updateProgress();
      break;

    case kCOMMAND_FETCH_MATCH_ALL_PROGRESS:
      return Promise.resolve(gMatchAllProgress);
  }
}

var gProgressIndicator;

function updateProgress() {
  if (gMatchAllProgress >= 100 || gMatchAllProgress <= 0) {
    if (gProgressIndicator) {
      gProgressIndicator.parentNode.removeChild(gProgressIndicator);
      gProgressIndicator = null;
    }
    return;
  }

  if (!gProgressIndicator) {
    let range = document.createRange();
    range.selectNodeContents(document.body || document.documentElement);
    range.collapse(false);
    let fragment = range.createContextualFragment(`<span style="
      background: gray;
      border: 1px solid;
      color: white;
      font-size: small;
      line-height: 1.5;
      opacity: 0.75;
      padding: 0.5em;
      position: fixed;
      right: 0.2em;
      top: 0.2em;
    "></span>`);
    gProgressIndicator = fragment.firstChild;
    range.insertNode(fragment);
    range.detach();
  }
  gProgressIndicator.textContent = browser.i18n.getMessage('menu.waiting.label', [gMatchAllProgress]);
}

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('keypress', onKeyPress, { capture: true });
window.addEventListener('selectionchange', onSelectionChange, { capture: true });
window.addEventListener('focus', onFocused, { capture: true });
browser.runtime.onMessage.addListener(onMessage);

window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
  window.removeEventListener('keypress', onKeyPress, { capture: true });
  window.removeEventListener('selectionchange', onSelectionChange, { capture: true });
  window.removeEventListener('focus', onFocused, { capture: true });
  browser.runtime.onMessage.removeListener(onMessage);
}, { once: true });

