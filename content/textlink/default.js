// load to...
//   0  = do nothing
//   2  = only select
//   4  = load in current tab
//   8  = open in window
//   16 = new tab
//   32 = new background tab
// referrer
//   0  = send
//   1  = don't send (stealth)
// example:
//   4  + 1 = 5  : load in current tab without referrer
//   16 + 0 = 16 : open new foreground tab with referrer
pref("textlink.actions.0.action",        16);
pref("textlink.actions.0.trigger.mouse", "dblclick");
pref("textlink.actions.0.trigger.key",   "VK_ENTER");
pref("textlink.actions.1.action",        32);
pref("textlink.actions.1.trigger.mouse", "shift-dblclick");
pref("textlink.actions.1.trigger.key",   "shift-VK_ENTER");
pref("textlink.actions.2.action",        4);
pref("textlink.actions.2.trigger.mouse", "accel-dblclick");
pref("textlink.actions.2.trigger.key",   "accel-VK_ENTER");
pref("textlink.actions.3.action",        0);
pref("textlink.actions.3.trigger.mouse", "");
pref("textlink.actions.3.trigger.key",   "");
pref("textlink.actions.4.action",        0);
pref("textlink.actions.4.trigger.mouse", "");
pref("textlink.actions.4.trigger.key",   "");
pref("textlink.actions.5.action",        0);
pref("textlink.actions.5.trigger.mouse", "");
pref("textlink.actions.5.trigger.key",   "");
// you can add more and more definitions!

pref("textlink.contextmenu.openTextLink.current", true);
pref("textlink.contextmenu.openTextLink.window",  false);
pref("textlink.contextmenu.openTextLink.tab",     true);

pref("textlink.schemer",                     "http https ftp news nntp telnet irc mms ed2k about file urn");
pref("textlink.schemer.default",             "http https ftp news nntp telnet irc mms ed2k about file urn");
pref("textlink.schemer.fixup.table",         "www=>http:\/\/www ftp.=>ftp:\/\/ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https");
pref("textlink.schemer.fixup.table.default", "www=>http:\/\/www ftp.=>ftp:\/\/ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https");
pref("textlink.schemer.fixup.default", "http");

pref("textlink.relative.enabled",    false);
pref("textlink.multibyte.enabled",   true);

pref("textlink.find_click_point.strict", true);
pref("textlink.find_range_size",         512);
