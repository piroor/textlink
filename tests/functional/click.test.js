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

function assertMouseActions(aClick)
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

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	assert.equals(originalWindows.length+1, utils.getChromeWindows().length);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.equals('http://www.mozilla.org/', utils.getClipBoard());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.isTrue(unloaded);
}

function assertNoMouseActions(aClick)
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

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	var originalWindows = utils.getChromeWindows();
	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	assert.equals(originalWindows.length, utils.getChromeWindows().length);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(unloaded);
}

var baseClick = {
		type    : 'dblclick',
		button  : 0,
		detail  : 2,
		x       : 0,
		y       : 12,
		validX  : 170,
		invalidX : 10
	};

function testMouseActionsNormal()
{
	var click = {};
	click.__proto__ = baseClick
	click.x = click.validX

	click.ctrlKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.ctrlKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertMouseActions(click));
}

function testMouseActionsAccel()
{
	sv.actions.test.triggerMouse = 'accel-dblclick';

	var click = {};
	click.__proto__ = baseClick

	click.ctrlKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.ctrlKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertMouseActions(click));
}

function testMouseActionsCtrl()
{
	sv.actions.test.triggerMouse = 'accel-dblclick';

	var click = {};
	click.__proto__ = baseClick

	click.ctrlKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.ctrlKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertMouseActions(click));
}

function testMouseActionsShift()
{
	sv.actions.test.triggerMouse = 'shift-dblclick';

	var click = {};
	click.__proto__ = baseClick

	click.shiftKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.shiftKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertMouseActions(click));
}

function testMouseActionsShiftCtrl()
{
	sv.actions.test.triggerMouse = 'shift-ctrl-dblclick';
	var click = {};
	click.__proto__ = baseClick

	click.shiftKey = false;
	click.ctrlKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.shiftKey = true;
	click.ctrlKey = false;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.shiftKey = false;
	click.ctrlKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertNoMouseActions(click));

	click.shiftKey = true;
	click.ctrlKey = true;
	click.x = click.invalidX
	yield Do(assertNoMouseActions(click));
	click.x = click.validX
	yield Do(assertMouseActions(click));
}

