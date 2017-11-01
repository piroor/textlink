/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

const kCOMMAND_TRY_ACTION       = 'textlink:try-action';
const kNOTIFY_SELECTION_CHANGED = 'textlink:selection-changed';

const kACTION_DISABLED               = 0;
const kACTION_STEALTH                = 1 << 0;
const kACTION_SELECT                 = 1 << 1;
const kACTION_OPEN_IN_CURRENT        = 1 << 2;
const kACTION_OPEN_IN_WINDOW         = 1 << 3;
const kACTION_OPEN_IN_TAB            = 1 << 4;
const kACTION_OPEN_IN_BACKGROUND_TAB = 1 << 5;
const kACTION_COPY                   = 1 << 10;

const kDOMAIN_MULTIBYTE = 1 << 0;
const kDOMAIN_LAZY      = 1 << 1;
const kDOMAIN_IDN       = 1 << 2;

