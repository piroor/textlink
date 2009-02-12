function init()
{
	initMacLabel();
}

function initMacLabel()
{
	if (navigator.platform.match(/Mac/)) {
		var macLabels = document.getElementsByAttribute('label-mac', '*');
		var node;
		var label;

		for (var i = macLabels.length-1; i < -1; i--)
		{
			node = macLabels[i];
			label = node.getAttribute('label-mac');
			node.setAttribute('label', label);
			if (node.localName != 'caption')
				node.setAttribute('flex', 1);
		}
	}
}

function resetActions()
{
	var suffix = '-menulist';
	[
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
	].forEach(function(aPref) {
		var value = getDefaultPref(aPref);
		var preference = document.getElementById(aPref);
		var menulist = document.getElementById(aPref+suffix);
		preference.value = menulist.value = value;
	});
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
