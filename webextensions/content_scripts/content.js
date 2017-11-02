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
  gLastActionResult = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
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
  gLastActionResult = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
  postAction(gLastActionResult);
  gTryingAction = false;
}

function postAction(aResult) {
  if (!aResult)
    return;

  if (aResult.range)
    selectRanges(aResult.range);
  if (aResult.action & kACTION_COPY)
    doCopy(aResult.uri);
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

async function onSelectionChange(aEvent) {
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

  var selection = window.getSelection();
  var selectionText = selection.toString()
  if (selectionText == gLastSelection)
    return;

  gLastSelection = selectionText;
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
  var selection = window.getSelection();
  if (selection.rangeCount != 1)
    return null;

  var selectionRange = selection.getRangeAt(0);
  var preceding      = getPrecedingRange(selectionRange);
  var following      = getFollowingRange(selectionRange);

  var data = {
    base:   location.href,
    text:   `${preceding.text}${rangeToText(selectionRange)}${following.text}`,
    cursor: getRangeData(selectionRange),
    event:  {
      altKey:   aEvent.altKey,
      ctrlKey:  aEvent.ctrlKey,
      metaKey:  aEvent.metaKey,
      shiftKey: aEvent.shiftKey
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
      break;

    case kCOMMAND_FETCH_MATCH_ALL_PROGRESS:
      return Promise.resolve(gMatchAllProgress);
  }
}

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('keypress', onKeyPress, { capture: true });
window.addEventListener('selectionchange', onSelectionChange, { capture: true });
browser.runtime.onMessage.addListener(onMessage);

window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
  window.removeEventListener('keypress', onKeyPress, { capture: true });
  window.removeEventListener('selectionchange', onSelectionChange, { capture: true });
  browser.runtime.onMessage.removeListener(onMessage);
}, { once: true });

