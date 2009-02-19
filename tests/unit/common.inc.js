var namespace = {
		window : {
			addEventListener : function() {},
			get gBrowser() {
				return utils.gBrowser;
			}
		},
		get gBrowser() {
			return utils.gBrowser;
		}
	};
utils.include('../../content/textlink/prefs.js', namespace, 'Shift_JIS');
utils.include('../../content/textlink/globalOverlay.js', namespace, 'Shift_JIS');

var sv;

function getNewService()
{
	var obj = {};
	obj.__proto__ = namespace.TextLinkService;

	var prefs = utils.loadPrefs('../../defaults/preferences/textlink.js');
	for (var i in prefs)
	{
		obj.observe(null, 'nsPref:changed', i);
	}

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
