# History

 - master/HEAD
   * Works on Nightly 48.0a1.
   * Update pl locale ([by Piotr Drąg, thanks!](https://github.com/piroor/textlink/pull/52))
   * Deactivate context menu items correctly when there is no URI in the selection.
   * Deactivate tooltip on disabled menu items in the context menu.
 - 5.0.2015060501
   * Works correctly on the multi-process mode (E10S).
   * Improved: Add a new locale hy-AM (Armenian), translated by [Hrant Ohanyan](http://haysoft.org). Thanks!
 - 4.1.2013040601
   * Fixed: Some odd behaviors around selection range are corrected.
   * Modified: "jar" archive is no longer included.
 - 4.1.2012122901
   * Works on Nightly 20.0a1.
   * Drop support for Firefox 9 and older versions.
   * Improved: For context menu features, now URIs in the selection range are detected progressively. The context menu on web pages are shown quickly.
   * Improved: Add support for URIs with port number.
   * Fixed: Load selected single URI into the current tab correctly.
   * Fixed: Detect URI from selection correctly, for some edge cases.
 - 4.0.2011021601
   * Fixed: Migration of preferences was failed if user had custom values.
 - 4.0.2011021301
   * Improved: IDN recognition can be activated for specific schemes ("http", "https", "ftp", "news", "nntp", "telnet" and "irc" by default).
   * Improved: "data:" URIs can be recognized by default.
   * Fixed: URLs includes inline password (like "user:pass@domain") can be recognized again.
   * Fixed: URIs without valid TLD (about: URIs, chrome: URLs and so on) can be recognized again.
   * Fixed: Context menu items were always hidden on input fields unexpectedly.
   * Fixed: URI detecton was failed when the selection range contains any input field.
 - 4.0.2011020501
   * Fixed: "Open selected URIs in tabs" feature didn't work on Minefield.
 - 4.0.2011012101
   * Works on Minefield 4.0b10pre.
   * Drop support for Firefox 3.0 and older versions.
   * Works on Thunderbird 3.1.
   * Drop support for Thunderbird 2 and older versions.
   * Improved: IDN (Internationalized Domain Names) can be recognized.
   * Fixed: Too slow context menu on web pages with no selection disappeared.
   * German locale is added, by Michael Baer.
 - 3.1.2009110201
   * Improved: Built-in TLD list is updated.
   * Fixed: Keyboard events are ignored except Enter (Return) key.
   * Fixed: Safer code.
   * French locale is updated. (by menet)
   * Turkish locale is updated. (by An娼ﾅl Y娼ﾅld娼ﾅz)
 - 3.1.2009032701
   * Fixed: Open-parenthesis after URI strings are correctly ignored.
   * Fixed: Some links wrongly linkified by Thunderbird are correctly unlinkified.
 - 3.1.2009032601
   * Improved: Works on Thunderbird too.
   * Fixed: URI strings like "URL:http://..." are correctly detected.
   * Updated: zh-TW locale is updated by by Alan CHENG.
 - 3.0.2009031801
   * Optimized.
 - 3.0.2009031701
   * Improved: Works faster on Firefox 3.
   * Fixed: Building process of the tooltip stops correctly after the tooltip was hidden.
   * Fixed: Text nodes in different block-level elements are recognized as split texts.
 - 3.0.2009030901
   * Fixed: Works on Firefox 2 correctly.
   * Fixed: Double-click and other actions for single URI in plain text work correctly.
   * Improved: Less time to show context menu.
 - 3.0.2009022402
   * Fixed: Performance problem on long webpages mostly disappeared.
   * Fixed: URI-like strings out of selections are ignored correctly.
 - 3.0.2009022401
   * Fixed: Works on plain text files correctly.
   * Fixed: Works on pages which have hidden texts.
   * Modified: Both full-width characters "¥u301c" and "¥uff5e" are regarded as "‾".
 - 3.0.2009021901
   * Fixed: Mistake in default rule of URI fixup for domains which start with "www." or "ftp." is corrected.
   * Turkish locale is updated. (by An娼ﾅl Y娼ﾅld娼ﾅz)
 - 3.0.2009021801
   * Fixed: Operations on webpages which have many short text are optimized.
 - 3.0.2009021601
   * Improved: You can open URIs from text fields by the context menu.
   * Fixed: Freezing on GMail disappeared. (URI-like strings in hidden elements, ex. &lt;style&gt; and others, are now ignored.)
 - 3.0.2009021502
   * Fixed: Strings next to &lt;BR&gt; just after URI string are ignored correctly. In old versions, a wrong URI "http://example.com/foobar" was detected from HTML "http://example.com/&lt;BR&gt;foobar".
   * Modified: Preceding invalid characters of an URI string are ignored if parsing of relative path is disabled.
   * French locale is updated. (by menet)
 - 3.0.2009021401
   * Improved: "Copy selected URIs" feature is available.
   * Improved: "Copy clicked URI" is available for clicking on URI strings.
   * Improved: Multiple selections are available on Firefox 3 or later.
   * Improved: All of detected URIs in the selection are shown in a tooltip on context menu items.
   * Fixed: Just URI string is selected when it is clicked. Parenthesis around URIs are never selected.
 - 2.1.2009021301
   * Drop support of Firefox older than Firefox 2.
   * Configuration dialog is totally rewritten for modern Firefox.
 - 2.0.2008052801
   * Improved: New "Reset" button is available to get default settings back.
   * Fixed: Features in the context menu work correctly.
   * French locale is updated. (by BlackJack)
   * Turkish locale is available. (by An娼ﾅl Y娼ﾅld娼ﾅz)
 - 2.0.2008052701
   * Hungarian locale is available. (by Mikes Kaszm将｡n Istv将｡n)
   * French locale is updated. (by menet)
 - 2.0.2008052601
   * Fixed: Domain names without schemer part are loaded correctly.
   * Fixed: Duplicated URIs are ignored for "Open Selection URIs" feature.
 - 2.0.2008050601
   * Updated: Traditional Chinese locale is updated.
 - 2.0.2008042801
   * Modified: Some obsolete codes are removed.
 - 2.0.2007111301
   * Updated: Italian locale is updated.
 - 2.0.2007111201
   * Fixed: DTD error in Italian locale is fixed.
 - 2.0.2007111103
   * Fixed: Italian locale is detected correctly.
   * Added: Icon for add-on manager is available. (original designed by Marco C.)
 - 2.0.2007111102
   * Added: Italian locale is available. (made by Marco C.)
 - 2.0.2007111101
   * Improved: Multiple actions can be defined.
   * Improved: Works on Minefield.
 - 1.3.2007110501
   * Added: Traditional Chinese locale is available. (made by Alan CHENG)
 - 1.3.2007103002
   * Fixed: Ignores URIs in rich text area like GMail, Google Docs, etc.
 - 1.3.2007103001
   * Added: Chinese locale is available. (made by Carlos Oliveira)
 - 1.3.2007102201
   * Improved: Works with [Tree Style Tab](http://piro.sakura.ne.jp/xul/_treestyletab.html.en).
 - 1.3.2006100702
   * Improved: Warning for too many tabs to be opened is supported in Firefox 2.0.
 - 1.3.2006100701
   * Improved: The "tab owner" feauter of Firefox 2.0 is supported.
 - 1.3.20060328
   * The French language pack is corrected and updated. (by menet)
 - 1.3.2006032701
   * Improved: A new mode, "Select Mode" is available. In this mode, URI strings are only selected, aren't loaded.
   * Fixed: URI strings are correctly selected.
 - 1.3.2006032601
   * Improved: Pressing Enter key loads URI text when a part of URI is highlighted by "Find As You Type" or in the Caret-browsing mode.
   * Fixed: Broken context menu is corrected.
 - 1.3.2006031401
   * Improved: "Open in New Tabs" and other extra features in the context menu always load partly selected URIs too.
   * Fixed: Mis-detection for URIs which are placed after English terms disappeared.
   * Improved: French Language Pack available. (made by menet)
 - 1.3.2006031301
   * Fixed: Mode setting can be loaded/saved correctly.
   * Fixed: URI texts are detected correctly even if both relative pathes and full-width characters are available.
   * Fixed: URIs are loaded into a background tab correctly by your setting.
 - 1.3.2006031201
   * Improved: Wildcards ("*" and "?") are available in the patterns of fixing up broken URIs. Please click "Reset" button in the dialog if you are using a customized pattern.
   * Improved: URIs start with "www" or other patterns without schemer can be recognized. Please click "Reset" button in the dialog if you are using a customized pattern.
   * Improved: URIs including parenthesis ("(" or ")") are recognized more correctly.
   * Improved: The algorithm to convert full-width characters to half-width characters is optimized. (based on implementation written by [Taken](http://taken.s101.xrea.com/blog/article.php?id=510))
   * Modified: The configuration dialog is restructured.
   * Modified: The default settings are modified.
 - 1.3.2006031001
   * Fixed: An mistake in the English Language Pack disappeared.
   * Fixed: Broken label of an extra menuitem in the context menu for multiple URI texts is corrected.
   * Improved: URI strings start with "h**p" and "h++p" can be recognized.
   * Improved: Some characters not only "," are available to separete values of preference settings.
 - 1.3.2006030901
   * Improved: Modifier keys are available to load clicked URI text.
   * Modified: The setting to change which to load new tabs in in the foreground or the background.
   * Fixed: The large delay of showing the context menu on webpages disappeared.
   * Improved: The size of the searching range for the clicked point can be customizable with a secret setting: "textlink.find_range_size".
 - 1.3.2006022101
   * Improved: Extra menu items for the context menu on web pages are improved.
 - 1.3.2005121301
   * Fixed: Works correctly even if in the loose mode.
 - 1.3.2005070402
   * Fixed: Clicked URI strings are loaded correctly for any case.
   * Improved: Double-clicked URI strings are selected automatically.
 - 1.3.2005070401
   * Fixed: Clicked URI strings are loaded correctly for any case.
 - 1.3.2005062901
   * Fixed: Fatal error for some webpages disappeared.
 - 1.3.2005062801
   * URI strings made from multiple nodes can be parsed as URI strings correctly. The implementation of XUL/Migemo gives me this idea.
 - 1.2.2005041901
   * Modified: Codes to access content area become secure.
 - 1.2.2005021001
   * Improved: URI strings are detected more precisely.
 - 1.2.2005020901
   * Improved: A new feature to open all of URI strings in the selection is available.
 - 1.1.2005012901
   * Fixed: An fatal error about getting chrome URL of the default browser in the lately Firefox disappeared.
 - 1.1.2004121601
   * Fixed: Errors on initializing and closing disappeared.
   * Fixed: Possibility of errors on some webpages (Movable Type 3.0, etc.) disappeared.
 - 1.1.2004090301
   * Improved: New configuration dialog is available.
   * Improved: Multi-byte characters are supported.
 - 1.0.2004083102
   * Fixed: Relative links are parsed more correctly
 - 1.0.2004083101
   * Fixed: Some characters ("(", ")", ".", and ",") are ignored when they are in the start or the end of URL strings.
 - 1.0.2004080701
   * Fixed: Table of schemers fixed up are completely available.
 - 1.0.2004080201
   * Improved: Two options are available instead of the old autocomplete option.
 - 1.0.2004041101
   * Improved: Patterns matching to URIs have been brushed up.
 - 1.0.2004021703
   * Fixed: Checkbox for HTTP_REFERER blocking has worked correctly.
 - 1.0.2004021702
   * Fixed: HTTP_REFERER has been blocked correctly.
 - 1.0.2004021701
   * Released.
