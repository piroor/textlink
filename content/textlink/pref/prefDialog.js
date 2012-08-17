Components.utils.import('resource://gre/modules/Services.jsm');

function init()
{
	initForProduct();
	initMacLabel();
}

function initForProduct()
{
	var XULAppInfo = Services.appinfo;
	var product;
	switch (XULAppInfo.ID)
	{
		case '{ec8030f7-c20a-464f-9b0e-13a3a9e97384}':
			product = 'browser';
			break;
		case '{3550f703-e582-4d05-9a08-453d09bdfdc6}':
			product = 'messenger';
			break;
		default:
			return;
	}

	var defaultAction = 4; // load in current

	var nodes = evaluateXPath('/descendant::*[starts-with(@class, "product-")]');
	for (let i = nodes.snapshotLength-1; i > -1; i--)
	{
		let node = nodes.snapshotItem(i);

		let target = node.getAttribute('class').replace('product-', '');
		if (target == product) continue;

		node.setAttribute('collapsed', true);

		switch (node.localName)
		{
			case 'menuitem':
				let menulist = evaluateXPath(
						'ancestor::*[local-name()="menulist"]',
						node,
						XPathResult.FIRST_ORDERED_NODE_TYPE
					).singleNodeValue;
				if (menulist && menulist.selectedItem == node)
					menulist.value = defaultAction;
				break;

			default:
				break;
		}
	}
}

function evaluateXPath(aExpression, aContext, aType)
{
	return document.evaluate(
			aExpression,
			aContext || document,
			null,
			aType || XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
}

function initMacLabel()
{
	if (navigator.platform.toLowerCase().indexOf('mac') < 0) return;

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
	const DEFPrefs = Services.prefs.getDefaultBranch(null);
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
