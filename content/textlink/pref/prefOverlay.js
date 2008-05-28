
const ID = '{54BB9F3F-07E5-486c-9B39-C7398B99391C}'; 

var _elementIDs = [
	'textlink.actions.0.action',
	'textlink.actions.0.trigger.mouse',
	'textlink.actions.0.trigger.key',
	'textlink.actions.1.action',
	'textlink.actions.1.trigger.mouse',
	'textlink.actions.1.trigger.key',
	'textlink.actions.2.action',
	'textlink.actions.2.trigger.mouse',
	'textlink.actions.2.trigger.key',
	'textlink.actions.3.action',
	'textlink.actions.3.trigger.mouse',
	'textlink.actions.3.trigger.key',
	'textlink.actions.4.action',
	'textlink.actions.4.trigger.mouse',
	'textlink.actions.4.trigger.key',
	'textlink.contextmenu.openTextLink.current',
	'textlink.contextmenu.openTextLink.tab',
	'textlink.contextmenu.openTextLink.window',
	'textlink.schemer',
	'textlink.schemer.default',
	'textlink.schemer.fixup.table',
	'textlink.schemer.fixup.table.default',
	'textlink.relative.enabled',
	'textlink.multibyte.enabled',
	'textlink.find_click_point.strict'
];

function initFindClickedPointRadio()
{
	var group  = document.getElementById('findClickedPointRadioGroup');
	var strict = document.getElementById('textlink.find_click_point.strict');

	if (strict.checked)
		group.selectedItem = group.childNodes[0];
	else
		group.selectedItem = group.childNodes[1];
}

function onFindClickedPointRadioChanged()
{
	var group  = document.getElementById('findClickedPointRadioGroup');
	var strict = document.getElementById('textlink.find_click_point.strict');

	strict.checked = group.value == '0';
}

function initMacLabel()
{
	if (navigator.platform.match(/Mac/)) {
		var macLabels = document.getElementsByAttribute('label-mac', '*');
		var node;

		for (var i = 0; i < macLabels.length; i++)
		{
			macLabels[i].setAttribute('label', macLabels[i].getAttribute('label-mac'));
			if (node.localName != 'caption')
				node.setAttribute('flex', 1);
		}
	}
}


function resetActions()
{
	var ids = [
			'textlink.actions.0.action',
			'textlink.actions.0.trigger.mouse',
			'textlink.actions.0.trigger.key',
			'textlink.actions.1.action',
			'textlink.actions.1.trigger.mouse',
			'textlink.actions.1.trigger.key',
			'textlink.actions.2.action',
			'textlink.actions.2.trigger.mouse',
			'textlink.actions.2.trigger.key',
			'textlink.actions.3.action',
			'textlink.actions.3.trigger.mouse',
			'textlink.actions.3.trigger.key',
			'textlink.actions.4.action',
			'textlink.actions.4.trigger.mouse',
			'textlink.actions.4.trigger.key'
		];
	var node, value;
	for (var i = 0, maxi = ids.length; i < maxi; i++)
	{
		node = document.getElementById(ids[i]);
		value = getDefaultPref(node.getAttribute('prefstring'));
		node.value = value;
		node.selectedItem = node.getElementsByAttribute('value', value)[0];
	}
}

function getDefaultPref(aPrefstring)
{
	const DEFPrefs = Components
			.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getDefaultBranch(null);
	try {
		var type = DEFPrefs.getPrefType(aPrefstring);
		switch (type)
		{
			case DEFPrefs.PREF_STRING:
				return decodeURIComponent(escape(DEFPrefs.getCharPref(aPrefstring)));
				break;
			case DEFPrefs.PREF_INT:
				return DEFPrefs.getIntPref(aPrefstring);
				break;
			default:
				return DEFPrefs.getBoolPref(aPrefstring);
				break;
		}
	}
	catch(e) {
	}
	return null;
}


// About
const WindowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
function opener()
{
	return WindowManager.getMostRecentWindow('navigator:browser');
}

function loadURI(uri)
{
	if (opener())
		opener().loadURI(uri);
	else
		window.open(uri);
}

// Uninstall 
var STRBUNDLE = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);
var msg = STRBUNDLE.createBundle('chrome://textlink/locale/textlink.properties');
var unreg;
if (location.href.indexOf('prefDialog.xul') < 0)
	unreg = new exUnregisterer(
		'chrome://textlink/content/contents.rdf',
		'jar:%chromeFolder%textlink.jar!/locale/en-US/textlink/contents.rdf',
		'jar:%chromeFolder%textlink.jar!/locale/ja-JP/textlink/contents.rdf'
	);


function Unregister()
{
	if (!confirm(msg.GetStringFromName('uninstall_confirm'))) return;

	if (!confirm(msg.GetStringFromName('uninstall_prefs_confirm')))
		window.unreg.removePrefs('textlink');

	window.unreg.unregister();

	alert(
		msg.GetStringFromName('uninstall_removefile').replace(/%S/i,
			window.unreg.getFilePathFromURLSpec(
				(window.unreg.exists(window.unreg.UChrome+'textlink.jar') ? window.unreg.UChrome+'textlink.jar' : window.unreg.Chrome+'textlink.jar' )
			)
		)
	);

	window.close();
}
