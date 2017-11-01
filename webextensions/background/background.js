/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'BG';

browser.runtime.onMessage.addListener((aMessage, aSender) => {
  if (!aMessage ||
      typeof aMessage.type != 'string' ||
      aMessage.type.indexOf('textlink:') != 0)
    return;

  switch (aMessage.type) {
    case kCOMMAND_DOUBLE_CLICK: return (async () => {
      let action = detectActionFromEvent(clone(aMessage, { type: 'dblclick' }));
      if (action == kACTION_DISABLED)
        return null;

      aMessage.cursor.framePos = aSender.frameId;
      let result = await URIMatcher.matchSingle({
        text:    aMessage.text,
        tabId:   aSender.tab.id,
        cursor:  aMessage.cursor,
        baseURI: aMessage.base
      });
      result.action = action;
      log('matchSingle result: ', result);
      if (result.uri) {
        if (action & kACTION_OPEN_IN_CURRENT) {
          browser.tabs.update(aSender.tab.id, {
            url: result.uri
          });
        }
        else if (action & kACTION_OPEN_IN_WINDOW) {
          browser.windows.create({
            url: result.uri
          });
        }
        else if (action & kACTION_OPEN_IN_TAB || action & kACTION_OPEN_IN_BACKGROUND_TAB) {
          browser.tabs.create({
            active:      !!(action & kACTION_OPEN_IN_TAB),
            url:         result.uri,
            windowId:    aSender.tab.windowId,
            openerTabId: aSender.tab.id
          });
        }
      }
      //let text = `${aMessage.preceding}${aMessage.selection}${aMessage.following}`;
      //log('matchAll result: ', URIMatcher.matchAll(text, aMessage.base));
      return result;
    })();
  }
});

function detectActionFromEvent(aEvent) {
  var modifiers = [];
  if (aEvent.altKey)
    modifiers.push('alt');
  if (aEvent.ctrlKey)
    modifiers.push('ctrl');
  if (aEvent.metaKey)
    modifiers.push('meta');
  if (aEvent.shiftKey)
    modifiers.push('shift');
  modifiers.sort();

  var triggers = [`${modifiers.join('-')}-${aEvent.type}`];
  if (/^Mac/i.test(navigator.platform)) {
    if (aEvent.metaKey)
      triggers.push(`accel-${modifiers.filter(aModifier => aModifier != 'meta').join('-')}-${aEvent.type}`);
  }
  else {
    if (aEvent.ctrlKey)
      triggers.push(`accel-${modifiers.filter(aModifier => aModifier != 'ctrl').join('-')}-${aEvent.type}`);
  }

  for (let action of configs.actions) {
    let trigger = aEvent.type == 'dblclick' ? action.triggerMouse: action.triggerKey ;
    if (triggers.some(aTrigger => aTrigger == trigger))
      return action.action;
  ]
  return kACTION_DISABLED;
}
