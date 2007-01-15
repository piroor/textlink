/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Text Link.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2004-2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro@p.club.ne.jp>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
	
const ID = '{54BB9F3F-07E5-486c-9B39-C7398B99391C}'; 

var _elementIDs = [
	'textlink.mode',
	'textlink.action',
	'textlink.action.key_events',
	'textlink.openIn',
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


function onBehaviorRadioChanged()
{
	var mode = document.getElementById('textlink.mode');

	controlLinkedItems(mode, mode.value != 0, 'linked-enable');

	document.getElementById('behaviorForMode').selectedIndex = mode.value == 3 ? 1 : 0 ;
}

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

function controlLinkedItems(elem, aShouldEnable, aAttr)
{
	var target = elem.getAttribute(aAttr || 'linked').split(/ +/);
	var item;

	var disabled = (aShouldEnable !== void(0)) ? !aShouldEnable :
				(elem.localName == 'textbox' ? (!elem.value || !Number(elem.value)) : !elem.checked );

	for (var i in target)
	{
		item = document.getElementById(target[i]);
		if (item) {
			if (disabled)
				item.setAttribute('disabled', true);
			else
				item.removeAttribute('disabled');
		}
	}
}


function initMacLabel()
{
	if (navigator.platform.match(/Mac/)) {
		var macLabels = document.getElementsByAttribute('maclabel-for', '*');
		var node;

		for (var i = 0; i < macLabels.length; i++)
		{
			node = document.getElementById(macLabels[i].getAttribute('maclabel-for'));
			if (!node) continue;
			node.setAttribute('label', macLabels[i].getAttribute('value'));
			if (node.localName != 'caption')
				node.setAttribute('flex', 1);
		}
	}
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
var unreg = new exUnregisterer(
	'chrome://textlink/content/contents.rdf',
	'jar:%chromeFolder%textlink.jar!/locale/en-US/textlink/contents.rdf',
	'jar:%chromeFolder%textlink.jar!/locale/ja-JP/textlink/contents.rdf'
);
var STRBUNDLE = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);
var msg = STRBUNDLE.createBundle('chrome://textlink/locale/textlink.properties');


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
  
