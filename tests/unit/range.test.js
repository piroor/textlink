utils.include('common.inc.js');

function setUp()
{
	sv = getNewService();
	yield Do(utils.loadURI('../fixtures/testcase.html'));
}

function tearDown()
{
}

function test_getCurrentFrame()
{
	assert.equals(content, sv.getCurrentFrame());
	assert.equals(content, sv.getCurrentFrame(content));
	assert.equals(content, sv.getCurrentFrame(window));

	yield Do(utils.loadURI('../fixtures/frame.html'));

	assert.equals(content, sv.getCurrentFrame());
	assert.equals(content, sv.getCurrentFrame(content));
	assert.equals(content, sv.getCurrentFrame(window));
	assert.equals(content.frames[0], sv.getCurrentFrame(content.frames[0]));
}

function test_getEditableFromChild()
{
	var input = $('input');
	assert.equals(input, sv.getEditableFromChild(input));

	var textarea = $('textarea');
	assert.equals(textarea, sv.getEditableFromChild(textarea));
	assert.equals(textarea, sv.getEditableFromChild(textarea.firstChild));

	assert.equals(null, sv.getEditableFromChild(input.parentNode));
}

function test_getSelection()
{
	var windowSelection = content.getSelection();
	assert.equals(windowSelection, sv.getSelection(content));
	assert.equals(windowSelection, sv.getSelection());

	var selection = sv.getSelection($('input'));
	assert.isNotNull(selection);
	assert.notEquals(windowSelection, selection);
	assert.equals(
		selection,
		$('input')
			.QueryInterface(Ci.nsIDOMNSEditableElement)
			.editor
			.selectionController
			.getSelection(Ci.nsISelectionController.SELECTION_NORMAL)
	);
}

function test_getTextContentFromRange()
{
	var range = content.document.createRange();

	range.selectNodeContents($('first'));
	assert.equals(
		<![CDATA[Mozilla(http://www.mozilla.org/)はNetscape（http://www.netscape.com/）の次世代ブラウザ開発計画としてスタートしました。
詳しくはhttp://jt.mozilla.gr.jp/src-faq.html#1をご覧下さい。
Mozillaは Netscape Communicator 5.0になる予定でしたが、NGLayoutという全く新しいレイアウトエンジンttp://jt.mozilla.gr.jp/newlayout/gecko.htmlを採用するという方針転換を行ったために開発が遅れてしまい、 Netscape 6 ttp://ftp.netscape.com/pub/netscape6/がリリースされたのは計画スタートから2年も経ってからのことでした。
そして今ではMozilla Corporation(h++p://www.mozilla.com/)の名の下でFirefox(h**p://www.mozilla.com/firefox/)がリリースされています。]]>.toString(),
		sv.getTextContentFromRange(range)
	);

	range.selectNodeContents($('br'));
	assert.equals(
		<![CDATA[URIの後に改行と半角英数字が連続する場合のテスト。
...
mozilla.jp/
Mozilla Japanのサイト。]]>.toString(),
		sv.getTextContentFromRange(range)
	);

	range.detach();
}

function test_shrinkURIRange()
{
	var range = content.document.createRange();
	var node = $('first').firstChild;

	range.setStart(node, 7);
	range.setEnd(node, 32);
	assert.equals('(http://www.mozilla.org/)', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());

	range.setStart(node, 8);
	range.setEnd(node, 31);
	assert.equals('http://www.mozilla.org/', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());

	range.setStart(node, 6);
	range.setEnd(node, 32);
	assert.equals('a(http://www.mozilla.org/)', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());

	range.selectNodeContents($('br'));
	range.setStart($('br1').previousSibling, $('br1').previousSibling.length-3);
	range.setEnd($('br2').nextSibling, 7);
	assert.equals('...mozilla.jp/Mozilla', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('mozilla.jp/', range.toString());

	range.detach();


	var selection = getSelectionInEditable($('textarea'));
	assert.equals(1, selection.rangeCount);
	range = selection.getRangeAt(0).cloneRange();
	selection.removeAllRanges();
	range.setEndBefore(range.startContainer.childNodes[5]);
	range.setStart(range.startContainer.childNodes[2], 4);
	assert.equals('http://mozilla.jp/product/firefox/next line', range.toString());

	range = sv.shrinkURIRange(range);
	assert.equals('http://mozilla.jp/product/firefox/', range.toString());
}

function test_getFindRange()
{
	var range = content.document.createRange();
	var node = $('first').firstChild;
	range.setStart(node, 7);
	range.setEnd(node, 32);
	var rangeText = range.toString();
	assert.equals('(http://www.mozilla.org/)', rangeText);

	var findRange = sv.getFindRange(range);
	var findRangeText = findRange.toString();
	assert.compare(findRangeText.length, '>=', rangeText.length);
	assert.contains(range, findRange);

	range.selectNode($('style').firstChild);
	assert.notContains(range, findRange);


	var selection;

	selection = getSelectionInEditable($('input'));
	assert.equals(1, selection.rangeCount);
	range = selection.getRangeAt(0);
	findRange = sv.getFindRange(range);
	findRangeText = findRange.toString();
	assert.equals($('input').value, findRangeText);
	assert.contains(range, findRange);

	selection = getSelectionInEditable($('textarea'));
	assert.equals(1, selection.rangeCount);
	range = selection.getRangeAt(0);
	findRange = sv.getFindRange(range);
	findRangeText = findRange.toString();
	assert.equals($('textarea').value.replace(/\n/g, ''), findRangeText);
	assert.contains(range, findRange);


	range.detach();
	findRange.detach();
}

function test_getURIRangesFromRange()
{
	var range = content.document.createRange();
	range.selectNodeContents($('first'));
	range.setEndAfter($('fullwidth'));

	var ranges;

	ranges = sv.getURIRangesFromRange(range, 1);
	assert.equals(1, ranges.length);
	assert.equals('http://www.mozilla.org/', ranges[0].range.toString());
	assert.equals('http://www.mozilla.org/', ranges[0].uri);

	ranges = sv.getURIRangesFromRange(range);
	assert.equals(12, ranges.length);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
			'ttp://ftp.netscape.com/pub/netscape6/',
			'h++p://www.mozilla.com/',
			'h**p://www.mozilla.com/firefox/',
			'http://piro.sakura.ne.jp/',
			'www.mozilla.org/products/firefox/',
			'update.mozilla.org',
			// \u301cは波ダッシュの正しい文字コード。
			// \uff5eは全角チルダ。
			'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／'
		],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'http://jt.mozilla.gr.jp/newlayout/gecko.html',
			'http://ftp.netscape.com/pub/netscape6/',
			'http://www.mozilla.com/',
			'http://www.mozilla.com/firefox/',
			'http://piro.sakura.ne.jp/',
			'http://www.mozilla.org/products/firefox/',
			'http://update.mozilla.org',
			'http://white.sakura.ne.jp/~piro/',
			'http://www98.sakura.ne.jp/~piro/'
		],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	range.selectNodeContents($('split'));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(5, ranges.length);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
			'ttp://ftp.netscape.com/pub/netscape6/'
		],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'http://jt.mozilla.gr.jp/newlayout/gecko.html',
			'http://ftp.netscape.com/pub/netscape6/'
		],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	var selection;

	selection = getSelectionInEditable($('input'));
	range = sv.getFindRange(selection.getRangeAt(0));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(1, ranges.length);
	assert.equals(
		['http://www.mozilla.com/'],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		['http://www.mozilla.com/'],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	selection = getSelectionInEditable($('textarea'));
	range = sv.getFindRange(selection.getRangeAt(0));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(2, ranges.length);
	assert.equals(
		['http://getfirefox.com/', 'http://mozilla.jp/product/firefox/'],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		['http://getfirefox.com/', 'http://mozilla.jp/product/firefox/'],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	range.detach();
}

function test_getSelectionURIRanges()
{
	var range1 = content.document.createRange();
	range1.selectNodeContents($('split'));

	var range2 = content.document.createRange();
	range2.selectNodeContents($('fullwidth'));

	var range3 = content.document.createRange();
	range3.selectNodeContents($('pre'));

	var selection = content.getSelection();
	selection.removeAllRanges();
	selection.addRange(range1);
	selection.addRange(range2);
	selection.addRange(range3);

	var ranges;

	ranges = sv.getSelectionURIRanges(content, 1);
	assert.equals(1, ranges.length);
	assert.equals('http://www.mozilla.org/', ranges[0].range.toString());
	assert.equals('http://www.mozilla.org/', ranges[0].uri);

	ranges = sv.getSelectionURIRanges(content);
	assert.equals(13, ranges.length);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
			'ttp://ftp.netscape.com/pub/netscape6/',
			'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'ttp://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'ttp://piro.sakura.ne.jp/xul/',
			'ttp://piro.sakura.ne.jp/xul/tips/'
		],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'http://jt.mozilla.gr.jp/newlayout/gecko.html',
			'http://ftp.netscape.com/pub/netscape6/',
			'http://white.sakura.ne.jp/~piro/',
			'http://www98.sakura.ne.jp/~piro/',
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'http://piro.sakura.ne.jp/xul/',
			'http://piro.sakura.ne.jp/xul/tips/'
		],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	selection.removeAllRanges();


	selection = getSelectionInEditable($('input'));
	range = sv.getFindRange(selection.getRangeAt(0));
	selection.removeAllRanges();
	selection.addRange(range);
	assert.equals($('input').value, range.toString());
	ranges = sv.getSelectionURIRanges($('input'));
	assert.equals(1, ranges.length);
	assert.equals(
		['http://www.mozilla.com/'],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		['http://www.mozilla.com/'],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);

	selection = getSelectionInEditable($('textarea'));
	range = sv.getFindRange(selection.getRangeAt(0));
	selection.removeAllRanges();
	selection.addRange(range);
	assert.equals($('textarea').value.replace(/\n/g, ''), range.toString());
	ranges = sv.getSelectionURIRanges($('textarea'));
	assert.equals(2, ranges.length);
	assert.equals(
		['http://getfirefox.com/', 'http://mozilla.jp/product/firefox/'],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		['http://getfirefox.com/', 'http://mozilla.jp/product/firefox/'],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);
}
