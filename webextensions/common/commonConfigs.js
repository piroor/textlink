/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '../extlib/Configs.js'

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

  // http://www4.plala.or.jp/nomrax/TLD/ 
  // http://ja.wikipedia.org/wiki/%E3%83%88%E3%83%83%E3%83%97%E3%83%AC%E3%83%99%E3%83%AB%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E4%B8%80%E8%A6%A7
  // http://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
  gTLD: `
aero
arpa
asia
biz
cat
com
coop
edu
gov
info
int
jobs
mil
mobi
museum
name
nato
net
org
pro
tel
travel
  `,
  ccTLD: `
ac
ad
ae
af
ag
ai
al
am
an
ao
aq
ar
as
at
au
aw
ax
az
ba
bb
bd
be
bf
bg
bh
bi
bj
bm
bn
bo
br
bs
bt
bv
bw
by
bz
ca
cc
cd
cf
cg
ch
ci
ck
cl
cm
cn
co
cr
cs
cu
cv
cx
cy
cz
dd
de
dj
dk
dm
do
dz
ec
ee
eg
eh
er
es
et
eu
fi
fj
fk
fm
fo
fr
ga
gb
gd
ge
gf
gg
gh
gi
gl
gm
gn
gp
gq
gr
gs
gt
gu
gw
gy
hk
hm
hn
hr
ht
hu
id
ie
il
im
in
io
iq
ir
is
it
je
jm
jo
jp
ke
kg
kh
ki
km
kn
kp
kr
kw
ky
kz
la
lb
lc
li
lk
lr
ls
lt
lu
lv
ly
ma
mc
md
me
mg
mh
mk
ml
mm
mn
mo
mp
mq
mr
ms
mt
mu
mv
mw
mx
my
mz
na
nc
ne
nf
ng
ni
nl
no
np
nr
nu
nz
om
pa
pe
pf
pg
ph
pk
pl
pm
pn
pr
ps
pt
pw
py
qa
re
ro
rs
ru
rw
sa
sb
sc
sd
se
sg
sh
si
sj
sk
sl
sm
sn
so
sr
st
su
sv
sy
sz
tc
td
tf
tg
th
tj
tk
tl
tm
tn
to
tp
tr
tt
tv
tw
tz
ua
ug
uk
um
us
uy
uz
va
vc
ve
vg
vi
vn
vu
wf
ws
ye
yt
yu
za
zm
zr
zw
  `,
  IDN_TLD: `
\u4e2d\u56fd
\u4e2d\u570b
\u0645\u0635\u0631
\u9999\u6e2f
\u0627\u06cc\u0631\u0627\u0646
\u0627\u0644\u0627\u0631\u062f\u0646
\u0641\u0644\u0633\u0637\u064a\u0646
\u0440\u0444
\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629
\u0dbd\u0d82\u0d9a\u0dcf
\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8
\u53f0\u6e7e
\u53f0\u7063
\u0e44\u0e17\u0e22
\u062a\u0648\u0646\u0633
\u0627\u0645\u0627\u0631\u0627\u062a
  `,
  extraTLD: '',

  // Services.prefs.getStringPref('network.IDN.blacklist_chars').split('').map(aChar => `\\u${('0000'+aChar.charCodeAt(0).toString(16)).substr(-4)}`).join('')
  IDNBlacklistChars: '\u0020\u00a0\u00bc\u00bd\u00be\u01c3\u02d0\u0337\u0338\u0589\u058a\u05c3\u05f4\u0609\u060a\u066a\u06d4\u0701\u0702\u0703\u0704\u115f\u1160\u1735\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u200e\u200f\u2010\u2019\u2024\u2027\u2028\u2029\u202a\u202b\u202c\u202d\u202e\u202f\u2039\u203a\u2041\u2044\u2052\u205f\u2153\u2154\u2155\u2156\u2157\u2158\u2159\u215a\u215b\u215c\u215d\u215e\u215f\u2215\u2236\u23ae\u2571\u29f6\u29f8\u2afb\u2afd\u2ff0\u2ff1\u2ff2\u2ff3\u2ff4\u2ff5\u2ff6\u2ff7\u2ff8\u2ff9\u2ffa\u2ffb\u3000\u3002\u3014\u3015\u3033\u30a0\u3164\u321d\u321e\u33ae\u33af\u33c6\u33df\ua789\ufe14\ufe15\ufe3f\ufe5d\ufe5e\ufeff\uff0e\uff0f\uff61\uffa0\ufff9\ufffa\ufffb\ufffc\ufffd',

  debug: false
};

{
  let isMac = /^Mac/i.test(navigator.platform);
  for (let action of defaultActions) {
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
  for (let action of defaultActionsInEditable) {
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

export default const configs = new Configs(defaultConfigs, {
  syncKeys: Object.keys(defaultConfigs)
});
