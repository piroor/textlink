utils.include('common.inc.js');

function setUp()
{
	yield Do(commonSetUp());
}

function tearDown()
{
	yield Do(commonTearDown());
}

function assertMouseActions(aClick)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	assert.equals(0, browserWindowCount);
	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(1, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.equals('http://www.mozilla.org/', utils.getClipBoard());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.isTrue(isFirstTabUnloaded());
}

function assertNoMouseActions(aClick)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(0, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.fireMouseEvent(content, aClick);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.fireMouseEvent(content, aClick);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
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

