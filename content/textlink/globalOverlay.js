// start of definition 
if (!window.TextLinkService) {

var TextLinkService =
{
	debug : false,

	initialized : false,

//	findRangeSize : 512,
	get findRangeSize()
	{
		return this.getPref('textlink.find_range_size');
	},



	knsISupportsString : ('nsISupportsWString' in Components.interfaces) ? Components.interfaces.nsISupportsWString : Components.interfaces.nsISupportsString,
	kSupportsString : ('@mozilla.org/supports-wstring;1' in Components.classes) ? '@mozilla.org/supports-wstring;1' : '@mozilla.org/supports-string;1',

	XULNS : 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',

	ACTION_DISABLED               : 0,
	ACTION_STEALTH                : 1,
	ACTION_SELECT                 : 2,
	ACTION_OPEN_IN_CURRENT        : 4,
	ACTION_OPEN_IN_WINDOW         : 8,
	ACTION_OPEN_IN_TAB            : 16,
	ACTION_OPEN_IN_BACKGROUND_TAB : 32,

	get kURIPattern()
	{
		if (!this._kURIPattern)
			this._kURIPattern = this.kURIPattern_base.replace(
					/%PART_PATTERN%/g,
					this.kURIPattern_part
				).replace(
					/%DOMAIN_PATTERN%/g,
					'[0-9a-z\\.-]+\\.('+this.kTopLevelDomains.join('|')+')\\b'
				);

		return this._kURIPattern;
	},
	_kURIPattern : null,

	get kURIPatternRelative()
	{
		if (!this._kURIPatternRelative)
			this._kURIPatternRelative = this.kURIPatternRelative_base.replace(
					/%PART_PATTERN%/g,
					this.kURIPattern_part
				);

		return this._kURIPatternRelative;
	},
	_kURIPatternRelative : null,

	get kURIPatternMultibyte()
	{
		if (!this._kURIPatternMultibyte)
			this._kURIPatternMultibyte = this.kURIPatternMultibyte_base.replace(
					/%PART_PATTERN%/g,
					this.kURIPatternMultibyte_part
				).replace(
					/%DOMAIN_PATTERN%/g,
					'[0-9a-z\\.-]+[\\.]('+this.kTopLevelDomains.join('|')+')\\b'
/*
					'[0-9a-z\\.-\uff10-\uff19\uff41-\uff5a\uff21-\uff3a\uff0e\uff0d]+[\\.\uff0e]('+
					this.kTopLevelDomains.join('|')+
					'|'+
					this.convertHalfWidthToFullWidth(this.kTopLevelDomains.join('|')).replace(/\uff5c/g, '|')+
					')'
*/
				);

		return this._kURIPatternMultibyte;
	},
	_kURIPatternMultibyte : null,

	get kURIPatternMultibyteRelative()
	{
		if (!this._kURIPatternMultibyteRelative)
			this._kURIPatternMultibyteRelative = this.kURIPatternMultibyteRelative_base.replace(
					/%PART_PATTERN%/g,
					this.kURIPatternMultibyte_part
				);

		return this._kURIPatternMultibyteRelative;
	},
	_kURIPatternMultibyteRelative : null,

	kURIPattern_base : '\\(?([\\*\\+\\w]+:(//)?%PART_PATTERN%|%DOMAIN_PATTERN%(/%PART_PATTERN%)?)',
	kURIPatternRelative_base : '%PART_PATTERN%(\\.|/)%PART_PATTERN%',

	kURIPatternMultibyte_base : '[\\(\uff08]?([\\*\\+a-z0-9_\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff3f]+[:\uff1a](//|\uff0f\uff0f)?%PART_PATTERN%|%DOMAIN_PATTERN%([/\uff0f]%PART_PATTERN%)?)',
	kURIPatternMultibyteRelative_base : '%PART_PATTERN%(\\.|\uff0e|/|\uff0f)%PART_PATTERN%',

	kURIPattern_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#]+',
	kURIPatternMultibyte_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#\uff0d\uff3f\uff0e\uff01\uff5e\uffe3\uff0a\u2019\uff08\uff09\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03]+',

	kOnebyteArray : '-_.!~~*\'()acdefghijklmnopqrstuvwxyzACDEFGHIJKLMNOPQRSTUVWXYZ0123456789;/?:@&=+$,%#',
	kMultibyteArray : '\uff0d\uff3f\uff0e\uff01\uffe3\uff5e\uff0a\u2019\uff08\uff09\uff41\uff43\uff44\uff45\uff46\uff47\uff48\uff49\uff4a\uff4b\uff4c\uff4d\uff4e\uff4f\uff50\uff51\uff52\uff53\uff54\uff55\uff56\uff57\uff58\uff59\uff5a\uff21\uff23\uff24\uff25\uff26\uff27\uff28\uff29\uff2a\uff2b\uff2c\uff2d\uff2e\uff2f\uff30\uff31\uff32\uff33\uff34\uff35\uff36\uff37\uff38\uff39\uff3a\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03',

	// see http://www4.plala.or.jp/nomrax/TLD/
	kTopLevelDomains : [
		// iTLD , gTLD
		'arpa', 'int', 'nato', 'com', 'net', 'org', 'info', 'biz', 'name', 'pro', 'museum', 'coop', 'aero', 'edu', 'gov', 'mil',

		// ccTLD
		'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'an', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
		'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'by', 'bz',
		'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cr', 'cs', 'sk', 'cu', 'cv', 'cx', 'cy', 'cz',
		'dd', 'de', 'dg', 'dj', 'dk', 'dm', 'do', 'dz',
		'ea', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et',
		'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'fx',
		'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
		'hk', 'hm', 'hn', 'hr', 'ht', 'hu',
		'ic', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
		'je', 'jm', 'jo', 'jp',
		'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
		'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
		'ma', 'mc', 'md', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
		'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nt', 'nu', 'nz',
		'om',
		'pa', 'pc', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa',
		're', 'ro', 'ru', 'rw',
		'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'st', 'su', 'sv', 'sy', 'sz',
		'ta', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tm', 'tn', 'to', 'tp', 'tr', 'tt', 'tv', 'tw', 'tz',
		'ua', 'ug', 'uk', 'um', 'us', 'uy', 'uz',
		'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu',
		'wf', 'wg', 'ws',
		'yd', 'ye', 'yt', 'yu',
		'za', 'zm', 'zr', 'zw'
	],
	 
	get browsers() 
	{
		return document.getElementsByTagNameNS(this.XULNS, 'tabbrowser');
	},
 
	get browserURI() 
	{
		if (!this._browserURI) {
			var uri = this.getPref('browser.chromeURL');
			if (!uri) {
				try {
					var handler = Components.classes['@mozilla.org/commandlinehandler/general-startup;1?type=browser'].getService(Components.interfaces.nsICmdLineHandler);
					uri = handler.chromeUrlForTask;
				}
				catch(e) {
				}
			}
			if (uri.charAt(uri.length-1) == '/')
				uri = uri.replace(/chrome:\/\/([^\/]+)\/content\//, 'chrome://$1/content/$1.xul');
			this._browserURI = uri;
		}
		return this._browserURI;
	},
	_browserURI : null,
 
	// XPConnect 
	
	get Prefs() 
	{
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
	
	getPref : function(aPrefstring) 
	{
		try {
			var type = this.Prefs.getPrefType(aPrefstring);
			switch (type)
			{
				case this.Prefs.PREF_STRING:
					return this.Prefs.getComplexValue(aPrefstring, this.knsISupportsString).data;
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				var string = Components.classes[this.kSupportsString].createInstance(this.knsISupportsString);
				string.data = aNewValue;
				this.Prefs.setComplexValue(aPrefstring, this.knsISupportsString, string);
				break;
			case 'number':
				this.Prefs.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				this.Prefs.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
  
	get IOService() 
	{
		if (!this._IOService) {
			this._IOService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		}
		return this._IOService;
	},
	_IOService : null,
 
	get URIFixup() 
	{
		if (!this._URIFixup) {
			this._URIFixup = Components.classes['@mozilla.org/docshell/urifixup;1'].getService(Components.interfaces.nsIURIFixup);
		}
		return this._URIFixup;
	},
	_URIFixup : null,
 
	get Find() 
	{
		if (!this._Find) {
			this._Find = Components.classes['@mozilla.org/embedcomp/rangefind;1'].createInstance(Components.interfaces.nsIFind);
		}
		return this._Find;
	},
	_Find : null,
  
	// common functions 
	
	makeURIFromSpec : function(aURI) 
	{
		try {
			var newURI;
			aURI = aURI || '';
			if (aURI && String(aURI).match(/^file:/)) {
				var tempLocalFile;
				try {
					var fileHandler = this.IOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
					tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
				}
				catch(ex) { // [[interchangeability for Mozilla 1.1]]
					try {
						tempLocalFile = this.IOService.getFileFromURLSpec(aURI);
					}
					catch(ex) { // [[interchangeability for Mozilla 1.0.x]]
						tempLocalFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
						this.IOService.initFileFromURLSpec(tempLocalFile, aURI);
					}
				}
				newURI = this.IOService.newFileURI(tempLocalFile); // we can use this instance with the nsIFileURL interface.
			}
			else {
				newURI = this.IOService.newURI(aURI, null, null);
			}

			return newURI;
		}
		catch(e){
		}
		return null;
	},
 
	loadText : function(aURI) 
	{
		var uri;
		try {
			uri = aURI.QueryInterface(Components.interfaces.nsIURI);
		}
		catch(e) {
			uri = this.makeURIFromSpec(aURI);
		}

		try {
			var channel = this.IOService.newChannelFromURI(uri);
			var stream  = channel.open();

			var scriptableStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			scriptableStream.init(stream);

			var fileContents = scriptableStream.read(scriptableStream.available());

			scriptableStream.close();
			stream.close();

			return fileContents;
		}
		catch(e) {
		}

		return null;
	},
 
	// from http://taken.s101.xrea.com/blog/article.php?id=510
	convertFullWidthToHalfWidth : function(aString) 
	{
		return aString.replace(this.fullWidthRegExp, this.f2h);
	},
	fullWidthRegExp : /[\uFF01\uFF02\uFF03\uFF04\uFF05\uFF06\uFF07\uFF08\uFF09\uFF0A\uFF0B\uFF0C\uFF0D\uFF0E\uFF0F\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19\uFF1A\uFF1B\uFF1C\uFF1D\uFF1E\uFF1F\uFF20\uFF21\uFF22\uFF23\uFF24\uFF25\uFF26\uFF27\uFF28\uFF29\uFF2A\uFF2B\uFF2C\uFF2D\uFF2E\uFF2F\uFF30\uFF31\uFF32\uFF33\uFF34\uFF35\uFF36\uFF37\uFF38\uFF39\uFF3A\uFF3B\uFF3C\uFF3D\uFF3E\uFF3F\uFF40\uFF41\uFF42\uFF43\uFF44\uFF45\uFF46\uFF47\uFF48\uFF49\uFF4A\uFF4B\uFF4C\uFF4D\uFF4E\uFF4F\uFF50\uFF51\uFF52\uFF53\uFF54\uFF55\uFF56\uFF57\uFF58\uFF59\uFF5A\uFF5B\uFF5C\uFF5D\uFF5E]/g,
	f2h : function() {
		var str = arguments[0];
		var code = str.charCodeAt(0);
		code &= 0x007F;
		code += 0x0020;
		return String.fromCharCode(code);
	},

	convertHalfWidthToFullWidth : function(aString)
	{
		return aString.replace(this.halfWidthRegExp, this.h2f);
	},
	halfWidthRegExp : /[!"#$%&'\(\)\*\+,-\.\/0123456789:;<=>\?@ABCDEFGHIJKLMNOPQRSTUVWXYZ\[\\\]\^_`abcdefghijklmnopqrstuvwxyz\{\|\}~]/g,
	h2f : function() {
		var str = arguments[0];
		var code = str.charCodeAt(0);
		code += 0xFF00;
		code -= 0x0020;
		return String.fromCharCode(code);
	},
 
	matchURIRegExp : function(aString) 
	{
		var relative  = this.getPref('textlink.relative.enabled');

		var regexp = [];
		if (this.getPref('textlink.multibyte.enabled')) {
			regexp.push(this.kURIPatternMultibyte);
			if (relative) regexp.push(this.kURIPatternMultibyteRelative);
		}
		else {
			regexp.push(this.kURIPattern);
			if (relative) regexp.push(this.kURIPatternRelative);
		}

		return aString.match(new RegExp(regexp.join('|'), 'ig'));
	},
 
	fixupURI : function(aURIComponent, aWindow) 
	{
if (this.debug) dump('TEXT LINK URI DETECTING::\n  '+aURIComponent+'\n');
		if (this.getPref('textlink.multibyte.enabled')) {
			aURIComponent = this.convertFullWidthToHalfWidth(aURIComponent);
if (this.debug) dump('   (F2H) => '+aURIComponent+'\n');
		}

		aURIComponent = this.sanitizeURIString(aURIComponent);
if (this.debug) dump('   (Sanitized) => '+aURIComponent+'\n');
		if (!aURIComponent) return null;

		aURIComponent = this.fixupSchemer(aURIComponent);
if (this.debug) dump('   (Fixup Schemer) => '+aURIComponent+'\n');

		if (this.getPref('textlink.relative.enabled')) {
			aURIComponent = this.makeURIComplete(aURIComponent, aWindow.location.href);
if (this.debug) dump('   (Resolve Relative Path) => '+aURIComponent+'\n');
}

		var regexp = new RegExp();
		if (
			regexp.compile(
				'('+
				this.getPref('textlink.schemer')
						.replace(/([\(\)\+\.\{\}])/g, '\\$1')
						.replace(/\?/g, '.')
						.replace(/\*/g, '.+')
						.replace(/[,\| \n\r\t]+/g, '|')+
				')'
			).test(
				aURIComponent.substr(0, aURIComponent.indexOf(':')).toLowerCase()
			)
			)
			return aURIComponent;

		return null;
	},
	
	sanitizeURIString : function(aURIComponent) 
	{
		// escape patterns like program codes like JavaScript etc.
		if (this.getPref('textlink.relative.enabled')) {
			if (
				(
					aURIComponent.match(/^([^\/\.]+\.)+([^\/\.]+)$/) &&
					!RegExp.$2.match(new RegExp(['^(', this.kTopLevelDomains.join('|'), ')$'].join('')))
				) ||
				aURIComponent.match(/(\(\)|\([^\/]+\)|[;\.,])$/)
				)
				return '';
		}

		while (
			aURIComponent.match(/^\((.*)$/) ||
			aURIComponent.match(/^([^\(]*)\)$/) ||
			aURIComponent.match(/^(.*)[\.,]$/) ||
			aURIComponent.match(/^([^\"]*)\"$/) ||
			aURIComponent.match(/^([^\']*)\'$/) ||
			aURIComponent.match(/^(.+)\s*\([^\)]+$/) ||
			aURIComponent.match(/^[^\(]+\)\s*(.+)$/) ||
			aURIComponent.match(/^[^\.\/:]*\((.+)\)[^\.\/]*$/)
			)
			aURIComponent = RegExp.$1;

		return aURIComponent; // aURIComponent.replace(/^.*\((.+)\).*$/, '$1');
	},
 
	fixupSchemer : function(aURI) 
	{
		var table = this.getPref('textlink.schemer.fixup.table')
						.replace(/(\s*[^:\s]+)\s*=>\s*([^:\s]+)(\s*([,\| \n\r\t]|$))/g, '$1:=>$2:$3');
		var regexp = new RegExp();

		var targets = table.replace(/\s*=>\s*[^,\| \n\r\t]+|\s*=>\s*[^,\| \n\r\t]+$/g, '')
						.replace(/([\(\)\+\.\{\}])/g, '\\$1')
						.replace(/\?/g, '.')
						.replace(/\*/g, '.+')
						.replace(/\s*[,\| \n\r\t]+\s*/g, '|');

		if (aURI.match(regexp.compile('^('+targets+')', 'g'))) {
			var target = RegExp.$1;
			eval((targets+'|')
					.replace(/([^|]+)\|/g,
						'if (/^$1$/.test("'+target+'")) table = table.replace(/\\b$1\\s*=>/, "'+target+'=>");'
				));

if (this.debug)
	dump('     fixupSchemer::\n'+
		(targets+'|')
					.replace(/([^|]+)\|/g,
						'      if (/^$1$/.test("'+target+'")) table = table.replace(/\\b$1\\s=>/, "'+target+'=>");\n'
				)+
		'      table : '+table+'\n'+
		'      regexp : '+'([,\\| \\n\\r\\t]|^)'+target.replace(/([\(\)\+\?\.\{\}])/g, '\\$1').replace(/\*/g, '.')+'\\s*=>\\s*([^,\\| \\n\\r\\t]+)\n'
	);

			if (table.match(
					regexp.compile(
						'([,\\| \\n\\r\\t]|^)'+
						target.replace(/([\(\)\+\?\.\{\}])/g, '\\$1')
							.replace(/\?/g, '.')
							.replace(/\*/g, '.+')+
						'\\s*=>\\s*([^,\\| \\n\\r\\t]+)'
					)
				))
				aURI = aURI.replace(target, RegExp.$2);
		}
		else if (!/^\w+:/.test(aURI)) {
			var schemer = this.getPref('textlink.schemer.fixup.default');
			if (schemer)
				aURI = schemer+'://'+aURI;
		}

		return aURI;
	},
 
	// 相対パスの解決 
	makeURIComplete : function(aURI, aSourceURI)
	{
		if (aURI.match(/^(urn|mailto):/i)) return aURI;

		if (aURI.match(/^([^\/\.]+\.)+([^\/\.]+)/) &&
			RegExp.$2.match(new RegExp(['^(', this.kTopLevelDomains.join('|'), ')$'].join('')))) {
			var fixedURI = this.URIFixup.createFixupURI(aURI || 'about:blank', this.URIFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);
			return fixedURI.spec;
		}

		var baseURI = this.IOService.newURI(aSourceURI, null, null);
		return this.IOService.newURI(aURI, null, baseURI).spec;
	},
   
	handleEvent : function(aEvent) 
	{
if (this.debug) dump('TextLinkService.handleEvent();\n');
		for (var i = 0; this.getPref('textlink.actions.'+i+'.action') !== null; i++)
		{
			if (this.handleEventFor(aEvent, i)) return;
		}
	},
	 
	handleEventFor : function(aEvent, aIndex) 
	{
		var trigger;

		var node;
		try {
			node = aEvent.originalTarget || aEvent.target;
		}
		catch(e) {
			node = aEvent.target;
		}
		while (node.parentNode && node.nodeType != Node.ELEMENT_NODE)
			node = node.parentNode;

		if (node.ownerDocument == document) return false;

		var doc = Components.lookupMethod(node, 'ownerDocument').call(node);
		if (Components.lookupMethod(doc, 'designMode').call(doc) == 'on') return false;

		if (
			(
				(
					aEvent.type == 'keypress' &&
					(trigger = this.getPref('textlink.actions.'+aIndex+'.trigger.key').toLowerCase()) &&
					/(VK_[^-,|\s]+)/i.test(trigger) &&
					aEvent['DOM_'+RegExp.$1.toUpperCase()] &&
					(
						RegExp.$1.toUpperCase().search(/VK_(ENTER|RETURN)/) > -1 ?
							(
								aEvent.keyCode == aEvent.DOM_VK_ENTER ||
								aEvent.keyCode == aEvent.DOM_VK_RETURN
							) :
							aEvent.keyCode == aEvent['DOM_'+RegExp.$1.toUpperCase()]
					) &&
					node.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) < 0
				) ||
				(
					(trigger = this.getPref('textlink.actions.'+aIndex+'.trigger.mouse').toLowerCase()) &&
					(
						aEvent.type == 'dblclick' ?
							(aEvent.button == 0 && trigger.indexOf('dblclick') > -1) :
						trigger.indexOf('middleclick') > -1 ?
							aEvent.button == 1 :
							aEvent.button == 0
					)
				)
			) &&
			(
				(
					trigger.indexOf('accel') > -1 ?
						(aEvent.ctrlKey || aEvent.metaKey) :
						(
							(trigger.indexOf('ctrl') > -1 == aEvent.ctrlKey) &&
							(trigger.indexOf('meta') > -1 == aEvent.metaKey)
						)
				) &&
				(trigger.indexOf('shift') > -1 == aEvent.shiftKey) &&
				(trigger.indexOf('alt') > -1 == aEvent.altKey)
			)
			) {
			this.openClickedURI(aEvent, this.getPref('textlink.actions.'+aIndex+'.action'), trigger);
			return true;
		}

		return false;
	},
 	 
	FIND_CLICKED      : 1,
	FIND_ALL_SELECTED : 2,
	getSelectionURI : function(aMode, aWindow) 
	{
		var selectionURIs = [];

		var w = aWindow;
		if (!w) {
			w = document.commandDispatcher.focusedWindow;
			if ((new XPCNativeWrapper(w, 'top')).top != gBrowser.contentWindow)
				w = gBrowser.contentWindow;
		}

		var winWrapper = new XPCNativeWrapper(w, 'location', 'document', 'getSelection()', 'QueryInterface()');

		var sel = winWrapper.getSelection();
		if (!sel) return aMode == this.FIND_CLICKED ? '' : selectionURIs ;

		var originalRange;
		try {
			originalRange = sel.getRangeAt(0);
		}
		catch(e) {
			return aMode == this.FIND_CLICKED ? '' : selectionURIs ;
		}


		var findRange = this.getFindRangeInWindow(w);


		var selCon = winWrapper
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell)
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsISelectionDisplay)
			.QueryInterface(Components.interfaces.nsISelectionController);

		var documentSelection = selCon.getSelection(selCon.SELECTION_HIDDEN);
		documentSelection.removeAllRanges();
		documentSelection.addRange(findRange);

		var uris = this.matchURIRegExp(documentSelection.toString());
		documentSelection.removeAllRanges();

		if (!uris) {
			sel.removeAllRanges();
			sel.addRange(originalRange);
			return aMode == this.FIND_CLICKED ? '' : selectionURIs ;
		}


		var startPoint = findRange.cloneRange();
		startPoint.collapse(true);

		var endPoint = findRange.cloneRange();
		endPoint.collapse(false);


		var foundRange;
		var uri;
		const max    = uris.length;
		const strict = (aMode == this.FIND_CLICKED) && this.getPref('textlink.find_click_point.strict');

		var done = {};
		for (var i = 0; i < max; i++)
		{
			if (typeof uris[i] != 'string') uris[i] = uris[i][0];
			uris[i] = uris[i].replace(/^\s+|\s+$/g, '');

			foundRange = this.Find.Find(uris[i], findRange, startPoint, endPoint);
			if (!foundRange) {
//dump('NOT FOUND: '+uris[i]+'\n');
				continue;
			}
//dump('FOUND RANGE: '+foundRange.toString()+'\n');
/*
dump('TEXTLINK: '+originalRange+'\n\t'+uris[i]+'\n\t'+originalRange.compareBoundaryPoints(Range.START_TO_START, foundRange)+', '+
originalRange.compareBoundaryPoints(Range.START_TO_END, foundRange)+', '+
originalRange.compareBoundaryPoints(Range.END_TO_START, foundRange)+', '+
originalRange.compareBoundaryPoints(Range.END_TO_END, foundRange)+'\n'
);
*/

			if (
				( // ダブルクリックで生じた選択範囲がURIの中にあるかどうか
					originalRange.compareBoundaryPoints(Range.START_TO_START, foundRange) >= 0 &&
					originalRange.compareBoundaryPoints(Range.END_TO_END, foundRange) <= 0
				) ||
				(!strict && ( // ダブルクリックで生じた選択範囲がURIと重なっているかどうか
					( // 前の方で重なっている
						originalRange.compareBoundaryPoints(Range.START_TO_START, foundRange) < 0 &&
						originalRange.compareBoundaryPoints(Range.START_TO_END, foundRange) == 1
					) ||
					( // 後の方で重なっている
						originalRange.compareBoundaryPoints(Range.END_TO_START, foundRange) < 0 &&
						originalRange.compareBoundaryPoints(Range.END_TO_END, foundRange) > 0
					)
				))
				) {
				uri = this.fixupURI(uris[i], w);

				if (uri && !(uri in done)) {
					done[uri] = true;
					if (aMode == this.FIND_CLICKED) {
						foundRange = this.Find.Find(uri, findRange, startPoint, endPoint);
						if (!foundRange)
							foundRange = this.Find.Find(this.sanitizeURIString(uris[i]), findRange, startPoint, endPoint);

						sel.removeAllRanges();
						sel.addRange(foundRange);

						findRange.detach();
						startPoint.detach();
						endPoint.detach();

						return uri;
					}
					else
						selectionURIs.push(uri);
				}
			}

			startPoint.detach();
			startPoint = foundRange;
			startPoint.collapse(false);
		}

		sel.removeAllRanges();
		sel.addRange(originalRange);

		findRange.detach();
		startPoint.detach();
		endPoint.detach();

		return aMode == this.FIND_CLICKED ? '' : selectionURIs ;
	},
	
	getFindRangeInWindow : function(aWindow) 
	{
		var winWrapper = new XPCNativeWrapper(aWindow, 'document', 'getSelection()', 'QueryInterface()');
		var docWrapper = new XPCNativeWrapper(winWrapper.document, 'documentElement', 'createRange()');


		var originalRange = winWrapper.getSelection().getRangeAt(0);

		var findRange = docWrapper.createRange();
		findRange.selectNode(docWrapper.documentElement);


		var count = 0;
		var max   = Math.ceil(Math.abs(this.findRangeSize)/2);
		var node, prevNode;

		node     = originalRange.startContainer;
		count    = originalRange.startOffset - node.textContent.length;
		prevNode = null;
		while (node && count < max)
		{
			count += node.textContent.length;
			prevNode = node;

			node = node.previousSibling || node.parentNode.previousSibling;
			if (node)
				while (node.hasChildNodes())
					node = node.lastChild;
		}
		findRange.setStartBefore(prevNode || originalRange.startContainer);

		node     = originalRange.endContainer;
		count    = originalRange.endOffset - node.textContent.length;
		prevNode = null;
		while (node && count < max)
		{
			count += node.textContent.length;
			prevNode = node;

			node = node.nextSibling || node.parentNode.nextSibling;
			if (node)
				while (node.hasChildNodes())
					node = node.firstChild;
		}
		findRange.setEndAfter(prevNode || originalRange.endContainer);


//dump('FIND RANGE:: "'+findRange.toString()+'"\n');
		return findRange;
	},
  
	openClickedURI : function(aEvent, aAction, aTrigger) 
	{
if (this.debug) dump('TextLinkService.openClickedURI();\n');
		var target = aEvent.originalTarget;
		var nodeWrapper;
		while (
			(nodeWrapper = new XPCNativeWrapper(target, 'nodeType', 'parentNode')) &&
			nodeWrapper.nodeType != Node.ELEMENT_NODE
			)
			target = nodeWrapper.parentNode;

		nodeWrapper = new XPCNativeWrapper(target, 'localName', 'ownerDocument');
		if (
			aAction == this.ACTION_DISABLED ||
			aEvent.button > 0 ||
			nodeWrapper.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var b = aEvent.currentTarget;
		if (!b) return;

		var w = (new XPCNativeWrapper(nodeWrapper.ownerDocument, 'defaultView')).defaultView;

		var uri = this.getClickedURI(w);
		if (!uri || aAction & this.ACTION_SELECT) return;


		var referrer = (
					aAction & this.ACTION_STEALTH ||
					(b.selectedTab && b.selectedTab.referrerBlocked)
				) ?
					null :
					this.makeURIFromSpec(w.location.href) ;

		if (aAction & this.ACTION_OPEN_IN_CURRENT ||
			uri.match(/^mailto:/) ||
			b.localName != 'tabbrowser') {
			b.loadURI(uri, referrer);
		}
		else if (aAction & this.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', uri, null, referrer);
		}
		else {
			var selectTab = !(aAction &this.ACTION_OPEN_IN_BACKGROUND_TAB);

			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(w);
			}

			var t;
			if ('loadOneTab' in b) { // Firefox 2.0
				t = b.loadOneTab(uri, referrer, null, null, !selectTab);
			}
			else {
				t = b.addTab(uri, referrer);
				if (selectTab)
					b.selectedTab = t;
			}

			if ('tabGroupsAvailable' in b && b.tabGroupsAvailable) // TBE
				b.attachTabTo(t, b.selectedTab, true);
		}
	},
	
	getClickedURI : function(aWindow) 
	{
		return this.getSelectionURI(this.FIND_CLICKED, aWindow);
	},
  
	openTextLinkIn : function(aOpenInFlag) 
	{
		var uris = this.getSelectionURI(this.FIND_ALL_SELECTED);
		if (!uris.length) return;

		var selectTab;
		var tab;
		var b = gBrowser;

		var current = b.selectedTab;

		var openInFlag = aOpenInFlag;
		if (openInFlag === void(0)) openInFlag = this.ACTION_OPEN_IN_CURRENT;

		if (
			uris.length > 1 &&
			(openInFlag == this.ACTION_OPEN_IN_TAB ||
			openInFlag == this.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			(
				('BookmarksCommand' in window && '_confirmOpenTabs' in BookmarksCommand) ? // Firefox 2.0
					!BookmarksCommand._confirmOpenTabs(uris.length) :
				('PlacesController' in window) ? // Firefox 3
					!PlacesController.prototype._confirmOpenTabs(uris.length) :
					false
			)
			)
			return;

		for (var i in uris)
		{
			if (
				(
					('isReallyBlank' in b.selectedTab) ? b.selectedTab.isReallyBlank :
						(b.currentURI && b.currentURI.spec == 'about:blank')
				)
				) {
				if ('TreeStyleTabService' in window) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				b.loadURI(uris[i]);
				if (!selectTab) selectTab = b.selectedTab;
			}
			else {
				if (openInFlag == this.ACTION_OPEN_IN_WINDOW) {
					window.open(uris[i]);
				}
				else if (openInFlag == this.ACTION_OPEN_IN_TAB ||
					openInFlag == this.ACTION_OPEN_IN_BACKGROUND_TAB ||
					(openInFlag == this.ACTION_OPEN_IN_CURRENT && i > 0)) {
					if ('TreeStyleTabService' in window && !TreeStyleTabService.checkToOpenChildTab(b)) // Tree Style Tab
						TreeStyleTabService.readyToOpenChildTab(b, true);

					tab = b.addTab(uris[i]);

					if (b.tabGroupsAvailable) // for TBE
						tab.parentTab = current;

					if (!selectTab) selectTab = tab;
				}
				else if (openInFlag == this.ACTION_OPEN_IN_CURRENT) {
					b.loadURI(uris[i]);
					selectTab = b.selectedTab;
				}
			}
		}

		if ('TreeStyleTabService' in window) // Tree Style Tab
			TreeStyleTabService.stopToOpenChildTab(b);

		if (selectTab &&
			openInFlag != this.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}
	},
 
	init : function() 
	{
		if (this.initialized) return;
		this.initialized = true;

		this.loadDefaultPrefs();

		if ('nsContextMenu' in window) {
			nsContextMenu.prototype.__textlink__initItems = nsContextMenu.prototype.initItems;
			nsContextMenu.prototype.initItems = this.initItems;
		}

		var b = this.browsers;
		for (var i = 0; i < b.length; i++)
		{
//			b[i].addEventListener('click', this, true);
			b[i].addEventListener('dblclick', this, true);
			b[i].addEventListener('keypress', this, true);
		}
	},
	
	loadDefaultPrefs : function() 
	{
		const DEFPrefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getDefaultBranch(null);
		var knsISupportsString = this.knsISupportsString;
		var kSupportsString = this.kSupportsString;
		function pref(aPrefstring, aValue) {
			switch (typeof aValue)
			{
				case 'string':
					var string = Components.classes[kSupportsString].createInstance(knsISupportsString);
					string.data = aValue ;
					DEFPrefs.setComplexValue(aPrefstring, knsISupportsString, string);
					break;
				case 'number':
					DEFPrefs.setIntPref(aPrefstring, parseInt(aValue));
					break;
				default:
					DEFPrefs.setBoolPref(aPrefstring, aValue);
					break;
			}
			prefs.push(aPrefstring);
		}

		var prefs = [];
		eval(this.loadText('chrome://textlink/content/default.js'));

		var nullPointer;
		for (var i in prefs)
			nullPointer = this.getPref(prefs[i]);
	},
 
	// gContextMenu.initItems 
	initItems : function()
	{
		this.__textlink__initItems();

		var TLS = TextLinkService;

		var uris = TLS.getSelectionURI(this.FIND_ALL_SELECTED);

		this.showItem('context-openTextLink-current',
			uris.length && TLS.getPref('textlink.contextmenu.openTextLink.current'));
		this.showItem('context-openTextLink-window',
			uris.length && TLS.getPref('textlink.contextmenu.openTextLink.window'));
		this.showItem('context-openTextLink-tab',
			uris.length && TLS.getPref('textlink.contextmenu.openTextLink.tab'));
		if (uris.length) {
			var uri1, uri2;

			uri1 = uris[0];
			if (uri1.length > 20) uri1 = uri1.substring(0, 15).replace(/\.+$/, '')+'..';

			if (uris.length > 1) {
				uri2 = uris[uris.length-1];
				if (uri2.length > 20) uri2 = uri2.substring(0, 15).replace(/\.+$/, '')+'..';
			}

			var targets = [/\%s1/i, uri1, /\%s2/i, uri2, /\%s/i, uri1];
			var attr = (uris.length > 1) ? 'label-base-multiple' : 'label-base-single' ;

			TLS.setLabel('context-openTextLink-current', attr, targets);
			TLS.setLabel('context-openTextLink-window',  attr, targets);
			TLS.setLabel('context-openTextLink-tab',     attr, targets);
		}
	},
	setLabel : function(aID, aAttr, aTargets)
	{
		var item = document.getElementById(aID);
		if (!item) return;
		var base = item.getAttribute(aAttr);
		for (var i = 0; i < aTargets.length; i+=2)
			base = base.replace(aTargets[i], aTargets[i+1]);

		item.setAttribute('label', base);
	},
  
	destroy : function() 
	{
		if (!this.initialized) return;
		this.initialized = false;

		var b = this.browsers;
		for (var i = 0; i < b.length; i++)
		{
			b[i].removeEventListener('dblclick', this, true);
			b[i].removeEventListener('keypress', this, true);
		}
	}
  
// end of definition 
};
}
 
// initialize 
window.addEventListener('unload', function()
{
	if (!TextLinkService.initialized) return;

	TextLinkService.destroy();
},
false);
window.addEventListener('unload', function()
{
	if (!TextLinkService.initialized) return;

	TextLinkService.destroy();
},
false);

window.addEventListener('load', function()
{
	if (TextLinkService.initialized) return;

	TextLinkService.init();
},
false);
window.addEventListener('load', function()
{
	if (TextLinkService.initialized) return;

	TextLinkService.init();
},
false);
 
