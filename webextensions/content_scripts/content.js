/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

let Common, Constants, ChangingSelectionRanges, Range, XPath;
(async () => {
  const [common, constants, changingSelectionRanges, range, xPath] = await Promise.all([
    import(browser.runtime.getURL('/common/common.js')),
    import(browser.runtime.getURL('/common/constants.js')),
    import(browser.runtime.getURL('/content_scripts/changing-selection-ranges.js')),
    import(browser.runtime.getURL('/content_scripts/range.js')),
    import(browser.runtime.getURL('/content_scripts/xpath.js')),
  ]);
  Common                  = common;
  Constants               = constants;
  ChangingSelectionRanges = changingSelectionRanges;
  Range                   = range;
  XPath                   = xPath;

  Common.setLogContext('content');

  registerListeners();
})();


const BOUNDARY_INLINE_NODE = 'textlink-boundary-inline-node';

let gTryingAction = false;
let gLastActionResult = null;
let gMatchAllProgress = 0;

async function onDblClick(event) {
  if (event.target.ownerDocument != document)
    return;
  const data = getSelectionEventData(event);
  if (!data)
    return;
  gTryingAction = true;
  gLastActionResult = null;
  const textFieldSelection = isInputField(event.target);
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1806291
  for (const node of data.boundaryInlineNodes) {
    node.classList.add(BOUNDARY_INLINE_NODE);
  }
  gLastActionResult = await browser.runtime.sendMessage({
    ...data,
    boundaryInlineNodes: [], // don't send raw DOM nodes
    type:                Constants.kCOMMAND_TRY_ACTION
  });
  for (const node of data.boundaryInlineNodes) {
    node.classList.remove(BOUNDARY_INLINE_NODE);
  }
  if (textFieldSelection &&
      gLastActionResult &&
      gLastActionResult.range)
    gLastActionResult.range.fieldNodePos = Range.getFieldNodePosition(event.target);
  postAction(gLastActionResult);
  await Common.wait(500);
  gTryingAction = false;
}

function onKeyDownThrottled(event) {
  if (event.target.ownerDocument != document ||
      event.key != 'Enter')
    return;
  if (onKeyDownThrottled.timeout)
    clearTimeout(onKeyDownThrottled.timeout);
  onKeyDownThrottled.timeout = setTimeout(() => {
    onKeyDownThrottled.timeout = null;
    onKeyDown(event);
  }, 100);
}
onKeyDownThrottled.timeout = null;

async function onKeyDown(event) {
  const data = getSelectionEventData(event);
  if (!data)
    return;
  gTryingAction = true;
  gLastActionResult = null;
  const textFieldSelection = isInputField(event.target);
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1806291
  for (const node of data.boundaryInlineNodes) {
    node.classList.add(BOUNDARY_INLINE_NODE);
  }
  gLastActionResult = await browser.runtime.sendMessage({
    ...data,
    boundaryInlineNodes: [], // don't send raw DOM nodes
    type:                Constants.kCOMMAND_TRY_ACTION
  });
  for (const node of data.boundaryInlineNodes) {
    node.classList.remove(BOUNDARY_INLINE_NODE);
  }
  if (textFieldSelection &&
      gLastActionResult &&
      gLastActionResult.range)
    gLastActionResult.range.fieldNodePos = Range.getFieldNodePosition(event.target);
  postAction(gLastActionResult);
  gTryingAction = false;
}

function postAction(result) {
  if (!result)
    return;

  if (result.action & Constants.kACTION_COPY)
    doCopy(result.uri);
  if (result.range)
    Range.selectRanges(result.range);
}

function doCopy(text) {
  ChangingSelectionRanges.increase();
  const selection = window.getSelection();
  const ranges = [];
  for (let i = 0, maxi = selection.rangeCount; i < maxi; i++) {
    ranges.push(Range.getRangeData(selection.getRangeAt(i)));
  }

  // this is required to block overriding clipboard data from scripts of the webpage.
  document.addEventListener('copy', event => {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
  }, {
    capture: true,
    once:    true
  });

  const field = document.createElement('textarea');
  field.value = text;
  document.body.appendChild(field);
  field.style.position = 'fixed';
  field.style.opacity = 0;
  field.style.pointerEvents = 'none';
  field.focus();
  field.select();
  document.execCommand('copy');
  field.parentNode.removeChild(field);

  Range.selectRanges(ranges);
  ChangingSelectionRanges.decrease();
}


let gLastSelection = '';
let gLastSelectionChangeAt = 0;
let gLastURIRanges = Promise.resolve([]);

async function onSelectionChange(event) {
  if (ChangingSelectionRanges.has())
    return;

  const changedAt = gLastSelectionChangeAt = Date.now();
  if (findURIRanges.delayed)
    clearTimeout(findURIRanges.delayed);

  await Common.wait(200);
  if (changedAt != gLastSelectionChangeAt)
    return;

  if (gTryingAction) {
    while (gTryingAction) {
      await Common.wait(500);
    }
    if (changedAt != gLastSelectionChangeAt)
      return;
    if (gLastActionResult) {
      gLastURIRanges = Promise.resolve([gLastActionResult]);
      return;
    }
  }

  if (isInputField(event.target))
    onTextFieldSelectionChanged(event.target);
  else
    onSelectionRangeChanged();
}

function onTextFieldSelectionChanged(field) {
  const selectionRange = Range.getFieldRangeData(field);

  gLastSelection = selectionRange.text.substring(selectionRange.startOffset, selectionRange.endOffset);

  browser.runtime.sendMessage({
    type: Constants.kNOTIFY_READY_TO_FIND_URI_RANGES
  });
  gLastURIRanges = new Promise(async (reolve, _reject) => {
    const ranges = await browser.runtime.sendMessage({
      type:   Constants.kCOMMAND_FIND_URI_RANGES,
      base:   location.href,
      ranges: [selectionRange]
    });
    const position = Range.getFieldNodePosition(field);
    for (const range of ranges) {
      range.range.fieldNodePos = position;
    }
    reolve(ranges);
  });
}

function onSelectionRangeChanged() {
  const selection = window.getSelection();
  const selectionText = selection.toString()
  if (selectionText == gLastSelection)
    return;

  gLastSelection = selectionText;

  browser.runtime.sendMessage({
    type: Constants.kNOTIFY_READY_TO_FIND_URI_RANGES
  });

  findURIRanges.delayed = setTimeout(() => {
    delete findURIRanges.delayed;
    gLastURIRanges = findURIRanges();
  }, 100);
}

async function findURIRanges(_options = {}) {
  const selection = window.getSelection();
  if (!selection.toString().trim()) {
    browser.runtime.sendMessage({
      type:   Constants.kCOMMAND_FIND_URI_RANGES,
      base:   location.href,
      ranges: []
    });
    return [];
  }

  Range.clearNodeVisibilityCache();

  const selectionRanges = [];
  const boundaryInlineNodes = [];
  for (let i = 0, maxi = selection.rangeCount; i < maxi; i++) {
    const selectionRange = selection.getRangeAt(i);
    const selectionText = Range.rangeToText(selectionRange);
    const precedings = Range.getPrecedingRanges(selectionRange);
    const followings = Range.getFollowingRanges(selectionRange);
    const rangeData = Range.getRangeData(selectionRange);
    rangeData.text = selectionText.text;
    rangeData.expandedText = `${precedings.texts.join('')}${selectionText.text}${followings.texts.join('')}`;
    selectionRanges.push(rangeData);
    boundaryInlineNodes.push(...selectionText.boundaryInlineNodes, ...precedings.boundaryInlineNodes, ...followings.boundaryInlineNodes);
  }
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1806291
  for (const node of boundaryInlineNodes) {
    node.classList.add(BOUNDARY_INLINE_NODE);
  }
  const ranges = await browser.runtime.sendMessage({
    type:   Constants.kCOMMAND_FIND_URI_RANGES,
    base:   location.href,
    ranges: selectionRanges
  });
  for (const node of boundaryInlineNodes) {
    node.classList.remove(BOUNDARY_INLINE_NODE);
  }
  return ranges;
}

function getSelectionEventData(event) {
  const textFieldSelection = isInputField(event.target);

  const selection = window.getSelection();
  if (!textFieldSelection && selection.rangeCount != 1)
    return null;

  Range.clearNodeVisibilityCache();

  let text, cursor, boundaryInlineNodes;
  if (textFieldSelection) {
    cursor = Range.getFieldRangeData(event.target);
    text = cursor.text;
    boundaryInlineNodes = [];
  }
  else {
    const selectionRange = selection.getRangeAt(0);
    const selectionText = Range.rangeToText(selectionRange);
    const precedings = Range.getPrecedingRanges(selectionRange);
    const followings = Range.getFollowingRanges(selectionRange);
    text = `${precedings.texts.join('')}${selectionText.text}${followings.texts.join('')}`;
    cursor = Range.getRangeData(selectionRange);
    boundaryInlineNodes = [...selectionText.boundaryInlineNodes, ...precedings.boundaryInlineNodes, ...followings.boundaryInlineNodes];
  }

  const data = {
    text, cursor,
    base:  location.href,
    event: {
      altKey:     event.altKey,
      ctrlKey:    event.ctrlKey,
      metaKey:    event.metaKey,
      shiftKey:   event.shiftKey,
      inEditable: textFieldSelection || isEditableNode(event.target)
    },
    boundaryInlineNodes,
  };

  if (event.type == 'dblclick' &&
      event.button == 0) {
    data.event.type = 'dblclick';
  }
  else if (event.type == 'keydown' &&
           event.key == 'Enter') {
    data.event.type = 'enter';
  }
  else {
    return null;
  }
  return data;
}


function onFocused(event) {
  const node = event.target;
  if (!isInputField(node))
    return;
  node.addEventListener('selectionchange', onSelectionChange, { capture: true });
  window.addEventListener('unload', () => {
    node.removeEventListener('selectionchange', onSelectionChange, { capture: true });
  }, { once: true });
}

function isInputField(node) {
  return (
    node.nodeType == Node.ELEMENT_NODE &&
    XPath.evaluateXPath(`self::*[${Range.kFIELD_CONDITION}]`, node, XPathResult.BOOLEAN_TYPE).booleanValue
  );
}

function isEditableNode(node) {
  if ((node.ownerDocument || node).designMode == 'on')
    return true;
  while (node) {
    if (node.contentEditable == 'true')
      return true;
    node = node.parentNode;
  }
  return false;
}


function onMessage(aMessage, _aSender) {
  switch (aMessage.type) {
    case Constants.kCOMMAND_ACTION_FOR_URIS: return (async () => {
      let ranges = await gLastURIRanges;
      if (aMessage.action & Constants.kACTION_COPY) {
        let uris = ranges.map(aRange => aRange.uri).join('\n');
        if (ranges.length > 1)
          uris += '\n';
        doCopy(uris);
      }
      else {
        browser.runtime.sendMessage({
          ...aMessage,
          uris: ranges.map(aRange => aRange.uri)
        });
      }
      if (ranges.length > 0 &&
          (!('startTextNodePos' in ranges[0]) ||
           !('endTextNodePos' in ranges[0]))) {
        gLastURIRanges = findURIRanges();
        ranges = await gLastURIRanges;
      }
      Range.selectRanges(ranges.map(aRange => aRange.range));
    })();

    case Constants.kCOMMAND_FETCH_URI_RANGES:
      return gLastURIRanges;

    case Constants.kNOTIFY_MATCH_ALL_PROGRESS:
      gMatchAllProgress = aMessage.progress;
      if (aMessage.showInContent)
        updateProgress();
      break;

    case Constants.kCOMMAND_FETCH_MATCH_ALL_PROGRESS:
      return Promise.resolve(gMatchAllProgress);
  }
}

let gProgressIndicator;

function updateProgress() {
  if (gMatchAllProgress >= 100 || gMatchAllProgress <= 0) {
    if (gProgressIndicator) {
      gProgressIndicator.parentNode.removeChild(gProgressIndicator);
      gProgressIndicator = null;
    }
    return;
  }

  if (!gProgressIndicator) {
    const range = document.createRange();
    range.selectNodeContents(document.body || document.documentElement);
    range.collapse(false);
    const fragment = range.createContextualFragment(`<span style="
      bottom: 0.5em;
      box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.5),
                  0 0 0.2em rgba(0, 0, 0, 0.5);
      display: block;
      font-size: medium;
      height: 0.2em;
      max-height: 0.2em;
      max-width: 5em;
      opacity: 1;
      padding: 0;
      position: fixed;
      right: 0.5em;
      width: 5em;
    "></span>`);
    gProgressIndicator = fragment.firstChild;
    range.insertNode(fragment);
    range.detach();
  }
  gProgressIndicator.style.background = `
    linear-gradient(to right,
                    #24b7b7 0%,
                    #85f2e1 ${gMatchAllProgress}%,
                    #000000 ${gMatchAllProgress}%,
                    #000000 100%)
  `;
  gProgressIndicator.setAttribute('title', browser.i18n.getMessage('menu_waiting_label', [gMatchAllProgress]));
}


function registerListeners() {
  window.addEventListener('dblclick', onDblClick, { capture: true });
  window.addEventListener('keydown', onKeyDownThrottled, { capture: true });
  window.addEventListener('selectionchange', onSelectionChange, { capture: true });
  window.addEventListener('focus', onFocused, { capture: true });
  browser.runtime.onMessage.addListener(onMessage);

  window.addEventListener('unload', () => {
    window.removeEventListener('dblclick', onDblClick, { capture: true });
    window.removeEventListener('keydown', onKeyDownThrottled, { capture: true });
    window.removeEventListener('selectionchange', onSelectionChange, { capture: true });
    window.removeEventListener('focus', onFocused, { capture: true });
    browser.runtime.onMessage.removeListener(onMessage);
  }, { once: true });
}
