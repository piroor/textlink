var win;
var sv;
var tabs;
var originalWindows;
var unloaded;

function commonSetUp(aPath)
{
	utils.loadPrefs('../../defaults/preferences/textlink.js');
	utils.setPref('browser.tabs.warnOnClose', false);

	yield Do(utils.setUpTestWindow());
	yield Do(utils.addTab(aPath || '../fixtures/testcase.html', { selected : true }));
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

	unloaded = false;
	tabs[0].linkedBrowser.contentWindow.addEventListener('unload', function(aEvent) {
		aEvent.currentTarget.removeEventListener('unload', arguments.callee, true);
		unloaded = true;
	}, true);
}

function commonTearDown()
{
	var windows = utils.getChromeWindows();
	windows.forEach(function(aWindow) {
		if (originalWindows.indexOf(aWindow) < 0)
			aWindow.close();
	});

	utils.tearDownTestWindow();
}

function isFirstTabUnloaded()
{
	return unloaded || tabs[0].getAttribute('busy') == 'true';
}

