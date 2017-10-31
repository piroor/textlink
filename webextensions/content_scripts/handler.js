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

  var range = selection.getRangeAt(0);
  var selection = {
    range,
    text: rangeToText(range)
  };
  var preceding = getPrecedingRange(range);
  var following = getFollowingRange(range);

  log('dblclick: ', JSON.stringify({
    preceding: { text: preceding.text, range: preceding.range.toString() },
    selection: { text: selection.text, range: selection.range.toString() },
    following: { text: following.text, range: following.range.toString() }
  }));

  let result = await browser.runtime.sendMessage({
    type:      kCOMMAND_DOUBLE_CLICK,
    base:      location.href,
    preceding: preceding.text,
    selection: selection.text,
    following: following.text,
    button:    aEvent.button,
    altKey:    aEvent.altKey,
    ctrlKey:   aEvent.ctrlKey,
    metaKey:   aEvent.metaKey,
    shiftKey:  aEvent.shiftKey
  });
  log('result: ', JSON.stringify(result));
  // TODO: we need to select the matched text!
};

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
}, { once: true });

