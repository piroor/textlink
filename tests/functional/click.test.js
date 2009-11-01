utils.include('common.inc.js');

function setUp()
{
	yield Do(commonSetUp());
}

function tearDown()
{
	yield Do(commonTearDown());
}

function assertMouseActions()
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.dblclickAt.apply(action, arguments);
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
	action.dblclickAt.apply(action, arguments);
	yield 300;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(1, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.equals('http://www.mozilla.org/', utils.getClipBoard());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.dblclickAt.apply(action, arguments);
	yield 300;
	assert.equals(1, tabs.length);
	assert.isTrue(isFirstTabUnloaded());
}

function assertNoMouseActions()
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	action.dblclickAt.apply(action, arguments);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(0, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	action.dblclickAt.apply(action, arguments);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	action.dblclickAt.apply(action, arguments);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
}

var invalidX = 10;
var validX = 170;
var validY = 12;

function testMouseActionsNormal()
{
	yield Do(assertNoMouseActions(content, invalidX, validY, { ctrlKey : true }));
	yield Do(assertNoMouseActions(content, validX, validY, { ctrlKey : true }));
	yield Do(assertNoMouseActions(content, invalidX, validY));
	yield Do(assertMouseActions(content, validX, validY));
}

function testMouseActionsAccel()
{
	sv.actions.test.triggerMouse = 'accel-dblclick';

	yield Do(assertNoMouseActions(content, invalidX, validY));
	yield Do(assertNoMouseActions(content, validX, validY));
	yield Do(assertNoMouseActions(content, invalidX, validY, { ctrlKey : true }));
	yield Do(assertMouseActions(content, validX, validY, { ctrlKey : true }));
}

function testMouseActionsCtrl()
{
	sv.actions.test.triggerMouse = 'ctrl-dblclick';

	yield Do(assertNoMouseActions(content, invalidX, validY));
	yield Do(assertNoMouseActions(content, validX, validY));
	yield Do(assertNoMouseActions(content, invalidX, validY, { ctrlKey : true }));
	yield Do(assertMouseActions(content, validX, validY, { ctrlKey : true }));
}

function testMouseActionsShift()
{
	sv.actions.test.triggerMouse = 'shift-dblclick';

	yield Do(assertNoMouseActions(content, invalidX, validY));
	yield Do(assertNoMouseActions(content, validX, validY));
	yield Do(assertNoMouseActions(content, invalidX, validY, { shiftKey : true }));
	yield Do(assertMouseActions(content, validX, validY, { shiftKey : true }));
}

function testMouseActionsShiftCtrl()
{
	sv.actions.test.triggerMouse = 'shift-ctrl-dblclick';

	yield Do(assertNoMouseActions(content, invalidX, validY));
	yield Do(assertNoMouseActions(content, validX, validY));
	yield Do(assertNoMouseActions(content, invalidX, validY, { ctrlKey : true }));
	yield Do(assertNoMouseActions(content, validX, validY, { ctrlKey : true }));
	yield Do(assertNoMouseActions(content, invalidX, validY, { shiftKey : true }));
	yield Do(assertNoMouseActions(content, validX, validY, { shiftKey : true }));
	yield Do(assertMouseActions(content, validX, validY, { ctrlKey : true, shiftKey : true }));
}

