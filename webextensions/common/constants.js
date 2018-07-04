/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const kCOMMAND_TRY_ACTION       = 'textlink:try-action';
export const kCOMMAND_FIND_URI_RANGES  = 'textlink:find-uri-ranges';
export const kCOMMAND_ACTION_FOR_URIS  = 'textlink:action-for-uris';
export const kCOMMAND_FETCH_URI_RANGES = 'textlink:fetch-uri-ranges';
export const kNOTIFY_READY_TO_FIND_URI_RANGES = 'textlink:ready-to-find-uri-ranges';

export const kNOTIFY_MATCH_ALL_PROGRESS        = 'textlink:match-all-progress';
export const kCOMMAND_FETCH_MATCH_ALL_PROGRESS = 'textlink:fetch-match-all-progress';

export const kACTION_DISABLED               = 0;
export const kACTION_SELECT                 = 1 << 1;
export const kACTION_OPEN_IN_CURRENT        = 1 << 2;
export const kACTION_OPEN_IN_WINDOW         = 1 << 3;
export const kACTION_OPEN_IN_TAB            = 1 << 4;
export const kACTION_OPEN_IN_BACKGROUND_TAB = 1 << 5;
export const kACTION_COPY                   = 1 << 10;

export const kACTION_NAME_TO_ID = {
  'select':        kACTION_SELECT,
  'current':       kACTION_OPEN_IN_CURRENT,
  'tab':           kACTION_OPEN_IN_TAB,
  'tabBackground': kACTION_OPEN_IN_BACKGROUND_TAB,
  'copy':          kACTION_COPY
};

export const kDOMAIN_MULTIBYTE = 1 << 0;
export const kDOMAIN_LAZY      = 1 << 1;
export const kDOMAIN_IDN       = 1 << 2;

