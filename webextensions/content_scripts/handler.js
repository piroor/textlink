/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'content';

function onDblClick(aEvent) {
  if (aEvent.target.ownerDocument != document)
    return;

  var selection = window.getSelection();
  if (selection.rangeCount != 1)
    return;

  var range = selection.getRangeAt(0);
  var precedingRange = getPrecedingRange(range);
  var followingRange = getFollowingRange(range);
  log('dblclick: ', JSON.stringify({
    preceding: { text: precedingRange.text, range: precedingRange.range.toString() },
    selection: rangeToText(range),
    following: { text: followingRange.text, range: followingRange.range.toString() }
  }));
};

window.addEventListener('dblclick', onDblClick, { capture: true });
window.addEventListener('unload', () => {
  window.removeEventListener('dblclick', onDblClick, { capture: true });
}, { once: true });

