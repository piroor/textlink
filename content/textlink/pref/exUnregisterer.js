/*
"exUnregisterer", the automatic unregisterer (Ver.0.4.2003041301) 

exapmle:

>var unreg = new exUnregisterer(
>		'chrome://my_app/content/contents.rdf',
>		'jar:%chromeFolder%my_app.jar!/locale/en-US/contents.rdf'
>	);
>
>unreg.unregister(); // unregister all files
>unreg.removePrefs('my_app'); // remove all prefs ('my_app.XXXX.XXXXX', 'my_app.YYYY.ZZZZ', and so on)


This class has following properties and methods:

Chrome                   : the URI of the chrome directory in Mozilla
                           installed.
UChrome and UChrm        : the URI of the chrome directory in the current
                           profile.
unregister()             : executes unregisteration.
removePrefs(aBranch)     : removes all preferences which include the handled
                           name.
readFrom(aFile)          : reads a text file and returns the content as
                           a string.
writeTo(aFile, aContent) : writes a text file with a string.


When you create an instance of this class, you can use "%chromeFolder%"
to point two "chrome" folders, in the directory Mozilla was installed in
and in the profile directory.



*/

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
 * The Original Code is the exUnregisterer.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2003
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



function exUnregisterer()
{
	this.init(arguments);
	delete this.mTarget.overlaysTemp;
}

exUnregisterer.prototype =
{
	
	// properties 
	
	mTarget : 
	{
		packages : [],
		locales  : [],
		skins    : [],
		overlays : [],
		overlaysTemp : []
	},
 
	mEntriesURL : [], 
 
	get Chrome() 
	{
		if (!this._Chrome) {
			this._Chrome = this.getURISpecFromKey('AChrom');
			if (!this._Chrome.match(/\/$/)) this._Chrome += '/';
		}
		return this._Chrome;
	},
	_Chrome : null,

	get UChrome()
	{
		if (!this._UChrome) {
			this._UChrome = this.getURISpecFromKey('UChrm');
			if (!this._UChrome.match(/\/$/)) this._UChrome += '/';
		}
		return this._UChrome;
	},
	_UChrome : null,

	get UChrm()
	{
		return this.UChrome;
	},
 
	get IOService() 
	{
		if (!this._IOService) {
			this._IOService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		}
		return this._IOService;
	},
	_IOService : null,
 
	get RDF() 
	{
		if (!this._RDF) {
			this._RDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService);
		}
		return this._RDF;
	},
	_RDF : null,
 
	get RDFC() 
	{
		if (!this._RDFC) {
			this._RDFC = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		}
		return this._RDFC;
	},
	_RDFC : null,
  
	// Initialize 
	init : function(aDsourcePaths)
	{
		var rootnode =
			{
				packages : 'urn:mozilla:package:root',
				locales  : 'urn:mozilla:locale:root',
				skins    : 'urn:mozilla:skin:root',
				overlays : 'urn:mozilla:overlays'
			},
			dsource,
			dsourcePaths = [],
			i,
			nodes,
			node,
			target;

		for (i = 0; i < aDsourcePaths.length; i++)
		{
			if (aDsourcePaths[i].match(/%chromeFolder%/i)) {
				dsourcePaths.push(aDsourcePaths[i].replace(/%chromeFolder%/gi, this.Chrome));
				dsourcePaths.push(aDsourcePaths[i].replace(/%chromeFolder%/gi, this.UChrome));
			}
			else
				dsourcePaths.push(aDsourcePaths[i]);
		}

		for (var j = 0; j < dsourcePaths.length; j++)
		{
			try {
				if (this.RDF.GetDataSourceBlocking)
					dsource = this.RDF.GetDataSourceBlocking(dsourcePaths[j]).QueryInterface(Components.interfaces.nsIRDFDataSource);
				else
					dsource = this.RDF.GetDataSource(dsourcePaths[j]);
			}
			catch(e) {
				continue;
			}

			for (i in rootnode)
			{
				try {
					this.RDFC.Init(dsource, this.RDF.GetResource(rootnode[i]));
				}
				catch(e) {
					continue;
				}

				nodes = this.RDFC.GetElements();
				while (nodes.hasMoreElements())
				{
					node = nodes.getNext();
					node = node.QueryInterface(Components.interfaces.nsIRDFResource);
					target = node.Value;
					switch(i)
					{
						case 'locales':
						case 'skins':
							target += ':packages';
							if (!this.mTarget[i][target])
								this.mTarget[i][target] = [];
							break;

						case 'overlays':
							if (!this.mTarget[i+'Temp'][target])
								this.mTarget[i+'Temp'][target] = [];
							break;

						default:
							this.mTarget[i][target] = true;
							break;
					}
				}
			}


			var targets =
				[
					this.mTarget.locales,
					this.mTarget.skins
				];
			for (var k in targets)
			{
				for (i in targets[k])
				{
					try {
						this.RDFC.Init(dsource, this.RDF.GetResource(i));
					}
					catch(e) {
						continue;
					}
					nodes = this.RDFC.GetElements();
					while (nodes.hasMoreElements())
					{
						node = nodes.getNext();
						node = node.QueryInterface(Components.interfaces.nsIRDFResource);
						targets[k][i][node.Value] = true;
					}
				}
			}

			// overlays
			for (i in this.mTarget.overlaysTemp)
			{
				try {
					this.RDFC.Init(dsource, this.RDF.GetResource(i));
				}
				catch(e) {
					continue;
				}
				nodes = this.RDFC.GetElements();
				while (nodes.hasMoreElements())
				{
					node = nodes.getNext();
					node = node.QueryInterface(Components.interfaces.nsIRDFLiteral);
					target = i.replace(/[^:]+:\/\/([^\/]+).+/, 'overlayinfo/$1/content/overlays.rdf');
					if (!this.mTarget.overlays[target])
						this.mTarget.overlays[target] = [];
					if (!this.mTarget.overlays[target][i])
						this.mTarget.overlays[target][i] = [];
					this.mTarget.overlays[target][i][node.Value] = true;
				}
			}

		}

		return;
	},
	
	// Get an URI from an internal keyword 
	getURISpecFromKey : function(aKeyword)
	{
		const DIR = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties);
		var dir = DIR.get(aKeyword, Components.interfaces.nsIFile),
			path;

		try {
			path = this.IOService.newFileURI(dir).spec;
		}
		catch(e) { // [[interchangeability for Mozilla 1.1]]
			path = this.IOService.getURLSpecFromFile(dir);
		}

		return path;
	},

	getURI : function(aKeyword) // old implementation
	{
		return this.getURISpecFromKey(aKeyword);
	},
 
	// Convert an URI to a file path 
	getFilePathFromURLSpec : function(aURL)
	{
		var url = this.IOService.newURI(aURL, null, null);

		if (!url.schemeIs('file')) return '';

		var tempLocalFile;
		try {
			var fileHandler = this.IOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			tempLocalFile = fileHandler.getFileFromURLSpec(aURL);
		}
		catch(e) { // [[interchangeability for Mozilla 1.1]]
			try {
				tempLocalFile = this.IOService.getFileFromURLSpec(aURL);
			}
			catch(ex) { // [[interchangeability for Mozilla 1.0.x]]
				tempLocalFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
				this.IOService.initFileFromURLSpec(tempLocalFile, aURL);
			}
		}
		return tempLocalFile.path;
	},

	getFilePathFromURI : function(aURI) // old implementation
	{
		return this.getFilePathFromURLSpec(aURI);
	},
 
	// Convert a file path to an URI 
	getURLSpecFromFilePath : function(aPath)
	{
		var tempLocalFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		tempLocalFile.initWithPath(aPath);

		try {
			return this.IOService.newFileURI(tempLocalFile).spec;
		}
		catch(e) { // [[interchangeability for Mozilla 1.1]]
			return this.IOService.getURLSpecFromFile(tempLocalFile);
		}
	},
 
	// does exist the file? 
	exists : function(aFilePathOrURL)
	{
		if (aFilePathOrURL.match(/^file:/))
			aFilePathOrURL = this.getFilePathFromURLSpec(aFilePathOrURL);

		var tempLocalFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		tempLocalFile.initWithPath(aFilePathOrURL);
		return tempLocalFile.exists();
	},
  
	// Unregister information 
	unregister : function()
	{

		// packages unregisteration
		for (i in this.mTarget.packages)
		{
			this.removeResources(this.Chrome+'chrome.rdf', 'urn:mozilla:package:root', this.mTarget.packages);
			this.removeResources(this.UChrome+'chrome.rdf', 'urn:mozilla:package:root', this.mTarget.packages);
			this.removeResources(this.Chrome+'all-packages.rdf', 'urn:mozilla:package:root', this.mTarget.packages);
		}

		// locales unregistration
		for (i in this.mTarget.locales)
		{
			this.removeResources(this.Chrome+'chrome.rdf', i, this.mTarget.locales[i]);
			this.removeResources(this.UChrome+'chrome.rdf', i, this.mTarget.locales[i]);
			this.removeResources(this.Chrome+'all-locales.rdf', i, this.mTarget.locales[i]);
		}

		// skins unregistration
		for (i in this.mTarget.skins)
		{
			this.removeResources(this.Chrome+'chrome.rdf', i, this.mTarget.skins[i]);
			this.removeResources(this.UChrome+'chrome.rdf', i, this.mTarget.skins[i]);
			this.removeResources(this.Chrome+'all-skins.rdf', i, this.mTarget.skins[i]);
		}

		// overlays unregistration
		for (i in this.mTarget.overlays)
			for (j in this.mTarget.overlays[i])
			{
				this.removeResources(this.Chrome+i, j, this.mTarget.overlays[i][j]);
				this.removeResources(this.UChrome+i, j, this.mTarget.overlays[i][j]);
			}



		// remove entries from installed-chrome.txt
		var installedChrome = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		installedChrome.initWithPath(this.getFilePathFromURLSpec(this.Chrome+'installed-chrome.txt'));

		var entries = this.readFrom(installedChrome);
		var regexp  = new RegExp();
		for (i in this.mEntriesURL)
			entries = entries.replace(regexp.compile('[^\\n\\r]+'+this.mEntriesURL[i]+'[\\n\\r]+', 'g'), '');
		this.writeTo(installedChrome, entries);


		return;
	},
	
	// Remove info from RDF files 
	removeResources : function(aDsourcePath, aRootURI, aTargets)
	{
		var dsource;
		try {
			var dsource = this.RDF.GetDataSource(aDsourcePath);
				dsource = dsource.QueryInterface(Components.interfaces.nsIRDFDataSource);
		}
		catch(e) {
			return;
		}

		try {
			this.RDFC.Init(dsource, this.RDF.GetResource(aRootURI));
		}
		catch(e) {
//			dump('ERROR: cannot remove resources in '+rootnode);
			return;
		}

		var nodes = this.RDFC.GetElements(),
			node,
			removenode,
			removenodes = [],
			removename,
			removenames,
			removevalue;

		while (nodes.hasMoreElements())
		{
			node = nodes.getNext();
			try {
				node = node.QueryInterface(Components.interfaces.nsIRDFResource);
			}
			catch(e) {
				node = node.QueryInterface(Components.interfaces.nsIRDFLiteral);
			}

			if (!node || (aTargets && !aTargets[node.Value])) continue;

			try {
				removenode = (aDsourcePath.match(/overlays\.rdf$/)) ? this.RDF.GetLiteral(node.Value) : this.RDF.GetResource(node.Value) ;

				removenodes.push(removenode);

				// If the file is "overlays.rdf", then this block is skipped.
				try {
					removenames = dsource.ArcLabelsOut(removenode);
					while (removenames.hasMoreElements())
					{
						removename = removenames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
						removevalue = dsource.GetTarget(removenode, removename, true);
						if (removename.Value.match(/#baseURL$/))
							this.mEntriesURL.push(removevalue.QueryInterface(Components.interfaces.nsIRDFLiteral).Value);

						dsource.Unassert(removenode, removename, removevalue);
					}
				}
				catch(e) {
				}
			}
			catch(e) {
//				dump('cannot remove '+node.Value+' from '+rooturi);
			}
		}

		for (var i in removenodes)
			this.RDFC.RemoveElement(removenodes[i], true);

		// remove empty container from "overlays.rdf"
		if (!this.RDFC.GetCount()) {
			removenames = dsource.ArcLabelsOut(this.RDFC.Resource);
			while (removenames.hasMoreElements())
			{
				removename = removenames.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
				removevalue = dsource.GetTarget(this.RDFC.Resource, removename, true);
				dsource.Unassert(this.RDFC.Resource, removename, removevalue);
			}
		}

		dsource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
		return;
	},
  
	// Remove all user preferences containing the argument "branch" in the top of the name. 
	removePrefs : function(aBranch)
	{
		//const Prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(branch+'.');
		const Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);

		try {
			var prefs = Prefs.getChildList(aBranch+'.', { value: 0 });
			for (var i in prefs) Prefs.clearUserPref(prefs[i]);
		}
		catch(e) {
//			dump('ERROR: cannot clear user preferences.');
		}

		return;
	},
 
	// File I/O 
	
	readFrom : function(aFile) 
	{
		var stream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
		stream.init(aFile, 1, 0, false); // open as "read only"

		var scriptableStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptableStream.init(stream);

		var fileSize = scriptableStream.available();
		var fileContents = scriptableStream.read(fileSize);

		scriptableStream.close();
		stream.close();

		return fileContents;
	},
 
	writeTo : function(aFile, aContent) 
	{
		if (aFile.exists()) aFile.remove(true);
		aFile.create(aFile.NORMAL_FILE_TYPE, 0666);

		var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(aFile, 2, 0x200, false); // open as "write only"

		stream.write(aContent, aContent.length);

		stream.close();
	}
   
} 
 
