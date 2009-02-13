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
	var windows = utils.getChromeWindows();
	windows.forEach(function(aWindow) {
		if (originalWindows.indexOf(aWindow) < 0)
			aWindow.close();
	});

	utils.tearDownTestWindow();
}

function selectURI()
{
	var selection = content.getSelection();
	selection.removeAllRanges();

	var range = content.document.createRange();
	var textNode = content.document.getElementById('first').firstChild;
	range.selectNode(textNode);
	range.setStart(textNode, 12);
	range.setEnd(textNode, 25);

	selection.addRange(range);
	assert.equals('://www.mozill', selection.toString());
}

function selectNotURI()
{
	var selection = content.getSelection();
	selection.removeAllRanges();

	var range = content.document.createRange();
	var textNode = content.document.getElementById('first').firstChild;
	range.selectNode(textNode);
	range.setStart(textNode, 0);
	range.setEnd(textNode, 3);

	selection.addRange(range);
	assert.equals('Moz', selection.toString());
}

function assertKeyActions(aKeypress, aSelector)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	var unloaded = false;
	content.addEventListener('unload', function(aEvent) {
		aEvent.currentTarget.removeEventListener('unload', arguments.callee, false);
		unloaded = true;
	}, false);

	sv.actions.test.action = sv.ACTION_DISABLED;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 300;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	assert.equals(originalWindows.length+1, utils.getChromeWindows().length);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.equals('http://www.mozilla.org/', utils.getClipBoard());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 300;
	assert.equals(1, tabs.length);
	assert.isTrue(unloaded);
}

function assertNoKeyActions(aKeypress, aSelector)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	var unloaded = false;
	content.addEventListener('unload', function(aEvent) {
		aEvent.currentTarget.removeEventListener('unload', arguments.callee, false);
		unloaded = true;
	}, false);

	sv.actions.test.action = sv.ACTION_DISABLED;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	var originalWindows = utils.getChromeWindows();
	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	assert.equals(originalWindows.length, utils.getChromeWindows().length);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.equals('test', utils.getClipBoard());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	aSelector();
	action.fireKeyEventOnElement(content.document.documentElement, aKeypress);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
}

var baseKeypress = {
		type    : 'keypress',
		keyCode : Ci.nsIDOMKeyEvent.DOM_VK_ENTER
	};

function testKeyActionsNormal()
{
	var keypress = {};
	keypress.__proto__ = baseKeypress

	keypress.ctrlKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertKeyActions(keypress, selectURI));
}

function testKeyActionsAccel()
{
	sv.actions.test.triggerKey = 'accel-VK_ENTER';

	var keypress = {};
	keypress.__proto__ = baseKeypress

	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.ctrlKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertKeyActions(keypress, selectURI));
}

function testKeyActionsCtrl()
{
	sv.actions.test.triggerKey = 'accel-VK_ENTER';

	var keypress = {};
	keypress.__proto__ = baseKeypress

	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.ctrlKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertKeyActions(keypress, selectURI));
}

function testKeyActionsShift()
{
	sv.actions.test.triggerKey = 'shift-VK_ENTER';

	var keypress = {};
	keypress.__proto__ = baseKeypress

	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.shiftKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertKeyActions(keypress, selectURI));
}

function testKeyActionsShiftCtrl()
{
	sv.actions.test.triggerKey = 'shift-ctrl-VK_ENTER';
	var keypress = {};
	keypress.__proto__ = baseKeypress

	keypress.shiftKey = false;
	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.shiftKey = true;
	keypress.ctrlKey = false;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.shiftKey = false;
	keypress.ctrlKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertNoKeyActions(keypress, selectURI));

	keypress.shiftKey = true;
	keypress.ctrlKey = true;
	yield Do(assertNoKeyActions(keypress, selectNotURI));
	yield Do(assertKeyActions(keypress, selectURI));
}

