/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { configs } from './commonConfigs.js';

let gLogContext = '?';
export function setLogContext(context) {
  gLogContext = context;
}

export function log(message, ...args) {
  if (!window.configs || !configs.debug)
    return;

  const nest = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }
  console.log(`TextLink<${gLogContext}>: ${indent}${message}`, ...args);
}

export async function wait(task = 0, timeout = 0) {
  if (typeof task != 'function') {
    timeout = task;
    task = null;
  }
  return new Promise((resolve, _reject) => {
    setTimeout(async () => {
      if (task)
        await task();
      resolve();
    }, timeout);
  });
}

export function nextFrame() {
  return new Promise((resolve, _reject) => {
    window.requestAnimationFrame(resolve);
  });
}

export const RTL_LANGUAGES = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'sd',
  'ckb',
  'prs',
  'rhg',
]);

export function isRTL() {
  const lang = (
    navigator.language ||
    navigator.userLanguage ||
    //(new Intl.DateTimeFormat()).resolvedOptions().locale ||
    ''
  ).split('-')[0];
  return RTL_LANGUAGES.has(lang);
}
