var win;
var sv;
var tabs;
var originalWindows;
var unloaded;
var browserWindowCount;

function commonSetUp(aPath)
{
	utils.loadPrefs('../../defaults/preferences/textlink.js');
	utils.setPref('browser.tabs.warnOnClose', false);
	utils.setPref('browser.tabs.warnOnOpen', false);
	utils.setPref('intl.accept_languages', 'ja,en-us,en');
	utils.setPref('intl.charset.detector', 'ja_parallel_state_machine');

	yield Do(utils.setUpTestWindow());
	yield Do(utils.addTab(aPath || '../fixtures/testcase.html', { selected : true }));
	gBrowser.removeAllTabsBut(gBrowser.selectedTab);

	win = utils.getTestWindow();
	sv = win.TextLinkService;
	tabs = gBrowser.mTabs;

	sv.actions = {
		test : {
			action       : sv.ACTION_OPEN_IN_TAB,
			triggerKey   : 'VK_ENTER',
			triggerMouse : 'dblclick'
		}
	};

	unloaded = false;
	tabs[0].linkedBrowser.contentWindow.addEventListener('unload', function(aEvent) {
		aEvent.currentTarget.removeEventListener('unload', arguments.callee, true);
		unloaded = true;
	}, true);

	browserWindowCount = 0;
	win.open = win.__proto__.open = function() {
		browserWindowCount++;
	};
	win.openDialog = win.__proto__.openDialog = function(aURI) {
		if (aURI == win.location.href) browserWindowCount++;
	};
	assert.equals(0, browserWindowCount);
}

function commonTearDown()
{
	utils.tearDownTestWindow();
}

function isFirstTabUnloaded()
{
	return unloaded || tabs[0].getAttribute('busy') == 'true';
}

