/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'BG';

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message ||
      typeof message.type != 'string' ||
      message.type.indexOf('textlink:') != 0)
    return;

  switch (message.type) {
    case kCOMMAND_TRY_ACTION: return (async () => {
      const action = detectActionFromEvent(message.event);
      log('action: ', action);
      if (action == kACTION_DISABLED)
        return null;

      message.cursor.framePos = sender.frameId;
      const result = await URIMatcher.matchSingle({
        text:    message.text,
        tabId:   sender.tab.id,
        cursor:  message.cursor,
        baseURI: message.base
      });
      log('matchSingle result: ', result);
      if (!result)
        return null;

      result.action = action;
      if (result.uri) {
        if (action & kACTION_OPEN_IN_CURRENT) {
          browser.tabs.update(sender.tab.id, {
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
            windowId:    sender.tab.windowId,
            openerTabId: sender.tab.id
          });
        }
      }
      return result;
    })();

    case kCOMMAND_ACTION_FOR_URIS:
      if (message.action & kACTION_OPEN_IN_CURRENT) {
        browser.tabs.update(sender.tab.id, {
          url: message.uris[0]
        });
        message.uris.slice(1).forEach((uri, index) => {
          browser.tabs.create({
            url:         uri,
            windowId:    sender.tab.windowId,
            openerTabId: sender.tab.id
          });
        });
      }
      else if (message.action & kACTION_OPEN_IN_WINDOW) {
        message.uris.forEach((uri, index) => {
          browser.windows.create({
            url: uri
          });
        });
      }
      else if (message.action & kACTION_OPEN_IN_TAB) {
        message.uris.forEach((uri, index) => {
          browser.tabs.create({
            active:      index == 0,
            url:         uri,
            windowId:    sender.tab.windowId,
            openerTabId: sender.tab.id
          });
        });
      }
      break;

    case kNOTIFY_READY_TO_FIND_URI_RANGES:
      initContextMenuForWaiting(sender.tab.id);
      break;

    case kCOMMAND_FIND_URI_RANGES: return (async () => {
      browser.tabs.sendMessage(sender.tab.id, {
        type:     kNOTIFY_MATCH_ALL_PROGRESS,
        progress: 0
      });
      await initContextMenuForWaiting(sender.tab.id);
      log('selection-changed', message);
      for (const range of message.ranges) {
        range.framePos = sender.frameId;
      }
      const results = await URIMatcher.matchAll({
        tabId:   sender.tab.id,
        ranges:  message.ranges,
        baseURI: message.base,
        onProgress: (aProgress) => {
          try {
            const progress = Math.round(aProgress * 100);
            browser.tabs.sendMessage(sender.tab.id, {
              type:     kNOTIFY_MATCH_ALL_PROGRESS,
              progress: progress,
              showInContent: configs.showProgress
            });
            if (gLastContextTab == sender.tab.id)
              browser.menus.update('waiting', {
                title: browser.i18n.getMessage(`menu_waiting_label`, [progress])
              });
          }
          catch(e) {
          }
        }
      });
      log('matchAll results: ', results);
      if (sender.tab.active &&
          (await browser.windows.get(sender.tab.windowId)).focused)
        initContextMenuForURIs(results.map(result => result.uri));
      return results;
    })();
  }
});

function detectActionFromEvent(event) {
  const baseType = event.inEditable ? 'actionInEditable' : 'action';
  for (const name of Object.keys(kACTION_NAME_TO_ID)) {
    const base = `${baseType}_${name}_${event.type}`;
    if (!configs[base] ||
        configs[`${base}_alt`] != event.altKey ||
        configs[`${base}_ctrl`] != event.ctrlKey ||
        configs[`${base}_meta`] != event.metaKey ||
        configs[`${base}_shift`] != event.shiftKey)
      continue;
    return kACTION_NAME_TO_ID[name];
  }
  return kACTION_DISABLED;
}

const MENU_ITEMS = [
  'openCurrent',
  'openTab',
  'openWindow',
  'copy'
];

let gLastContextTab = 0;

async function initContextMenuForWaiting(tabId) {
  browser.menus.removeAll();

  let count = 0;
  for (const id of MENU_ITEMS) {
    if (configs[`menu_${id}_single`] ||
        configs[`menu_${id}_multiple`])
      count++;
  }
  if (count == 0)
    return;

  gLastContextTab = tabId;
  const progress = await browser.tabs.sendMessage(tabId, {
    type: kCOMMAND_FETCH_MATCH_ALL_PROGRESS
  });
  browser.menus.create({
    id:       'waiting',
    title:    browser.i18n.getMessage(`menu_waiting_label`, [progress || 0]),
    enabled:  false,
    contexts: ['selection']
  });
}

function initContextMenuForURIs(uris) {
  browser.menus.removeAll();
  if (uris.length == 0)
    return;

  const first = getShortURIString(uris[0]);
  const last  = getShortURIString(uris[uris.length - 1]);
  const type  = uris.length == 1 ? 'single' : 'multiple';

  let visibleCount = 0;
  const visibility = {};
  for (const id of MENU_ITEMS) {
    visibility[id] = configs[`menu_${id}_${type}`];
    if (visibility[id])
      visibleCount++;
  }
  if (visibleCount == 0)
    return;

  let parentId = null;
  if (visibleCount > 1) {
    browser.menus.create({
      id:       'group',
      title:    browser.i18n.getMessage(`menu.group.${type}`, [uris.length, first, last]),
      contexts: ['selection']
    });
    parentId = 'group';
  }

  for (const id of MENU_ITEMS) {
    if (!visibility[id])
      continue;
    let title = browser.i18n.getMessage(`menu.${id}.${type}`);
    if (visibleCount == 1)
      title = browser.i18n.getMessage(`menu.direct.${type}`, [title, first, last]);
    browser.menus.create({
      id, title, parentId,
      contexts: ['selection']
    });
  }
}

function getShortURIString(uri) {
  if (uri.length > 20)
    return browser.i18n.getMessage('shortURI', [uri.substring(0, 15).replace(/\.+$/, '')]);
  return uri;
}

browser.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'openCurrent':
      browser.tabs.sendMessage(tab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_CURRENT
      });
      break;

    case 'openTab':
      browser.tabs.sendMessage(tab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_TAB
      });
      break;

    case 'openWindow':
      browser.tabs.sendMessage(tab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_WINDOW
      });
      break;

    case 'copy':
      browser.tabs.sendMessage(tab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_COPY
      });
      break;
  }
});


browser.tabs.onActivated.addListener(async (activeInfo) => {
  const ranges = await browser.tabs.sendMessage(activeInfo.tabId, {
    type: kCOMMAND_FETCH_URI_RANGES
  });
  initContextMenuForURIs(ranges.map(result => result.uri));
});

browser.windows.onFocusChanged.addListener(async (windowId) => {
  const window = await browser.windows.get(windowId, { populate: true });
  if (!window.focused)
    return;

  const activeTab = window.tabs.filter(tab => tab.active)[0];
  const ranges = await browser.tabs.sendMessage(activeTab.id, {
    type: kCOMMAND_FETCH_URI_RANGES
  });
  initContextMenuForURIs(ranges.map(result => result.uri));
});
