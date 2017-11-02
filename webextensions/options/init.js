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

configs.$addObserver(onConfigChanged);
window.addEventListener('DOMContentLoaded', () => {
  configs.$loaded.then(() => {
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
