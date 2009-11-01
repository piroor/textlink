utils.include('common.inc.js');

function setUp()
{
	yield Do(commonSetUp());
}

function tearDown()
{
	yield Do(commonTearDown());
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

function assertKeyActions(aSelector, aKeypressOptions)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[0], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(2, tabs.length);
	assert.equals(tabs[1], gBrowser.selectedTab);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	gBrowser.removeTab(tabs[1]);
	yield 100;

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	aSelector();
	assert.equals(0, browserWindowCount);
	action.keypressOn.apply(action, aKeypressOptions);
	yield 300;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(1, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.equals('http://www.mozilla.org/', selection.toString());
	assert.equals('http://www.mozilla.org/', utils.getClipBoard());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 300;
	assert.equals(1, tabs.length);
	assert.isTrue(isFirstTabUnloaded());
}

function assertNoKeyActions(aSelector, aKeypressOptions)
{
	assert.equals(1, tabs.length);

	var selection = content.getSelection();
	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_DISABLED;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_SELECT;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_BACKGROUND_TAB;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_TAB;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_WINDOW;

	aSelector();
	assert.equals(0, browserWindowCount);
	action.keypressOn.apply(action, aKeypressOptions);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
	assert.equals(0, browserWindowCount);

	utils.setClipBoard('test');
	assert.equals('test', utils.getClipBoard());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_COPY;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 100;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.equals('test', utils.getClipBoard());
	assert.isFalse(isFirstTabUnloaded());

	selection.removeAllRanges();

	sv.actions.test.action = sv.ACTION_OPEN_IN_CURRENT;

	aSelector();
	action.keypressOn.apply(action, aKeypressOptions);
	yield 300;
	assert.equals(1, tabs.length);
	assert.notEquals('http://www.mozilla.org/', selection.toString());
	assert.isFalse(isFirstTabUnloaded());
}

function testKeyActionsNormal()
{
	var root = content.document.documentElement;
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter']));
	yield Do(assertKeyActions(selectURI, [root, 'enter']));
}

function testKeyActionsAccel()
{
	sv.actions.test.triggerKey = 'accel-VK_ENTER';
	var root = content.document.documentElement;
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertKeyActions(selectURI, [root, 'enter', { ctrlKey : true }]));
}

function testKeyActionsCtrl()
{
	sv.actions.test.triggerKey = 'ctrl-VK_ENTER';
	var root = content.document.documentElement;
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertKeyActions(selectURI, [root, 'enter', { ctrlKey : true }]));
}

function testKeyActionsShift()
{
	sv.actions.test.triggerKey = 'shift-VK_ENTER';
	var root = content.document.documentElement;
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { shiftKey : true }]));
	yield Do(assertKeyActions(selectURI, [root, 'enter', { shiftKey : true }]));
}

function testKeyActionsShiftCtrl()
{
	sv.actions.test.triggerKey = 'shift-ctrl-VK_ENTER';
	var root = content.document.documentElement;
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter']));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter', { ctrlKey : true }]));
	yield Do(assertNoKeyActions(selectNotURI, [root, 'enter', { shiftKey : true }]));
	yield Do(assertNoKeyActions(selectURI, [root, 'enter', { shiftKey : true }]));
	yield Do(assertKeyActions(selectURI, [root, 'enter', { ctrlKey : true, shiftKey : true }]));
}

