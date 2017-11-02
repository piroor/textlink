/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'Options';
var options = new Options(configs);

function onConfigChanged(aKey) {
  switch (aKey) {
    case 'debug':
      if (configs.debug)
        document.documentElement.classList.add('debugging');
      else
        document.documentElement.classList.remove('debugging');
      break;
  }

  var checkbox = document.querySelector(`label > input[type="checkbox"]#${aKey}`);
  if (checkbox) {
    if (checkbox.checked)
      checkbox.parentNode.classList.add('checked');
    else
      checkbox.parentNode.classList.remove('checked');
  }
}

function actionGroup(aParams) {
  return `
    <h2>__MSG_config.action.group.${aParams.group}__</h2>
    ${aParams.content}
  `;
}

function actionFieldSet(aParams) {
  return `
    <fieldset class="action-definition">
      <legend>__MSG_config.action.${aParams.action}__</legend>
      ${aParams.content}
    </fieldset>
  `;
}

function actionCheckboxes(aParams) {
  var base   = aParams.base;
  var action = aParams.action;
  var type   = aParams.type;
  return `
    <p><label><input id="${base}_${action}_${type}"
                     type="checkbox">
              __MSG_config.trigger.${type}__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_alt"
                     type="checkbox">
              __MSG_config.trigger.alt__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_ctrl"
                     type="checkbox">
              __MSG_config.trigger.ctrl__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_meta"
                     type="checkbox">
              __MSG_config.trigger.meta__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_shift"
                     type="checkbox">
              __MSG_config.trigger.shift__</label></p>
  `;
}

configs.$addObserver(onConfigChanged);
window.addEventListener('DOMContentLoaded', () => {
  configs.$loaded.then(() => {
    var fragment = document.createDocumentFragment();
    var range = document.createRange();
    range.selectNodeContents(document.querySelector('#actions'));
    range.insertNode(range.createContextualFragment(
      ['action', 'actionInEditable'].map(base =>
        actionGroup({
          group: base,
          content: ['select', 'current', 'tab', 'tabBackground', 'window', 'copy'].map(action =>
            actionFieldSet({
              action,
              content: ['dblclick', 'enter'].map(type =>
                actionCheckboxes({ base, action, type })).join('\n')
            })).join('\n')
        })).join('\n')
    ));
    range.detach();
    l10n.updateDocument();

    options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
    onConfigChanged('debug');

    setTimeout(() => {
      for (let checkbox of document.querySelectorAll('label > input[type="checkbox"]')) {
        if (checkbox.checked)
          checkbox.parentNode.classList.add('checked');
        else
          checkbox.parentNode.classList.remove('checked');
      }
    }, 0);

    for (let resetButton of document.querySelectorAll('[data-reset-target]')) {
      let id = resetButton.getAttribute('data-reset-target');
      let field = document.querySelector(`#${id}`);
      if (!field)
        continue;
      resetButton.addEventListener('click', () => {
        field.$reset();
      });
      resetButton.addEventListener('keypress', (aEvent) => {
        if (aEvent.keyCode == aEvent.DOM_VK_ENTER ||
            aEvent.keyCode == aEvent.DOM_VK_RETURN)
          field.$reset();
      });
    }
  });
}, { once: true });
