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

  var selection = window.getSelection();
  if (selection.rangeCount != 1)
    return;

  var selectionRange = selection.getRangeAt(0);
  var preceding      = getPrecedingRange(selectionRange);
  var following      = getFollowingRange(selectionRange);

  var result = await browser.runtime.sendMessage({
    type:      kCOMMAND_DOUBLE_CLICK,
    base:      location.href,
    preceding: {
      range: getRangeData(preceding.range),
      text:  preceding.text
    },
    selection: {
      range: getRangeData(selectionRange),
      text:  rangeToText(selectionRange)
    },
    following: {
      range: getRangeData(following.range),
      text:  following.text
    },
    button:    aEvent.button,
    altKey:    aEvent.altKey,
    ctrlKey:   aEvent.ctrlKey,
    metaKey:   aEvent.metaKey,
    shiftKey:  aEvent.shiftKey
  });

  if (result.range) {
    selection.removeAllRanges();
    selection.addRange(createRangeFromRangeData(result.range));
  }
};

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
}, { once: true });
