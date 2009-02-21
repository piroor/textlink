var uris, positions;
var win, sv, tabs, originalWindows;

function setUp()
{
	utils.loadPrefs('../../defaults/preferences/textlink.js');
	utils.setPref('browser.tabs.warnOnClose', false);

	yield Do(utils.setUpTestWindow());
	yield Do(utils.addTab('../fixtures/testcase.txt', { selected : true }));
	gBrowser.removeAllTabsBut(gBrowser.selectedTab);

	win = utils.getTestWindow();
	sv = win.TextLinkService;
	tabs = gBrowser.mTabs;
	originalWindows = utils.getChromeWindows();

	sv.actions = {
		test : {
			action       : sv.ACTION_OPEN_IN_TAB,
			triggerKey   : 'VK_ENTER',
			triggerMouse : 'dblclick'
		}
	};

	positions = [];
	uris = [
			'http://www.netscape.com/',
			'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／〜ｐｉｒｏ／ｅｎｔｒａｎｃｅ／',
			'http://www.google.co.jp/search?q=Firefox&ie=utf-8&oe=utf-8'
		];

	var container = content.document.getElementsByTagName('pre')[0];
	assert.equals(1, container.childNodes.length);

	uris.forEach(function(aURI, aIndex) {
		var text = container.firstChild;
		var position = text.textContent.indexOf(aURI);
		var range = content.document.createRange();
		range.setStart(text, position);
		range.setEnd(text, position + aURI.length, aURI);
		assert.equals(aURI, range.toString());

		var span = content.document.createElement('span');
		span.appendChild(range.extractContents());
		range.insertNode(span);
		assert.equals(3, container.childNodes.length, aURI);
		var box = content.document.getBoxObjectFor(span);
		positions.push({ x : box.screenX, y : box.screenY });

		range.selectNodeContents(span);
		var uriNode = range.extractContents();
		range.selectNode(span);
		range.deleteContents();
		range.insertNode(uriNode);
		container.normalize();
		assert.equals(1, container.childNodes.length, aURI);
	});
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

function testPlainText()
{
	var selection = content.getSelection();
	uris.forEach(function(aURI, aIndex) {
		gBrowser.removeAllTabsBut(tabs[0]);
		action.fireMouseEvent(
			content,
			{ type : 'dblclick',
			  button : 0,
			  screenX : positions[aIndex].x,
			  screenY : positions[aIndex].y }
		);
		yield 100;
		assert.equals(2, tabs.length, aURI);
		assert.equals(tabs[1], gBrowser.selectedTab, aURI);
		assert.equals(aURI, selection.toString(), aURI);
	});
}

