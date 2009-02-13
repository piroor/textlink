var win;
var sv;
var tabs;

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

	sv.actions = {
		test : {
			action       : sv.ACTION_DISABLED,
			triggerKey   : 'VK_ENTER',
			triggerMouse : 'dblclick'
		}
	};
}

function tearDown()
{
	utils.tearDownTestWindow();
}

var dblclick = {
		type    : 'dblclick',
		button  : 0,
		detail  : 2,
		x       : 170,
		y       : 12,
	};

function testActions()
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	assert.equals('', selection.toString());

	action.fireMouseEvent(content, dblclick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.fireMouseEvent(content, dblclick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.fireMouseEvent(content, dblclick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.fireMouseEvent(content, dblclick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	var originalWindows = utils.getChromeWindows();
	action.fireMouseEvent(content, dblclick);
	yield 3000;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	var windows = utils.getChromeWindows();
	assert.equals(originalWindows.length+1, windows.length);
	windows.forEach(function(aWindow) {
		if (originalWindows.indexOf(aWindow) < 0)
			aWindow.close();
	});
}

