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
      let result = URIMatcher.matchSingle({
        preceding: aMessage.preceding.text,
        selection: aMessage.selection.text,
        following: aMessage.following.text
      }, aMessage.base);
      log('matchSingle result: ', result);
      if (result.uri) {
        let match = await browser.find.find(result.text, {
          tabId:            aSender.tab.id,
          caseSensitive:    true,
          includeRangeData: true
        });
        let selectionRange = aMessage.selection.range;
        log('selectionRange: ', selectionRange, aSender.frameId);
        for (let rangeData of match.rangeData) {
          log('range: ', rangeData);
          if (rangeData.framePos != aSender.frameId ||
              rangeData.startTextNodePos > selectionRange.startTextNodePos ||
              (rangeData.startTextNodePos == selectionRange.startTextNodePos &&
               rangeData.startOffset > selectionRange.startOffset) ||
              rangeData.endTextNodePos < selectionRange.endTextNodePos ||
              (rangeData.endTextNodePos == selectionRange.endTextNodePos &&
               rangeData.endOffset < selectionRange.endOffset))
            continue;
          log('found!');
          result.range = rangeData;
          break;
        }
        await browser.tabs.create({
          active:      true,
          url:         result.uri,
          windowId:    aSender.tab.windowId,
          openerTabId: aSender.tab.id
        });
      }
      //let text = `${aMessage.preceding}${aMessage.selection}${aMessage.following}`;
      //log('matchAll result: ', URIMatcher.matchAll(text, aMessage.base));
      return result;
    })();
  }
});
