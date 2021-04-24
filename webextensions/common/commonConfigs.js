/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

const defaultActions = [
  { action:       'select',
    triggerMouse: '',
    triggerKey:   '' },
  { action:       'current',
    triggerMouse: 'accel,dblclick',
    triggerKey:   'accel,enter' },
  { action:       'tab',
    triggerMouse: 'dblclick',
    triggerKey:   'enter' },
  { action:       'tabBackground',
    triggerMouse: 'shift,dblclick',
    triggerKey:   'shift,enter' },
  { action:       'window',
    triggerMouse: '',
    triggerKey:   '' },
  { action:       'copy',
    triggerMouse: '',
    triggerKey:   '' }
];
const defaultActionsInEditable = [
  { action:       'select',
    triggerMouse: 'dblclick',
    triggerKey:   '' },
  { action:       'current',
    triggerMouse: '',
    triggerKey:   '' },
  { action:       'tab',
    triggerMouse: 'accel,dblclick',
    triggerKey:   'accel,enter' },
  { action:       'tabBackground',
    triggerMouse: '',
    triggerKey:   '' },
  { action:       'window',
    triggerMouse: '',
    triggerKey:   '' },
  { action:       'copy',
    triggerMouse: '',
    triggerKey:   '' }
];

const defaultConfigs = {
  menu_openCurrent_single:   false,
  menu_openCurrent_multiple: false,
  menu_openTab_single:       true,
  menu_openTab_multiple:     true,
  menu_openWindow_single:    true,
  menu_openWindow_multiple:  false,
  menu_copy_single:          true,
  menu_copy_multiple:        true,

  showProgress:               true,
  scheme:                     'http https ftp news nntp telnet irc mms ed2k about file urn chrome resource data',
  schemeFixupTable:           'www=>http://www ftp.=>ftp://ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https',
  schemeFixupDefault:         'http',
  relativeEnabled:            false,
  multibyteEnabled:           true,
  multilineEnabled:           false,
  IDNEnabled:                 true,
  IDNScheme:                  'http https ftp news nntp telnet irc',
  i18nPathEnabled:            false,
  partExceptionWhole:         '-+|=+|(?:-=)+-?|(?:=-)=?|\\#+|\\++|\\*+|~+|[+-]?\\d+:\\d+(?::\\d+)?',
  partExceptionStart:         '-+|=+|(?:-=)+-?|(?:=-)=?|\\#+|\\++|\\*+|~+|[+-]?\\d+:\\d+(?::\\d+)?|[\\.\u3002\uff0e]+[^\\.\u3002\uff0e\/\uff0f]',
  partExceptionEnd:           '-+|=+|(?:-=)+-?|(?:=-)=?|\\#+|\\++|\\*+|~+|[+-]?\\d+:\\d+(?::\\d+)?',
  IDNLazyDetectionSeparators: '\u3001\u3002',

  rangeFindTimeout: 500,
  rangeFindRetryDelay: 100,

  // Services.prefs.getStringPref('network.IDN.blacklist_chars').split('').map(aChar => `\\u${('0000'+aChar.charCodeAt(0).toString(16)).substr(-4)}`).join('')
  IDNBlacklistChars: '\u0020\u00a0\u00bc\u00bd\u00be\u01c3\u02d0\u0337\u0338\u0589\u058a\u05c3\u05f4\u0609\u060a\u066a\u06d4\u0701\u0702\u0703\u0704\u115f\u1160\u1735\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u200e\u200f\u2010\u2019\u2024\u2027\u2028\u2029\u202a\u202b\u202c\u202d\u202e\u202f\u2039\u203a\u2041\u2044\u2052\u205f\u2153\u2154\u2155\u2156\u2157\u2158\u2159\u215a\u215b\u215c\u215d\u215e\u215f\u2215\u2236\u23ae\u2571\u29f6\u29f8\u2afb\u2afd\u2ff0\u2ff1\u2ff2\u2ff3\u2ff4\u2ff5\u2ff6\u2ff7\u2ff8\u2ff9\u2ffa\u2ffb\u3000\u3002\u3014\u3015\u3033\u30a0\u3164\u321d\u321e\u33ae\u33af\u33c6\u33df\ua789\ufe14\ufe15\ufe3f\ufe5d\ufe5e\ufeff\uff0e\uff0f\uff61\uffa0\ufff9\ufffa\ufffb\ufffc\ufffd',

  debug: false
};

{
  const isMac = /^Mac/i.test(navigator.platform);
  for (const action of defaultActions) {
    defaultConfigs[`action_${action.action}_dblclick`]       = /dblclick/.test(action.triggerMouse);
    defaultConfigs[`action_${action.action}_dblclick_alt`]   = /alt/.test(action.triggerMouse);
    defaultConfigs[`action_${action.action}_dblclick_ctrl`]  = /ctrl/.test(action.triggerMouse) || !isMac && /accel/.test(action.triggerMouse);
    defaultConfigs[`action_${action.action}_dblclick_meta`]  = /meta/.test(action.triggerMouse) || isMac && /accel/.test(action.triggerMouse);
    defaultConfigs[`action_${action.action}_dblclick_shift`] = /shift/.test(action.triggerMouse);
    defaultConfigs[`action_${action.action}_enter`]       = /enter/.test(action.triggerKey);
    defaultConfigs[`action_${action.action}_enter_alt`]   = /alt/.test(action.triggerKey);
    defaultConfigs[`action_${action.action}_enter_ctrl`]  = /ctrl/.test(action.triggerKey) || !isMac && /accel/.test(action.triggerKey);
    defaultConfigs[`action_${action.action}_enter_meta`]  = /meta/.test(action.triggerKey) || isMac && /accel/.test(action.triggerKey);
    defaultConfigs[`action_${action.action}_enter_shift`] = /shift/.test(action.triggerKey);
  }
  for (const action of defaultActionsInEditable) {
    defaultConfigs[`actionInEditable_${action.action}_dblclick`]       = /dblclick/.test(action.triggerMouse);
    defaultConfigs[`actionInEditable_${action.action}_dblclick_alt`]   = /alt/.test(action.triggerMouse);
    defaultConfigs[`actionInEditable_${action.action}_dblclick_ctrl`]  = /ctrl/.test(action.triggerMouse) || !isMac && /accel/.test(action.triggerMouse);
    defaultConfigs[`actionInEditable_${action.action}_dblclick_meta`]  = /meta/.test(action.triggerMouse) || isMac && /accel/.test(action.triggerMouse);
    defaultConfigs[`actionInEditable_${action.action}_dblclick_shift`] = /shift/.test(action.triggerMouse);
    defaultConfigs[`actionInEditable_${action.action}_enter`]       = /enter/.test(action.triggerKey);
    defaultConfigs[`actionInEditable_${action.action}_enter_alt`]   = /alt/.test(action.triggerKey);
    defaultConfigs[`actionInEditable_${action.action}_enter_ctrl`]  = /ctrl/.test(action.triggerKey) || !isMac && /accel/.test(action.triggerKey);
    defaultConfigs[`actionInEditable_${action.action}_enter_meta`]  = /meta/.test(action.triggerKey) || isMac && /accel/.test(action.triggerKey);
    defaultConfigs[`actionInEditable_${action.action}_enter_shift`] = /shift/.test(action.triggerKey);
  }
}

var configs = new Configs(defaultConfigs, {
  syncKeys: Object.keys(defaultConfigs)
});
