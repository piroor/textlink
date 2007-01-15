// 0=disable, 1=normal, 2=stealth, 3=select
pref("textlink.mode", 1);

pref("textlink.action",              'dblclick');
pref("textlink.action.default",      'dblclick');
pref("textlink.action.key_events",         'VK_ENTER');
pref("textlink.action.key_events.default", 'VK_ENTER');

// 0=current, 1=new window, 2=new tab, 3 = new background tab
pref("textlink.openIn", 0);

pref("textlink.contextmenu.openTextLink.current", true);
pref("textlink.contextmenu.openTextLink.window",  false);
pref("textlink.contextmenu.openTextLink.tab",     true);

pref("textlink.schemer",                     "http https ftp news nntp telnet irc mms ed2k about file urn");
pref("textlink.schemer.default",             "http https ftp news nntp telnet irc mms ed2k about file urn");
pref("textlink.schemer.fixup.table",         "www=>http:\/\/www ftp.=>ftp:\/\/ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https");
pref("textlink.schemer.fixup.table.default", "www=>http:\/\/www ftp.=>ftp:\/\/ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https");

pref("textlink.relative.enabled",    false);
pref("textlink.multibyte.enabled",   true);

pref("textlink.find_click_point.strict", true);
pref("textlink.find_range_size",         512);
