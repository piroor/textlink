/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

gLogContext = 'Options';
let options;

function onConfigChanged(key) {
  switch (key) {
    case 'debug':
      if (configs.debug)
        document.documentElement.classList.add('debugging');
      else
        document.documentElement.classList.remove('debugging');
      break;
  }

  const checkbox = document.querySelector(`label > input[type="checkbox"]#${key}`);
  if (checkbox) {
    if (checkbox.checked)
      checkbox.parentNode.classList.add('checked');
    else
      checkbox.parentNode.classList.remove('checked');
  }
}

function actionGroup(params) {
  return `
    <h2>__MSG_config_action_group_${params.group}__</h2>
    ${params.content}
  `;
}

function actionFieldSet(params) {
  return `
    <fieldset class="action-definition">
      <legend>__MSG_config_action_${params.action}__</legend>
      ${params.content}
    </fieldset>
  `;
}

function actionCheckboxes(params) {
  const base   = params.base;
  const action = params.action;
  const type   = params.type;
  return `
    <p><label><input id="${base}_${action}_${type}"
                     type="checkbox">
              __MSG_config_trigger_${type}__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_alt"
                     type="checkbox">
              __MSG_config_trigger_alt__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_ctrl"
                     type="checkbox">
              __MSG_config_trigger_ctrl__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_meta"
                     type="checkbox">
              __MSG_config_trigger_meta__</label>
       <span class="delimiter">-</span>
       <label><input id="${base}_${action}_${type}_shift"
                     type="checkbox">
              __MSG_config_trigger_shift__</label></p>
  `;
}

window.addEventListener('DOMContentLoaded', async () => {
  await configs.$loaded;
  configs.$addObserver(onConfigChanged);

  const fragment = document.createDocumentFragment();
  const range = document.createRange();
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

  options = new Options(configs);
  options.onReady();
  options.buildUIForAllConfigs(document.querySelector('#debug-configs'));
  onConfigChanged('debug');

  setTimeout(() => {
    for (const checkbox of document.querySelectorAll('label > input[type="checkbox"]')) {
      if (checkbox.checked)
        checkbox.parentNode.classList.add('checked');
      else
        checkbox.parentNode.classList.remove('checked');
    }
  }, 0);

  for (const resetButton of document.querySelectorAll('[data-reset-target]')) {
    const id = resetButton.getAttribute('data-reset-target');
    const field = document.querySelector(`#${id}`);
    if (!field)
      continue;
    resetButton.addEventListener('click', () => {
      field.$reset();
    });
    resetButton.addEventListener('keyup', (event) => {
      if (event.key == 'Enter')
        field.$reset();
    });
  }

  document.documentElement.classList.add('initialized');
}, { once: true });
