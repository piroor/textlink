utils.include('common.inc.js');

function setUp()
{
	utils.setPref('intl.accept_languages', 'ja,en-us,en');
	utils.setPref('intl.charset.detector', 'ja_parallel_state_machine');
	sv = getNewService();
	yield Do(utils.loadURI('../fixtures/testcase.html'));
}

function tearDown()
{
	sv.destroy();
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
	var rangeCollapsed = content.document.createRange();
	rangeCollapsed.setStart($('split').firstChild, 60);
	windowSelection.addRange(rangeCollapsed);

	assert.isNotNull(windowSelection);
	assert.equals(windowSelection.toString(), sv.getSelection(content).toString());
	assert.equals(windowSelection.toString(), sv.getSelection().toString());

	$('input').select();
	var selection = sv.getSelection($('input'));
	assert.isNotNull(selection);
	assert.notEquals(windowSelection.toString(), selection.toString());
	assert.equals(
		selection.toString(),
		$('input')
			.QueryInterface(Ci.nsIDOMNSEditableElement)
			.editor
			.selectionController
			.getSelection(Ci.nsISelectionController.SELECTION_NORMAL)
			.toString()
	);
}

function test_getTextContentFromRange()
{
	var range = content.document.createRange();

	range.setStartBefore($('hidden1'));
	range.setEndAfter($('hidden2'));

	var formattedText = utils.readFrom('range.getTextContentFromRange.formatted.txt', 'UTF-8').replace(/\r\n/g, '\n');
	assert.equals(formattedText, sv.getTextContentFromRange(range).replace(/\r\n/g, '\n'));


	formattedText = utils.readFrom('range.getTextContentFromRange.URIformatted.txt', 'UTF-8').replace(/\r\n/g, '\n');
	range.selectNodeContents($('br'));
	assert.equals(formattedText, sv.getTextContentFromRange(range));

	range.detach();
}

function test_shrinkURIRange()
{
	var range = content.document.createRange();

	range.selectNodeContents($('br'));
	range.setStartAfter($('br1'));
	range.setEnd($('br2').nextSibling, 7);
	assert.equals('mozilla.jp/Mozilla', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('mozilla.jp/', range.toString());

	range.detach();


	var selection = getSelectionInEditable($('textarea'));
	assert.equals(1, selection.rangeCount);
	range = selection.getRangeAt(0).cloneRange();
	selection.removeAllRanges();
	range.selectNode(range.startContainer.childNodes[4]);
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

	range.setStart(node, 15);
	range.collapse(true);
	sv.IDNEnabled = true;
	findRange = sv.getFindRange(range);
	assert.equals('Mozilla(http://www.mozilla.org/)はNetscape（http://www.netscape.com/）の次世代ブラウザ開発計画としてスタートしました。', findRange.toString());
	sv.IDNEnabled = false;
	findRange = sv.getFindRange(range);
	assert.equals('Mozilla(http://www.mozilla.org/)', findRange.toString());

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


	// インライン要素以外を文字列の切れ目として識別できるかどうか？
	function assert_getFindRangeFromBlockContents(aNode)
	{
		var range = aNode.ownerDocument.createRange();
		range.selectNodeContents(aNode);
		var full = range.toString();
		var findRange = sv.getFindRange(range);
		assert.equals(full, findRange.toString());

		findRange.detach();

		range.setStart(aNode.firstChild, 3);
		range.setEnd(aNode.firstChild, 5);
		findRange = sv.getFindRange(range);
		assert.equals(full, findRange.toString());

		findRange.detach();
		range.detach();
	}

	assert_getFindRangeFromBlockContents($('table-cell1'));
	assert_getFindRangeFromBlockContents($('table-cell2'));
	assert_getFindRangeFromBlockContents($('table-cell3'));

	assert_getFindRangeFromBlockContents($('span-block1'));
	assert_getFindRangeFromBlockContents($('span-block2'));
	assert_getFindRangeFromBlockContents($('span-block3'));

	range.detach();
	findRange.detach();
}

test_getFindRange_plainText.setUp = function()
{
	yield Do(utils.loadURI('../fixtures/testcase.txt'));
}
function test_getFindRange_plainText()
{
	var range = content.document.createRange();
	var node = content.document.getElementsByTagName('pre')[0].firstChild;
	range.setStart(node, 7);
	range.setEnd(node, 32);
	var rangeText = range.toString();
	assert.equals('(http://www.mozilla.org/)', rangeText);

	var findRange = sv.getFindRange(range);
	assert.contains(range, findRange);

	range.setStart(node, 15);
	range.collapse(true);
	sv.IDNEnabled = true;
	findRange = sv.getFindRange(range);
	assert.equals('Mozilla(http://www.mozilla.org/)はNetscape（http://www.netscape.com/）の次世代ブラウザ開発計画としてスタートしました。詳しくはhttp://jt.mozilla.gr.jp/src-faq.html#1をご覧下さい。', findRange.toString());
	sv.IDNEnabled = false;
	findRange = sv.getFindRange(range);
	assert.equals('Mozilla(http://www.mozilla.org/)', findRange.toString());

	range.detach();
	findRange.detach();
}

function test_getURIRangesFromRange()
{
	var range = content.document.createRange();
	range.selectNodeContents($('first'));
	range.setEndAfter($('prefix'));

	var ranges;
	var rangesToString = function(aRange) {
			return aRange.range.toString();
		};
	var rangesToURI = function(aRange) {
			return aRange.uri;
		};

	ranges = sv.getURIRangesFromRange(range);
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
			'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\u301cｐｉｒｏ／ｅｎｔｒａｎｃｅ／',
			'http://www.example.com/'
		],
		ranges.map(rangesToString)
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
			'http://www98.sakura.ne.jp/~piro/',
			'http://www98.sakura.ne.jp/~piro/entrance/',
			'http://www.example.com/'
		],
		ranges.map(rangesToURI)
	);

	ranges = sv.getURIRangesFromRange(range, sv.FIND_FIRST);
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToURI));

	ranges = sv.getURIRangesFromRange(range, sv.FIND_LAST);
	assert.equals(['http://www.example.com/'], ranges.map(rangesToString));
	assert.equals(['http://www.example.com/'], ranges.map(rangesToURI));


	range.setStart($('first').firstChild, 10);
	range.collapse(true);
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToURI));

	ranges = sv.getURIRangesFromRange(range, sv.FIND_FIRST);
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToURI));

	ranges = sv.getURIRangesFromRange(range, sv.FIND_LAST);
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToURI));


	range.selectNodeContents($('split'));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'ttp://jt.mozilla.gr.jp/newlayout/gecko.html',
			'ttp://ftp.netscape.com/pub/netscape6/'
		],
		ranges.map(rangesToString)
	);
	assert.equals(
		[
			'http://www.mozilla.org/',
			'http://www.netscape.com/',
			'http://jt.mozilla.gr.jp/src-faq.html#1',
			'http://jt.mozilla.gr.jp/newlayout/gecko.html',
			'http://ftp.netscape.com/pub/netscape6/'
		],
		ranges.map(rangesToURI)
	);

	ranges = sv.getURIRangesFromRange(range, sv.FIND_FIRST);
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.org/'], ranges.map(rangesToURI));

	ranges = sv.getURIRangesFromRange(range, sv.FIND_LAST);
	assert.equals(['ttp://ftp.netscape.com/pub/netscape6/'], ranges.map(rangesToString));
	assert.equals(['http://ftp.netscape.com/pub/netscape6/'], ranges.map(rangesToURI));


	range.setStart($('table-cell1').firstChild, 3);
	range.setEnd($('table-cell6').firstChild, 8);
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(
		[
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'ttp://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'ttp://piro.sakura.ne.jp/xul/',
			'ttp://piro.sakura.ne.jp/xul/tips/'
		],
		ranges.map(rangesToString)
	);
	assert.equals(
		[
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'http://piro.sakura.ne.jp/xul/',
			'http://piro.sakura.ne.jp/xul/tips/'
		],
		ranges.map(rangesToURI)
	);


	var selection;

	selection = getSelectionInEditable($('input'));
	range = sv.getFindRange(selection.getRangeAt(0));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToURI));
	ranges = sv.getURIRangesFromRange(range, sv.FIND_FIRST);
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToURI));
	ranges = sv.getURIRangesFromRange(range, sv.FIND_LAST);
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToString));
	assert.equals(['http://www.mozilla.com/'], ranges.map(rangesToURI));

	selection = getSelectionInEditable($('textarea'));
	range = sv.getFindRange(selection.getRangeAt(0));
	ranges = sv.getURIRangesFromRange(range);
	assert.equals(
		[
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/',
			'http://荒川智則.jp/#textarea'
		],
		ranges.map(rangesToString)
	);
	assert.equals(
		[
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/',
			'http://荒川智則.jp/#textarea'
		],
		ranges.map(rangesToURI)
	);
	ranges = sv.getURIRangesFromRange(range, sv.FIND_FIRST);
	assert.equals(['http://getfirefox.com/'], ranges.map(rangesToString));
	assert.equals(['http://getfirefox.com/'], ranges.map(rangesToURI));
	ranges = sv.getURIRangesFromRange(range, sv.FIND_LAST);
	assert.equals(['http://荒川智則.jp/#textarea'], ranges.map(rangesToString));
	assert.equals(['http://荒川智則.jp/#textarea'], ranges.map(rangesToURI));

	range.detach();
}

test_getURIRangesFromRange_plainText.setUp = function()
{
	yield Do(utils.loadURI('../fixtures/testcase.txt'));
}
function test_getURIRangesFromRange_plainText()
{
	var range = content.document.createRange();
	range.selectNodeContents(content.document.body);

	var ranges;
	var rangesToString = function(aRange) {
			return aRange.range.toString();
		};
	var rangesToURI = function(aRange) {
			return aRange.uri;
		};

	ranges = sv.getURIRangesFromRange(range);
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
			'ｈｔｔｐ：／／ｗｈｉｔｅ．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\uff5eｐｉｒｏ／',
			'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／\u301cｐｉｒｏ／ｅｎｔｒａｎｃｅ／',
			'www.google.com',
			'www.google.ca',
			'addons.mozilla.org',
			'http://www.google.com、www.google.ca、addons.mozilla.org',
			'http://www.google.co.jp/search?q=Firefox&ie=utf-8&oe=utf-8',
			'mozilla.jp/',
			'荒川智則.jp',
			'http://荒川智則.jp/#foobar',
			'http://雪、無音、段ボール。荒川智則.jp/',
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'ttp://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'ttp://piro.sakura.ne.jp/xul/',
			'ttp://piro.sakura.ne.jp/xul/tips/',
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/'
		],
		ranges.map(rangesToString)
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
			'http://www98.sakura.ne.jp/~piro/',
			'http://www98.sakura.ne.jp/~piro/entrance/',
			'http://www.google.com',
			'http://www.google.ca',
			'http://addons.mozilla.org',
			'http://www.google.com、www.google.ca、addons.mozilla.org',
			'http://www.google.co.jp/search?q=Firefox&ie=utf-8&oe=utf-8',
			'http://mozilla.jp/',
			'http://荒川智則.jp',
			'http://荒川智則.jp/#foobar',
			'http://雪、無音、段ボール。荒川智則.jp/',
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'http://piro.sakura.ne.jp/xul/',
			'http://piro.sakura.ne.jp/xul/tips/',
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/'
		],
		ranges.map(rangesToURI)
	);

	range.detach();
}

function test_getSelectionURIRanges()
{
	var ranges;
	var selection = content.getSelection();
	selection.removeAllRanges();

	var rangeCollapsed = content.document.createRange();
	rangeCollapsed.setStart($('split').firstChild, 60);
	selection.addRange(rangeCollapsed);
	ranges = sv.getSelectionURIRanges(content);
	assert.equals(1, ranges.length);
	assert.equals('http://www.mozilla.org/', ranges[0].range.toString());
	assert.equals('http://www.mozilla.org/', ranges[0].uri);

	var range1 = content.document.createRange();
	range1.selectNodeContents($('split'));

	var range2 = content.document.createRange();
	range2.selectNodeContents($('fullwidth'));

	var range3 = content.document.createRange();
	range3.selectNodeContents($('pre'));

	selection.removeAllRanges();
	selection.addRange(range1);
	selection.addRange(range2);
	selection.addRange(range3);

	ranges = sv.getSelectionURIRanges(content);
	assert.equals(
		[
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
			'ttp://piro.sakura.ne.jp/xul/tips/',
			'http://荒川智則.jp/',
			'http://雪、無音、段ボール。荒川智則.jp/'
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
			'http://www98.sakura.ne.jp/~piro/entrance/',
			'http://piro.sakura.ne.jp/latest/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/',
			'http://piro.sakura.ne.jp/latest/blosxom/mozilla/xul/',
			'http://piro.sakura.ne.jp/latest/blosxom/webtech/',
			'http://piro.sakura.ne.jp/xul/',
			'http://piro.sakura.ne.jp/xul/tips/',
			'http://荒川智則.jp/',
			'http://雪、無音、段ボール。荒川智則.jp/'
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
	assert.equals(
		[
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/',
			'http://荒川智則.jp/#textarea'
		],
		ranges.map(function(aRange) {
			return aRange.range.toString();
		})
	);
	assert.equals(
		[
			'http://getfirefox.com/',
			'http://mozilla.jp/product/firefox/',
			'http://荒川智則.jp/#textarea'
		],
		ranges.map(function(aRange) {
			return aRange.uri;
		})
	);
}

function test_getFollowingURIPartRanges()
{
	function assertGetFollowingPartRanges(aExpected, aRange)
	{
		var ranges = sv.getFollowingURIPartRanges(aRange);
		assert.equals(
			aExpected,
			ranges.map(function(aRange) { return aRange.toString(); })
		);
		ranges.forEach(function(aRange) {
			aRange.detach();
		});
	}

	var node = $('pre-with-linebreaks');
	var range = content.document.createRange();
	range.selectNode(node.firstChild);
	assert.equals('http://piro.sakura.ne.jp/latest/', range.toString());
	sv.multilineURIEnabled = false;
	assertGetFollowingPartRanges([], range);
	sv.multilineURIEnabled = true;
	assertGetFollowingPartRanges([], range);

	range.selectNode(node.childNodes[2]);
	assert.equals('http://piro.sakura.ne.jp/latest/blosxom/', range.toString());
	sv.multilineURIEnabled = false;
	assertGetFollowingPartRanges([], range);
	sv.multilineURIEnabled = true;
	assertGetFollowingPartRanges(['mozilla/'], range);

	node = $('wrapped-message');
	range.selectNode(node.childNodes[2]);
	assert.equals('http://piro.sakura.ne.jp/temp/aaa/bbb/ccc/ddd/eee/', range.toString());
	assertGetFollowingPartRanges(['fff/ggg/hhh/iii/jjj/kkkk/hhh/iii'], range);

	node = $('message-quoted-part');
	range.selectNode(node.childNodes[1]);
	range.setStart(node.childNodes[1], 7);
	assert.equals('http://piro.sakura.ne.jp/temp/aaa/bbb/ccc/ddd/eee/fff/', range.toString());
	assertGetFollowingPartRanges(['ggg/hhh/iii/jjj/kkkk/hhh/iii'], range);

	range.detach();
}
