Components.utils.import('resource://gre/modules/Services.jsm');
var { TextLinkConstants } = Components.utils.import('resource://textlink-modules/constants.js', {});

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
		'actions.0.action',
		'actions.0.trigger.mouse',
		'actions.0.trigger.key',
		'actions.1.action',
		'actions.1.trigger.mouse',
		'actions.1.trigger.key',
		'actions.2.action',
		'actions.2.trigger.mouse',
		'actions.2.trigger.key',
		'actions.3.action',
		'actions.3.trigger.mouse',
		'actions.3.trigger.key',
		'actions.4.action',
		'actions.4.trigger.mouse',
		'actions.4.trigger.key'
	].forEach(function(aPref) {
		var value = getDefaultPref(TextLinkConstants.DOMAIN + aPref);
		var preference = document.getElementById('textlink.' + aPref);
		var menulist = document.getElementById('textlink.' + aPref + suffix);
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
