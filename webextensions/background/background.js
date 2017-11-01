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
    case kCOMMAND_DOUBLE_CLICK:
    case kCOMMAND_KEYPRESS_ENTER: return (async () => {
      let action = detectActionFromEvent(aMessage.event);
      log('action: ', action);
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
  var isMouseEvent = aEvent.type == 'dblclick';
  var elements = [];
  if (aEvent.altKey)
    elements.push('alt');
  if (aEvent.ctrlKey)
    elements.push('ctrl');
  if (aEvent.metaKey)
    elements.push('meta');
  if (aEvent.shiftKey)
    elements.push('shift');
  elements.sort();

  if (isMouseEvent)
    elements.push(aEvent.type);
  else  if (aEvent.keyCode == KeyEvent.DOM_VK_ENTER ||
            aEvent.keyCode == KeyEvent.DOM_VK_RETURN)
    elements.push('VK_ENTER');

  var triggers = [elements.join('-')];
  if (/^Mac/i.test(navigator.platform)) {
    if (aEvent.metaKey)
      triggers.push(`accel-${elements.filter(aModifier => aModifier != 'meta').join('-')}`);
  }
  else {
    if (aEvent.ctrlKey)
      triggers.push(`accel-${elements.filter(aModifier => aModifier != 'ctrl').join('-')}`);
  }
  console.log(triggers);

  for (let action of configs.actions) {
    let trigger = isMouseEvent ? action.triggerMouse: action.triggerKey ;
    if (triggers.some(aTrigger => aTrigger == trigger))
      return action.action;
  }
  return kACTION_DISABLED;
}
