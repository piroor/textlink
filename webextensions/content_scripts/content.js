/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'content';

async function onDblClick(aEvent) {
  if (aEvent.target.ownerDocument != document)
    return;
  var data = getSelectionEventData(aEvent);
  if (!data)
    return;
  var result = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
  postAction(result);
}

async function onKeyPress(aEvent) {
  if (aEvent.target.ownerDocument != document)
    return;
  var data = getSelectionEventData(aEvent);
  if (!data)
    return;
  var result = await browser.runtime.sendMessage(clone(data, {
    type: kCOMMAND_TRY_ACTION
  }));
  postAction(result);
}

var gLastSelection = '';

function onSelectionChange(aEvent) {
  var selection = String(window.getSelection() || '');
  if (selection != gLastSelection)
    browser.runtime.sendMessage({
      type: kNOTIFY_SELECTION_CHANGED
    });
  gLastSelection = selection;
}

function getSelectionEventData(aEvent) {
  var selection = window.getSelection();
  if (selection.rangeCount != 1)
    return null;

  var selection = window.getSelection();
  if (selection.rangeCount != 1)
    return null;

  var selectionRange = selection.getRangeAt(0);
  var preceding      = getPrecedingRange(selectionRange);
  var following      = getFollowingRange(selectionRange);

  var data = {
    base:      location.href,
    text:      `${preceding.text
                }${rangeToText(selectionRange)
                }${following.text}`,
    cursor:    getRangeData(selectionRange),
    event: {
      type:      aEvent.type,
      altKey:    aEvent.altKey,
      ctrlKey:   aEvent.ctrlKey,
      metaKey:   aEvent.metaKey,
      shiftKey:  aEvent.shiftKey
    }
  };

  if (aEvent.type == 'dblclick') {
    data.event.button = aEvent.button;
  }
  else {
    data.event.key = aEvent.key;
    data.event.keyCode = aEvent.keyCode;
  }
  return data;
}

function postAction(aResult) {
  if (!aResult)
    return;

  if (aResult.range) {
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(createRangeFromRangeData(aResult.range));
  }
  if (aResult.action & kACTION_COPY)
    doCopy(aResult.uri);
}

function doCopy(aText) {
  var field = document.createElement('textarea');
  field.value = plainText;
  document.body.appendChild(field);
  field.focus();
  field.select();
  document.execCommand('copy');
  field.parentNode.removeChild(field);
}

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('keypress', onKeyPress, { capture: true });
window.addEventListener('keyup', onSelectionChange, { capture: true });
window.addEventListener('mouseup', onSelectionChange, { capture: true });
window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
  window.removeEventListener('keypress', onKeyPress, { capture: true });
  window.removeEventListener('keyup', onSelectionChange, { capture: true });
  window.removeEventListener('mouseup', onSelectionChange, { capture: true });
}, { once: true });

