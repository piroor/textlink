utils.include('common.inc.js');

var selection;

function selectRange1()
{
	var range = content.document.createRange();
	range.selectNodeContents(content.document.getElementById('split'));
	selection.addRange(range);
}
var urisInRange1 = [
		'http://www.mozilla.org/',
		'http://www.netscape.com/',
		'http://jt.mozilla.gr.jp/src-faq.html#1',
		'http://jt.mozilla.gr.jp/newlayout/gecko.html',
		'http://ftp.netscape.com/pub/netscape6/'
	];
var rangesInRange1 = [
		'http://www.mozilla.org/',
		'http://www.netscape.com/',
		'http://jt.mozilla.gr.jp/src-faq.html#1',
		'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
		'ttp://ftp.netscape.com/pub/netscape6/'
	];

function selectRange2()
{
	var range = content.document.createRange();
	range.selectNodeContents(content.document.getElementById('fullwidth'));
	selection.addRange(range);
}
var urisInRange2 = [
		'http://white.sakura.ne.jp/~piro/',
		'http://www98.sakura.ne.jp/~piro/',
		'http://www98.sakura.ne.jp/~piro/entrance/'
	];
var rangesInRange2 = [
		'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
		'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
		'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\u301cｐｉｒｏ／ｅｎｔｒａｎｃｅ／'
	];

function selectRange3()
{
	var range = content.document.createRange();
	range.selectNodeContents(content.document.getElementById('pre'));
	selection.addRange(range);
}
var urisInRange3 = [
		'http://piro.sakura.ne.jp/latest/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
		'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
		'http://piro.sakura.ne.jp/xul/',
		'http://piro.sakura.ne.jp/xul/tips/'
	];
var rangesInRange3 = [
		'http://piro.sakura.ne.jp/latest/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
		'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
		'ttp://piro.sakura.ne.jp/latest/blosxom/webtech/',
		'ttp://piro.sakura.ne.jp/xul/',
		'ttp://piro.sakura.ne.jp/xul/tips/'
	];

var uris = urisInRange1.concat(urisInRange2, urisInRange3);
var ranges = rangesInRange1.concat(rangesInRange2, rangesInRange3);

function assertSelectionRanges(aFrame, aURIs, aRanges)
{
	var selection = aFrame.getSelection();
	assert.equals(aURIs.length, selection.rangeCount);
	for (var i = 0, maxi = aRanges.length; i < maxi; i++)
	{
		assert.equals(aRanges[i], selection.getRangeAt(i).toString());
	}
}

function setUp()
{
	yield Do(commonSetUp());

	selection = content.getSelection();
	selection.removeAllRanges();
	selectRange1();
	selectRange2();
	selectRange3();
}

function tearDown()
{
	yield Do(commonTearDown());
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

	assertSelectionRanges(content, uris, ranges);
}

function testOpenInCurrent()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_CURRENT);
	yield 300;
	assert.equals(uris.length, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.isTrue(isFirstTabUnloaded());
}

function testOpenInTabs()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_TAB);
	assert.equals(uris.length+1, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);

	assertSelectionRanges(tabs[0].linkedBrowser.contentWindow, uris, ranges);
}

function testOpenInBackgroundTabs()
{
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_BACKGROUND_TAB);
	assert.equals(uris.length+1, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);

	assertSelectionRanges(content, uris, ranges);
}

function testOpenInWindows()
{
	assert.equals(0, browserWindowCount);
	sv.openTextLinkIn(sv.ACTION_OPEN_IN_WINDOW);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals(uris.length, browserWindowCount);

	assertSelectionRanges(content, uris, ranges);
}

