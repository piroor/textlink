var win;
var sv;
var tabs;
var originalWindows;

function setUp()
{
	utils.loadPrefs('../../defaults/preferences/textlink.js');
	utils.setPref('browser.tabs.warnOnClose', false);

	yield Do(utils.setUpTestWindow());
	yield Do(utils.addTab('../fixtures/testcase.html', { selected : true }));
	gBrowser.removeAllTabsBut(gBrowser.selectedTab);

	win = utils.getTestWindow();
	sv = win.TextLinkService;
	tabs = gBrowser.mTabs;
	originalWindows = utils.getChromeWindows();

	var selection = content.getSelection();
	selection.removeAllRanges();

	var range1 = content.document.createRange();
	range1.selectNodeContents(content.document.getElementById('split'));

	var range2 = content.document.createRange();
	range2.selectNodeContents(content.document.getElementById('fullwidth'));

	var range3 = content.document.createRange();
	range3.selectNodeContents(content.document.getElementById('pre'));

	selection.addRange(range1);
	selection.addRange(range2);
	selection.addRange(range3);
}

function tearDown()
{
	var windows = utils.getChromeWindows();
	windows.forEach(function(aWindow) {
		if (originalWindows.indexOf(aWindow) < 0)
			aWindow.close();
	});

	utils.tearDownTestWindow();
}

var uris = [
		'http://www.mozilla.org/',
		'http://www.netscape.com/',
		'http://jt.mozilla.gr.jp/src-faq.html#1',
		'http://jt.mozilla.gr.jp/newlayout/gecko.html',
		'http://ftp.netscape.com/pub/netscape6/',
		'http://white.sakura.ne.jp/~piro/',
		'http://www98.sakura.ne.jp/~piro/',
		'http://www98.sakura.ne.jp/~piro/entrance/',
		'http://piro.sakura.ne.jp/latest/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
		'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
		'http://piro.sakura.ne.jp/xul/',
		'http://piro.sakura.ne.jp/xul/tips/'
	];

var ranges = [
		'http://www.mozilla.org/',
		'http://www.netscape.com/',
		'http://jt.mozilla.gr.jp/src-faq.html#1',
		'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
		'ttp://ftp.netscape.com/pub/netscape6/',
		'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
		'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
		'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\u301cｐｉｒｏ／ｅｎｔｒａｎｃｅ／',
		'http://piro.sakura.ne.jp/latest/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
		'ttp://piro.sakura.ne.jp/latest/blosxom/webtech/',
		'ttp://piro.sakura.ne.jp/xul/',
		'ttp://piro.sakura.ne.jp/xul/tips/'
	];

function assertSelectionRanges(aFrame)
{
	var selection = aFrame.getSelection();
	assert.equals(uris.length, selection.rangeCount);
	for (var i = 0, maxi = ranges.length; i < maxi; i++)
	{
		assert.equals(ranges[i], selection.getRangeAt(i).toString());
	}
}

function testCopy()
{
	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	utils.setClipBoard(uris.concat(['']).join('\r\n'));
	var expectedValue = utils.getClipBoard();
	assert.notEquals('test', expectedValue);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	sv.openTextLinkIn(sv.ACTION_COPY);

	assert.equals(1, tabs.length);
	assert.equals(expectedValue, utils.getClipBoard());

	assertSelectionRanges(content);
}

function testOpenInCurrent()
{
	var unloaded = false;
	content.addEventListener('unload', function(aEvent) {
		aEvent.currentTarget.removeEventListener('unload', arguments.callee, false);
		unloaded = true;
	}, false);

	sv.openTextLinkIn(sv.ACTION_OPEN_IN_CURRENT);
	yield 300;
	assert.equals(uris.length, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.isTrue(unloaded);
}

function testOpenInTabs()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_TAB);
	assert.equals(uris.length+1, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);

	assertSelectionRanges(tabs[0].linkedBrowser.contentWindow);
}

function testOpenInBackgroundTabs()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_BACKGROUND_TAB);
	assert.equals(uris.length+1, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);

	assertSelectionRanges(content);
}

function testOpenInWindows()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_WINDOW);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals(
		originalWindows.length + uris.length,
		utils.getChromeWindows().length
	);

	assertSelectionRanges(content);
}

