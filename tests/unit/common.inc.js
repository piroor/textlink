var namespace = {};

var sv;

function getNewUtils()
{
	var obj = utils.import(baseURL+'../../modules/utils.js', namespace)
					.TextLinkUtils;

	var prefs = utils.loadPrefs('../../defaults/preferences/textlink.js');
	for (var i in prefs)
	{
		obj.observe(null, 'nsPref:changed', i);
	}

	obj.relativePathEnabled = false;
	obj.multibyteEnabled = true;
	obj.IDNEnabled = true;
	obj.i18nPathEnabled = false;
	obj.multilineURIEnabled = false;
	obj.strict = true;

	return obj;
}

function getNewRangeUtils()
{
	var ns = utils.import(baseURL+'../../modules/range.js', namespace);
	var obj = new ns.TextLinkRangeUtils(window);
	ns.TextLinkUtils = obj.utils = getNewUtils();
	return obj;
}

function $(aId)
{
	return content.document.getElementById(aId);
}

function getSelectionInEditable(aNode)
{
	aNode.focus();
	return aNode
			.QueryInterface(Ci.nsIDOMNSEditableElement)
			.editor
			.selectionController
			.getSelection(Ci.nsISelectionController.SELECTION_NORMAL);
}
