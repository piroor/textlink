/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

var kCOMMAND_TRY_ACTION       = 'textlink:try-action';
var kCOMMAND_FIND_URI_RANGES  = 'textlink:find-uri-ranges';
var kCOMMAND_ACTION_FOR_URIS  = 'textlink:action-for-uris';
var kCOMMAND_FETCH_URI_RANGES = 'textlink:fetch-uri-ranges';
var kNOTIFY_READY_TO_FIND_URI_RANGES = 'textlink:ready-to-find-uri-ranges';

var kNOTIFY_MATCH_ALL_PROGRESS        = 'textlink:match-all-progress';
var kCOMMAND_FETCH_MATCH_ALL_PROGRESS = 'textlink:fetch-match-all-progress';

var kACTION_DISABLED               = 0;
var kACTION_SELECT                 = 1 << 1;
var kACTION_OPEN_IN_CURRENT        = 1 << 2;
var kACTION_OPEN_IN_WINDOW         = 1 << 3;
var kACTION_OPEN_IN_TAB            = 1 << 4;
var kACTION_OPEN_IN_BACKGROUND_TAB = 1 << 5;
var kACTION_COPY                   = 1 << 10;

var kACTION_NAME_TO_ID = {
  'select':        kACTION_SELECT,
  'current':       kACTION_OPEN_IN_CURRENT,
  'tab':           kACTION_OPEN_IN_TAB,
  'tabBackground': kACTION_OPEN_IN_BACKGROUND_TAB,
  'copy':          kACTION_COPY
};

var kDOMAIN_MULTIBYTE = 1 << 0;
var kDOMAIN_LAZY      = 1 << 1;
var kDOMAIN_IDN       = 1 << 2;

