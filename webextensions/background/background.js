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
    case kCOMMAND_TRY_ACTION: return (async () => {
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
      log('matchSingle result: ', result);
      if (!result)
        return null;

      result.action = action;
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
      return result;
    })();

    case kCOMMAND_FIND_URI_RANGES: return (async () => {
      log('selection-changed', aMessage);
      for (let range of aMessage.ranges) {
        range.framePos = aSender.frameId;
      }
      let results = await URIMatcher.matchAll({
        text:    aMessage.text,
        tabId:   aSender.tab.id,
        ranges:  aMessage.ranges,
        baseURI: aMessage.base
      });
      log('matchAll results: ', results);
      if (aSender.tab.active)
        updateContextMenuFor(results.map(aResult => aResult.uri));
      return results;
    })();

    case kCOMMAND_OPEN_URIS:
      aMessage.uris.forEach((aURI, aIndex) => {
        browser.tabs.create({
          active:      aIndex == 0,
          url:         aURI,
          windowId:    aSender.tab.windowId,
          openerTabId: aSender.tab.id
        });
      });
      break;
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


function updateContextMenuFor(aURIs) {
  browser.contextMenus.removeAll();
  if (aURIs.length == 0)
    return;

  browser.contextMenus.create({
    id:       'open',
    title:    'Open URIs',
    contexts: ['selection']
  });
}

browser.contextMenus.onClicked.addListener((aInfo, aTab) => {
  switch (aInfo.menuItemId) {
    case 'open':
      browser.tabs.sendMessage(aTab.id, {
        type: kCOMMAND_OPEN_URIS
      });
      break;
  }
});
