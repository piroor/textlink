/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  log,
  wait,
  nextFrame,
  configs
} from '../common/common.js'
import * as Constants from '../common/constants.js';
import * as URIMatcher from '../common/uriMatcher.js';

log.context = 'BG';

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

    case kCOMMAND_ACTION_FOR_URIS:
      if (aMessage.action & kACTION_OPEN_IN_CURRENT) {
        browser.tabs.update(aSender.tab.id, {
          url: aMessage.uris[0]
        });
        aMessage.uris.slice(1).forEach((aURI, aIndex) => {
          browser.tabs.create({
            url:         aURI,
            windowId:    aSender.tab.windowId,
            openerTabId: aSender.tab.id
          });
        });
      }
      else if (aMessage.action & kACTION_OPEN_IN_WINDOW) {
        aMessage.uris.forEach((aURI, aIndex) => {
          browser.windows.create({
            url: aURI
          });
        });
      }
      else if (aMessage.action & kACTION_OPEN_IN_TAB) {
        aMessage.uris.forEach((aURI, aIndex) => {
          browser.tabs.create({
            active:      aIndex == 0,
            url:         aURI,
            windowId:    aSender.tab.windowId,
            openerTabId: aSender.tab.id
          });
        });
      }
      break;

    case kNOTIFY_READY_TO_FIND_URI_RANGES:
      initContextMenuForWaiting(aSender.tab.id);
      break;

    case kCOMMAND_FIND_URI_RANGES: return (async () => {
      browser.tabs.sendMessage(aSender.tab.id, {
        type:     kNOTIFY_MATCH_ALL_PROGRESS,
        progress: 0
      });
      await initContextMenuForWaiting(aSender.tab.id);
      log('selection-changed', aMessage);
      for (let range of aMessage.ranges) {
        range.framePos = aSender.frameId;
      }
      let results = await URIMatcher.matchAll({
        tabId:   aSender.tab.id,
        ranges:  aMessage.ranges,
        baseURI: aMessage.base,
        onProgress: (aProgress) => {
          try {
            var progress = Math.round(aProgress * 100);
            browser.tabs.sendMessage(aSender.tab.id, {
              type:     kNOTIFY_MATCH_ALL_PROGRESS,
              progress: progress,
              showInContent: configs.showProgress
            });
            if (gLastContextTab == aSender.tab.id)
              browser.contextMenus.update('waiting', {
                title: browser.i18n.getMessage(`menu_waiting_label`, [progress])
              });
          }
          catch(e) {
          }
        }
      });
      log('matchAll results: ', results);
      if (aSender.tab.active &&
          (await browser.windows.get(aSender.tab.windowId)).focused)
        initContextMenuForURIs(results.map(aResult => aResult.uri));
      return results;
    })();
  }
});

function detectActionFromEvent(aEvent) {
  var baseType = aEvent.inEditable ? 'actionInEditable' : 'action';
  for (let name of Object.keys(kACTION_NAME_TO_ID)) {
    let base = `${baseType}_${name}_${aEvent.type}`;
    if (!configs[base] ||
        configs[`${base}_alt`] != aEvent.altKey ||
        configs[`${base}_ctrl`] != aEvent.ctrlKey ||
        configs[`${base}_meta`] != aEvent.metaKey ||
        configs[`${base}_shift`] != aEvent.shiftKey)
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

var gLastContextTab = 0;

async function initContextMenuForWaiting(aTabId) {
  browser.contextMenus.removeAll();

  var count = 0;
  for (let id of MENU_ITEMS) {
    if (configs[`menu_${id}_single`] ||
        configs[`menu_${id}_multiple`])
      count++;
  }
  if (count == 0)
    return;

  gLastContextTab = aTabId;
  var progress = await browser.tabs.sendMessage(aTabId, {
    type: kCOMMAND_FETCH_MATCH_ALL_PROGRESS
  });
  browser.contextMenus.create({
    id:       'waiting',
    title:    browser.i18n.getMessage(`menu_waiting_label`, [progress || 0]),
    enabled:  false,
    contexts: ['selection']
  });
}

function initContextMenuForURIs(aURIs) {
  browser.contextMenus.removeAll();
  if (aURIs.length == 0)
    return;

  var first = getShortURIString(aURIs[0]);
  var last  = getShortURIString(aURIs[aURIs.length - 1]);
  var type  = aURIs.length == 1 ? 'single' : 'multiple';

  var visibleCount = 0;
  var visibility = {};
  for (let id of MENU_ITEMS) {
    visibility[id] = configs[`menu_${id}_${type}`];
    if (visibility[id])
      visibleCount++;
  }
  if (visibleCount == 0)
    return;

  var parentId = null;
  if (visibleCount > 1) {
    browser.contextMenus.create({
      id:       'group',
      title:    browser.i18n.getMessage(`menu.group.${type}`, [aURIs.length, first, last]),
      contexts: ['selection']
    });
    parentId = 'group';
  }

  for (let id of MENU_ITEMS) {
    if (!visibility[id])
      continue;
    let title = browser.i18n.getMessage(`menu.${id}.${type}`);
    if (visibleCount == 1)
      title = browser.i18n.getMessage(`menu.direct.${type}`, [title, first, last]);
    browser.contextMenus.create({
      id, title, parentId,
      contexts: ['selection']
    });
  }
}

function getShortURIString(aURI) {
  if (aURI.length > 20)
    return browser.i18n.getMessage('shortURI', [aURI.substring(0, 15).replace(/\.+$/, '')]);
  return aURI;
}

browser.contextMenus.onClicked.addListener((aInfo, aTab) => {
  switch (aInfo.menuItemId) {
    case 'openCurrent':
      browser.tabs.sendMessage(aTab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_CURRENT
      });
      break;

    case 'openTab':
      browser.tabs.sendMessage(aTab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_TAB
      });
      break;

    case 'openWindow':
      browser.tabs.sendMessage(aTab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_OPEN_IN_WINDOW
      });
      break;

    case 'copy':
      browser.tabs.sendMessage(aTab.id, {
        type:   kCOMMAND_ACTION_FOR_URIS,
        action: kACTION_COPY
      });
      break;
  }
});


browser.tabs.onActivated.addListener(async (aActiveInfo) => {
  var ranges = await browser.tabs.sendMessage(aActiveInfo.tabId, {
    type: kCOMMAND_FETCH_URI_RANGES
  });
  initContextMenuForURIs(ranges.map(aResult => aResult.uri));
});

browser.windows.onFocusChanged.addListener(async (aWindowId) => {
  var window = await browser.windows.get(aWindowId, { populate: true });
  if (!window.focused)
    return;

  var activeTab = window.tabs.filter(aTab => aTab.active)[0];
  var ranges = await browser.tabs.sendMessage(activeTab.id, {
    type: kCOMMAND_FETCH_URI_RANGES
  });
  initContextMenuForURIs(ranges.map(aResult => aResult.uri));
});
