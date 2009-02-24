var TextLinkService = { 
	
	schemerFixupDefault : 'http',
	strict              : true,
	findRangeSize       : 256,
	contextItemCurrent  : true,
	contextItemWindow   : true,
	contextItemTab      : true,
	contextItemCopy     : true,

	get schemer()
	{
		return this._schemer;
	},
	set schemer(val)
	{
		this._schemer = val;
		this._schemerRegExp = null;
		return val;
	},
	_schemer : '', 

	get schemerFixupTable()
	{
		return this._schemerFixupTable;
	},
	set schemerFixupTable(val)
	{
		this._schemerFixupTable = val;
		this._table = null;
		return val;
	},
	_schemerFixupTable : '',

	get shouldParseRelativePath()
	{
		return this._shouldParseRelativePath;
	},
	set shouldParseRelativePath(val)
	{
		this._shouldParseRelativePath = val;
		this._URIMatchingRegExp = null;
		return val;
	},
	_shouldParseRelativePath : false,

	get shouldParseMultibyteCharacters()
	{
		return this._shouldParseMultibyteCharacters;
	},
	set shouldParseMultibyteCharacters(val)
	{
		this._shouldParseMultibyteCharacters = val;
		this._URIMatchingRegExp = null;
		return val;
	},
	_shouldParseMultibyteCharacters : true,
 
	ACTION_DISABLED               : 0, 
	ACTION_STEALTH                : 1,
	ACTION_SELECT                 : 2,
	ACTION_OPEN_IN_CURRENT        : 4,
	ACTION_OPEN_IN_WINDOW         : 8,
	ACTION_OPEN_IN_TAB            : 16,
	ACTION_OPEN_IN_BACKGROUND_TAB : 32,
	ACTION_COPY                   : 1024,

	actions : {},

	kINPUT_FIELD_CONDITITON : 'contains(" input INPUT textarea TEXTAREA textbox ", concat(" ", local-name(), " "))',
	kIGNORE_NODE_CONDITION : 'contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " "))',
	kIGNORE_TEXT_CONDITION : 'ancestor-or-self::*[contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " "))]',
 
// regexp 
	
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
	kURIPatternMultibyte_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#\u301c\uff0d\uff3f\uff0e\uff01\uff5e\uffe3\uff0a\u2019\uff08\uff09\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03]+',
 
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
  
	get browser() 
	{
		return 'SplitBrowser' in window ? SplitBrowser.activeBrowser : gBrowser ;
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
 
	get tooltipBox() 
	{
		return document.getElementById('textLinkTooltip-selectedURI-box');
	},
 
	// XPConnect 
	
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
  
// utilities 
	
	getCurrentFrame : function(aFrame) 
	{
		var frame = aFrame || document.commandDispatcher.focusedWindow;
		if (!frame || frame.top != this.browser.contentWindow) {
			frame = this.browser.contentWindow;
		}
		return frame;
	},
 
	getSelection : function(aFrameOrEditable) 
	{
		var Ci = Components.interfaces;
		if (!aFrameOrEditable || aFrameOrEditable instanceof Ci.nsIDOMWindow) {
			return this.getCurrentFrame(aFrameOrEditable).getSelection();
		}
		else if (aFrameOrEditable instanceof Ci.nsIDOMNSEditableElement) {
			return aFrameOrEditable
					.QueryInterface(Ci.nsIDOMNSEditableElement)
					.editor
					.selectionController
					.getSelection(Ci.nsISelectionController.SELECTION_NORMAL);
		}
		return null;
	},
 
	getEditableFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return this.evaluateXPath(
				'ancestor-or-self::*['+this.kINPUT_FIELD_CONDITITON+'][1]',
				aNode,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
 
	getTextContentFromRange : function(aRange) 
	{
		try {
			var range = aRange.cloneRange();
			range.collapse(true);
			var nodes = this.evaluateXPath(
					'following::*['+this.kIGNORE_NODE_CONDITION+'] | ' +
					'following::*[local-name()="br" or local-name()="BR"] | ' +
					'descendant-or-self::*['+this.kIGNORE_NODE_CONDITION+'] | ' +
					'descendant-or-self::*[local-name()="br" or local-name()="BR"]',
					aRange.startContainer
				);
			var node;
			var value;
			var result = [];
			for (var i = 0, maxi = nodes.snapshotLength; i < maxi; i++)
			{
				node = nodes.snapshotItem(i);

				if (aRange.comparePoint(node, node.textContent.length) < 0) {
					continue;
				}
				else if (aRange.comparePoint(node, 0) > 0) {
					break;
				}

				range.setEndBefore(node);
				result.push(range.toString());

				if (node.localName.toLowerCase() == 'br') {
					result.push('\n');
				}

				range.selectNode(node);
				range.collapse(false);
			}
			range.setEnd(aRange.endContainer, aRange.endOffset);
			result.push(range.toString());
			range.detach();
			return result.join('');
		}
		catch(e) {
		}
		// fallback
		return aRange.toString();
	},
 
	evaluateXPath : function(aExpression, aContext, aType) 
	{
		if (!aType) aType = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
		try {
			var xpathResult = (aContext.ownerDocument || aContext || document).evaluate(
					aExpression,
					(aContext || document),
					this.NSResolver,
					aType,
					null
				);
		}
		catch(e) {
			return {
				singleNodeValue : null,
				snapshotLength  : 0,
				snapshotItem    : function() {
					return null
				}
			};
		}
		return xpathResult;
	},
 
	setClipBoard : function(aString) 
	{
		Components
			.classes['@mozilla.org/widget/clipboardhelper;1']
			.getService(Components.interfaces.nsIClipboardHelper)
			.copyString(aString);
	},
  
// string operations 
	
	// from http://taken.s101.xrea.com/blog/article.php?id=510
	convertFullWidthToHalfWidth : function(aString) 
	{
		return aString.replace(this.fullWidthRegExp, this.f2h)
					.replace(/\u301c/g, '~'); // another version of tilde
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
  
// uri operations 
	
	makeURIFromSpec : function(aURI) 
	{
		try {
			var newURI;
			aURI = aURI || '';
			if (aURI && String(aURI).match(/^file:/)) {
				var fileHandler = this.IOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
				var tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
				newURI = this.IOService.newFileURI(tempLocalFile);
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
 
	matchURIRegExp : function(aString) 
	{
		if (!this._URIMatchingRegExp) {
			var regexp = [];
			if (this.shouldParseMultibyteCharacters) {
				regexp.push(this.kURIPatternMultibyte);
				if (this.shouldParseRelativePath) regexp.push(this.kURIPatternMultibyteRelative);
			}
			else {
				regexp.push(this.kURIPattern);
				if (this.shouldParseRelativePath) regexp.push(this.kURIPatternRelative);
			}
			this._URIMatchingRegExp = new RegExp(regexp.join('|'), 'ig');
		}
		return aString.match(this._URIMatchingRegExp);
	},
	_URIMatchingRegExp : null,
 
	fixupURI : function(aURIComponent, aBaseURI) 
	{
		if (this.shouldParseMultibyteCharacters) {
			aURIComponent = this.convertFullWidthToHalfWidth(aURIComponent);
		}

		aURIComponent = this.sanitizeURIString(aURIComponent);
		if (!aURIComponent) {
			return null;
		}

		aURIComponent = this.fixupSchemer(aURIComponent);

		if (this.shouldParseRelativePath) {
			aURIComponent = this.makeURIComplete(aURIComponent, aBaseURI);
		}

		if (!this._schemerRegExp) {
			this._schemerRegExp = new RegExp(
				'('+
				this.schemer
					.replace(/([\(\)\+\.\{\}])/g, '\\$1')
					.replace(/\?/g, '.')
					.replace(/\*/g, '.+')
					.replace(/[,\| \n\r\t]+/g, '|')+
				')'
			);
		}
		if (this._schemerRegExp.test(
				aURIComponent.substr(0, aURIComponent.indexOf(':')).toLowerCase()
			))
			return aURIComponent;

		return null;
	},
	_schemerRegExp : null,
	
	sanitizeURIString : function(aURIComponent) 
	{
		// escape patterns like program codes like JavaScript etc.
		if (!this._topLevelDomainsRegExp) {
			this._topLevelDomainsRegExp = new RegExp('^(' + this.kTopLevelDomains.join('|') + ')$');
		}
		if (this.shouldParseRelativePath) {
			if (
				(
					aURIComponent.match(/^([^\/\.]+\.)+([^\/\.]+)$/) &&
					!RegExp.$2.match(this._topLevelDomainsRegExp)
				) ||
				aURIComponent.match(/(\(\)|\([^\/]+\)|[;\.,])$/)
				)
				return '';
		}

		aURIComponent = this.removeParen(aURIComponent);

		while (
			aURIComponent.match(/^\((.*)$/) ||
			aURIComponent.match(/^([^\(]*)\)$/) ||
			aURIComponent.match(/^(.*)[\.,]$/) ||
			aURIComponent.match(/^([^\"]*)\"$/) ||
			aURIComponent.match(/^([^\']*)\'$/) ||
			aURIComponent.match(/^(.+)\s*\([^\)]+$/) ||
			aURIComponent.match(/^[^\(]+\)\s*(.+)$/) ||
			aURIComponent.match(/^[^\.\/:]*\((.+)\)[^\.\/]*$/) ||
			(
				!this.shouldParseRelativePath &&
				aURIComponent.match(/^[\.\/:](.+)$/)
			)
			) {
			aURIComponent = RegExp.$1;
		}

		aURIComponent = this.removeParen(aURIComponent);

		return aURIComponent; // aURIComponent.replace(/^.*\((.+)\).*$/, '$1');
	},
	_topLevelDomainsRegExp : null,
 
	removeParen : function(aInput) 
	{
		while (
			aInput.match(/^["\u201d\u201c\u301d\u301f](.+)["\u201d\u201c\u301d\u301f]$/) ||
			aInput.match(/^[`'\u2019\u2018](.+)[`'\u2019\u2018]$/) ||
			aInput.match(/^[(\uff08](.+)[)\uff09]$/) ||
			aInput.match(/^[{\uff5b](.+)[}\uff5d]$/) ||
			aInput.match(/^[\[\uff3b](.+)[\]\uff3d]$/) ||
			aInput.match(/^[<\uff1c](.+)[>\uff1e]$/) ||
			aInput.match(/^[\uff62\u300c](.+)[\uff63\u300d]$/) ||
			aInput.match(/^\u226a(.+)\u226b$/) ||
			aInput.match(/^\u3008(.+)\u3009$/) ||
			aInput.match(/^\u300a(.+)\u300b$/) ||
			aInput.match(/^\u300e(.+)\u300f$/) ||
			aInput.match(/^\u3010(.+)\u3011$/) ||
			aInput.match(/^\u3014(.+)\u3015$/)
			) {
			aInput = RegExp.$1;
		}
		return aInput;
	},
 
	fixupSchemer : function(aURI) 
	{
		if (!this._table) {
			this._table = this.schemerFixupTable
						.replace(/(\s*[^:\s]+)\s*=>\s*([^:\s]+)(\s*([,\| \n\r\t]|$))/g, '$1:=>$2:$3');
			this._targets = this._table.replace(/\s*=>\s*[^,\| \n\r\t]+|\s*=>\s*[^,\| \n\r\t]+$/g, '')
						.replace(/([\(\)\+\.\{\}])/g, '\\$1')
						.replace(/\?/g, '.')
						.replace(/\*/g, '.+')
						.replace(/\s*[,\| \n\r\t]+\s*/g, '|');
			this._targetsRegExp = new RegExp('^('+this._targets+')');
		}

		var match = aURI.match(this._targetsRegExp);
		if (match) {
			var target = match[1];
			var table = this._table;
			eval((this._targets+'|')
					.replace(/([^|]+)\|/g,
						'if (/^$1$/.test("'+target+'")) table = table.replace(/\\b$1\\s*=>/, "'+target+'=>");'
				));
			match = table.match(new RegExp(
					'(?:[,\\| \\n\\r\\t]|^)'+
					target.replace(/([\(\)\+\?\.\{\}])/g, '\\$1')
						.replace(/\?/g, '.')
						.replace(/\*/g, '.+')+
					'\\s*=>\\s*([^,\\| \\n\\r\\t]+)'
				));
			if (match)
				aURI = aURI.replace(target, match[1]);
		}
		else if (!/^\w+:/.test(aURI)) {
			var schemer = this.schemerFixupDefault;
			if (schemer)
				aURI = schemer+'://'+aURI;
		}

		return aURI;
	},
	_table : null,
	_targets : null,
	_targetsRegExp : null,
 
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
   
// range operations 
	
	getSelectionURIRanges : function(aFrameOrEditable, aStrict) 
	{
		var ranges = [];

		var selection = this.getSelection(aFrameOrEditable);
		if (!selection || !selection.rangeCount) return ranges;

		var range;
		for (var i = 0, maxi = selection.rangeCount; i < maxi; i++)
		{
			range = selection.getRangeAt(i);
			ranges = ranges.concat(this.getURIRangesFromRange(range, aStrict));
			if (range.collapsed && ranges.length) break;
		}
		return ranges;
	},
	
	getURIRangesFromRange : function(aBaseRange, aStrict) 
	{
		var ranges = [];

		var findRange = this.getFindRange(aBaseRange);
		var mayBeURIs = this.matchURIRegExp(this.getTextContentFromRange(findRange));
		if (!mayBeURIs) {
			return ranges;
		}

		var terms = [];
		mayBeURIs.forEach(function(aTerm) {
			if (typeof aTerm != 'string') aTerm = aTerm[0];
			aTerm = aTerm.replace(/^\s+|\s+$/g, '');
			if (terms.indexOf(aTerm) < 0) {
				terms.push(aTerm);
			}
		});
		// 文字列長が長いものから先にサーチする（部分一致を除外するため）
		terms.sort(function(aA, aB) { return (aB.length - aA.length) || (aB - aA); });

		var editable = this.getEditableFromChild(findRange.startContainer);
		if (editable) {
			findRange.detach();
			findRange = editable.ownerDocument.createRange();
			findRange.selectNode(editable);
		}
		var baseURI = aBaseRange.startContainer.ownerDocument.defaultView.location.href;
		var foundURIs = {};

		var startPoint = findRange.cloneRange();
		startPoint.collapse(true);
		var endPoint = findRange.cloneRange();
		endPoint.collapse(false);
		var posRange;
		if (editable) {
			var root = editable.QueryInterface(Components.interfaces.nsIDOMNSEditableElement)
					.editor
					.rootElement;
			posRange = root.ownerDocument.createRange();
			posRange.selectNodeContents(root);
		}
		else {
			posRange = findRange.cloneRange()
		}

		var termRange, term, uri;
		for (let i in terms)
		{
			startPoint.setStart(findRange.startContainer, findRange.startOffset);
			term = terms[i];
			while (termRange = this.Find.Find(term, findRange, startPoint, endPoint))
			{
				if (this.containsRange(aBaseRange, termRange, aStrict)) {
					range = this.shrinkURIRange(termRange.cloneRange());
					uri = this.fixupURI(range.toString(), baseURI);
					if (uri && !(uri in foundURIs)) {
						// 既に見つかったより長いURI文字列の一部である場合は除外する。
						posRange.setEnd(range.startContainer, range.startOffset);
						let start = posRange.toString().length;
						let end   = start + term.length;
						if (!ranges.some(function(aRange) {
								return (aRange.start >= start && aRange.end <= end) ||
										(aRange.start <= start && aRange.end >= end);
							})) {
							foundURIs[uri] = true;
							ranges.push({
								range : range,
								uri   : uri,
								start : start,
								end   : end
							});
							break;
						}
					}
					range.detach();
				}
				startPoint.setStart(termRange.endContainer, termRange.endOffset);
			}
			if (termRange) termRange.detach();
			if (ranges.length && aBaseRange.collapsed) break;
		}

		ranges.sort(this.compareRangePosition);

		findRange.detach();
		posRange.detach();
		startPoint.detach();
		endPoint.detach();

		return ranges;
	},
	containsRange : function(aBase, aTarget, aStrict)
	{/* nsIDOMRangeのcompareBoundaryPointsを使うと、テキスト入力欄内のRangeの比較時に
	    NS_ERROR_DOM_WRONG_DOCUMENT_ERR例外が発生してしまうので、代わりに
	    nsIDOMNSRangeのcomparePointを使う */
		return 	aStrict ?
			(
				(aBase.comparePoint(aTarget.startContainer, aTarget.startOffset) == 0 &&
				 aBase.comparePoint(aTarget.endContainer, aTarget.endOffset) == 0) ||
				(aTarget.comparePoint(aBase.startContainer, aBase.startOffset) == 0 &&
				 aTarget.comparePoint(aBase.endContainer, aBase.endOffset) == 0)
			) :
			(
				aBase.comparePoint(aTarget.startContainer, aTarget.startOffset) == 0 ||
				aBase.comparePoint(aTarget.endContainer, aTarget.endOffset) == 0 ||
				aTarget.comparePoint(aBase.startContainer, aBase.startOffset) == 0 ||
				aTarget.comparePoint(aBase.endContainer, aBase.endOffset) == 0
			);
	},
	compareRangePosition : function(aBase, aTarget) 
	{
		var base = aBase.range;
		var target = aTarget.range;
		if (
			base.startContainer.ownerDocument != target.startContainer.ownerDocument
			)
			return 0;

		try {
			if (base.comparePoint(target.startContainer, target.startOffset) > 0)
				return -1;
			else if (base.comparePoint(target.endContainer, target.endOffset) < 0)
				return 1;
		}
		catch(e) {
		}
		return 0;
	},
 
	getFindRange : function(aBaseRange) 
	{
		var findRange = aBaseRange.cloneRange();

		if (this.getEditableFromChild(findRange.startContainer)) {
			var root = this.evaluateXPath(
					'ancestor-or-self::node()[parent::*['+this.kINPUT_FIELD_CONDITITON+']]',
					findRange.startContainer,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			// setStartBefore causes error...
			findRange.setStart(this.evaluateXPath(
					'preceding-sibling::node()[1]',
					root,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue || root, 0);
			findRange.setEndAfter(this.evaluateXPath(
					'(child::node()[last()] | following-sibling::node()[last()])[1]',
					root,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue || root);
			return findRange;
		}

		var count = 0;
		var max   = Math.ceil(Math.abs(this.findRangeSize)/2);
		var nodes, node, prevNode, offset;

		node   = aBaseRange.startContainer;
		offset = Math.max(aBaseRange.startOffset - max, 0);
		count  = aBaseRange.startOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this.evaluateXPath(
					'descendant-or-self::text()[not('+this.kIGNORE_TEXT_CONDITION+')][1]',
					node.childNodes.item(aBaseRange.startOffset) || node.firstChild,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			offset = 0;
			count  = 0;
		}
		nodes = this.evaluateXPath(
				'preceding::text()[not('+this.kIGNORE_TEXT_CONDITION+')]',
				node
			);
		for (let i = nodes.snapshotLength-1; i > -1; i--)
		{
			prevNode = node;
			node = nodes.snapshotItem(i);
			if (!node || count >= max) break;
			count += node.textContent.length;
			offset = count - max;
		}
		if (prevNode) {
			findRange.setStart(prevNode, Math.min(prevNode.textContent.length, Math.max(offset, 0)));
		}

		node   = aBaseRange.endContainer;
		offset = Math.min(aBaseRange.endOffset + max, node.textContent.length);
		count  = node.textContent.length - aBaseRange.endOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this.evaluateXPath(
					'descendant-or-self::text()[not('+this.kIGNORE_TEXT_CONDITION+')][last()]',
					node.childNodes.item(aBaseRange.endOffset) || node.lastChild,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
			offset = node ? node.textContent.length : 0 ;
			count  = 0;
		}
		nodes = this.evaluateXPath(
				'following::text()[not('+this.kIGNORE_TEXT_CONDITION+')]',
				node
			);
		for (let i = 0, maxi = nodes.snapshotLength; i < maxi; i++)
		{
			prevNode = node;
			node = nodes.snapshotItem(i);
			if (!node || count >= max) break;
			count += node.textContent.length;
			offset = node.textContent.length - (count - max);
		}
		if (prevNode) {
			findRange.setEnd(prevNode, Math.min(prevNode.textContent.length, Math.max(offset, 0)));
		}

		return findRange;
	},
  
	shrinkURIRange : function(aRange) 
	{
		var original = aRange.toString();
		var uri = this.sanitizeURIString(original);
		if (original != uri) {
			var startPoint = aRange.cloneRange();
			startPoint.collapse(true);
			var endPoint = aRange.cloneRange();
			endPoint.collapse(false);
			var newRange = this.Find.Find(uri, aRange, startPoint, endPoint);
			aRange.detach();
			startPoint.detach();
			endPoint.detach();
			aRange = newRange;
		}

		// 強制改行以降を切り落とす
		var nodes = this.evaluateXPath(
				'following::*[local-name()="br" or local-name()="BR"] | '+
				'descendant-or-self::*[local-name()="br" or local-name()="BR"]',
				aRange.startContainer
			);
		var br;
		/* nsIDOMRangeのcompareBoundaryPointsを使うと、テキスト入力欄内のRangeの比較時に
		   NS_ERROR_DOM_WRONG_DOCUMENT_ERR例外が発生してしまうので、代わりに
		   nsIDOMNSRangeのcomparePointを使う */
		for (var i = 0, maxi = nodes.snapshotLength; i < maxi; i++)
		{
			br = nodes.snapshotItem(i);
			if (aRange.comparePoint(br, 0) < 0) { // before
				continue;
			}
			else if (aRange.comparePoint(br, 0) > 0) { // after
				break;
			}
			aRange.setEndBefore(br);
			break;
		}

		return aRange;
	},
  
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;

			case 'popupshowing':
				this.buildTooltip(aEvent);
				return;

			case 'SubBrowserAdded':
				this.initBrowser(aEvent.originalTarget.browser);
				return;

			case 'SubBrowserRemoveRequest':
				this.destroyBrowser(aEvent.originalTarget.browser);
				return;
		}

		if (aEvent.originalTarget.ownerDocument == document ||
			aEvent.originalTarget.ownerDocument.designMode == 'on') {
			return;
		}
		for (var i in this.actions)
		{
			try {
				if (this.handleEventFor(aEvent, i)) return;
			}
			catch(e) {
			}
		}
	},
	
	handleEventFor : function(aEvent, aKey) 
	{
		var trigger;
		var node = this.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			(
				(
					aEvent.type == 'keypress' &&
					(trigger = this.actions[aKey].triggerKey.toLowerCase()) &&
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
					(trigger = this.actions[aKey].triggerMouse.toLowerCase()) &&
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
			this.openClickedURI(aEvent, this.actions[aKey].action);
			return true;
		}

		return false;
	},
 
	observe : function(aSubject, aTopic, aData) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.getPref(aData);
		switch (aData)
		{
			case 'textlink.schemer':
				this.schemer = value;
				return;

			case 'textlink.schemer.fixup.table':
				this.schemerFixupTable = value;
				return;

			case 'textlink.schemer.fixup.default':
				this.schemerFixupDefault = value;
				return;

			case 'textlink.find_click_point.strict':
				this.strict = value;
				return;

			case 'textlink.find_range_size':
				this.findRangeSize = value;
				return;

			case 'textlink.relative.enabled':
				this.shouldParseRelativePath = value;
				return;

			case 'textlink.multibyte.enabled':
				this.shouldParseMultibyteCharacters = value;
				return;

			case 'textlink.contextmenu.openTextLink.current':
				this.contextItemCurrent = value;
				return;

			case 'textlink.contextmenu.openTextLink.window':
				this.contextItemWindow = value;
				return;

			case 'textlink.contextmenu.openTextLink.tab':
				this.contextItemTab = value;
				return;

			case 'textlink.contextmenu.openTextLink.copy':
				this.contextItemCopy = value;
				return;
		}

		var match = aData.match(/^textlink\.actions\.(.+)\.(action|trigger\.key|trigger\.mouse)$/);
		if (!match) return;

		var key = match[1];
		if (!(key in this.actions)) {
			this.actions[key] = {
				action       : null,
				triggerKey   : null,
				triggerMouse : null
			};
		}

		switch (match[2])
		{
			case 'action'       : this.actions[key].action = value; break;
			case 'trigger.key'  : this.actions[key].triggerKey = value; break;
			case 'trigger.mouse': this.actions[key].triggerMouse = value; break;
		}
		if (this.actions[key].action === null) {
			delete this.actions[key];
		}
	},
	domain : 'textlink.',
 
	buildTooltip : function(aEvent) 
	{
		var box = this.tooltipBox;
		var item = document.tooltipNode;

		var range = document.createRange();
		range.selectNodeContents(box);
		range.deleteContents();

		var fragment = document.createDocumentFragment();
		(item.getAttribute('textlink-uris') || '').split('\n')
			.forEach(function(aURI) {
				var line = document.createElement('description');
				line.setAttribute('value', aURI);
				fragment.appendChild(line);
			});
		range.insertNode(fragment);
		range.detach();

		if (!box.hasChildNodes()) {
			aEvent.stopPropagation();
			aEvent.preventDefault();
		}
	},
  
	openClickedURI : function(aEvent, aAction) 
	{
		var target = this.evaluateXPath('ancestor-or-self::*[1]', aEvent.originalTarget, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;

		if (
			aAction == this.ACTION_DISABLED ||
			aEvent.button > 0 ||
			target.localName.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			return;

		var b = aEvent.currentTarget;
		if (!b) return;

		var frame = target.ownerDocument.defaultView;

		var ranges = this.getSelectionURIRanges(frame, this.strict);
		if (!ranges.length) return;

		var range = ranges[0];

		var selection = frame.getSelection();
		selection.removeAllRanges();
		selection.addRange(range.range);

		if (aAction & this.ACTION_SELECT) return;

		if (aAction & this.ACTION_COPY) {
			this.setClipBoard(range.uri);
			return;
		}

		var uri = range.uri;
		var referrer = (aAction & this.ACTION_STEALTH) ?
					null :
					this.makeURIFromSpec(frame.location.href) ;

		if (aAction & this.ACTION_OPEN_IN_CURRENT ||
			uri.match(/^mailto:/) ||
			b.localName != 'tabbrowser') {
			b.loadURI(uri, referrer);
		}
		else if (aAction & this.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', uri, null, referrer);
		}
		else {
			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(frame);
			}
			b.loadOneTab(uri, referrer, null, null, (aAction & this.ACTION_OPEN_IN_BACKGROUND_TAB));
		}
	},
 
	openTextLinkIn : function(aAction, aTarget) 
	{
		var frame = this.getCurrentFrame();
		var uris = this.getSelectionURIRanges(
				this.getEditableFromChild(aTarget) ||
				frame
			);
		if (!uris.length) return;

		var selection = null;
		if ('PlacesController' in window) {
			selection = frame.getSelection();
			selection.removeAllRanges();
		}
		uris = uris.map(function(aRange) {
				if (selection) {
					selection.addRange(aRange.range);
				}
				else {
					aRange.range.detach();
				}
				return aRange.uri;
			});

		if (aAction == this.ACTION_COPY) {
			if (uris.length > 1) uris.push('');
			this.setClipBoard(uris.join('\r\n'));
			return;
		}

		var selectTab;
		var tab;
		var b = this.browser;

		var current = b.selectedTab;

		if (aAction === void(0)) aAction = this.ACTION_OPEN_IN_CURRENT;

		if (
			uris.length > 1 &&
			(aAction == this.ACTION_OPEN_IN_TAB ||
			aAction == this.ACTION_OPEN_IN_BACKGROUND_TAB) &&
			(
				('BookmarksCommand' in window && '_confirmOpenTabs' in BookmarksCommand) ? // Firefox 2.0
					!BookmarksCommand._confirmOpenTabs(uris.length) :
				('PlacesController' in window) ? // Firefox 3
					!PlacesController.prototype._confirmOpenTabs(uris.length) :
					false
			)
			) {
			return;
		}

		for (var i in uris)
		{
			if (b.currentURI && b.currentURI.spec == 'about:blank') {
				if ('TreeStyleTabService' in window) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				b.loadURI(uris[i]);
				if (!selectTab) selectTab = b.selectedTab;
			}
			else {
				if (aAction == this.ACTION_OPEN_IN_WINDOW) {
					window.open(uris[i]);
				}
				else if (aAction == this.ACTION_OPEN_IN_TAB ||
					aAction == this.ACTION_OPEN_IN_BACKGROUND_TAB ||
					(aAction == this.ACTION_OPEN_IN_CURRENT && i > 0)) {
					if ('TreeStyleTabService' in window && !TreeStyleTabService.checkToOpenChildTab(b)) // Tree Style Tab
						TreeStyleTabService.readyToOpenChildTab(b, true);

					tab = b.addTab(uris[i]);

					if (!selectTab) selectTab = tab;
				}
				else if (aAction == this.ACTION_OPEN_IN_CURRENT) {
					b.loadURI(uris[i]);
					selectTab = b.selectedTab;
				}
			}
		}

		if ('TreeStyleTabService' in window) // Tree Style Tab
			TreeStyleTabService.stopToOpenChildTab(b);

		if (selectTab &&
			aAction != this.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}
	},
 
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.addPrefListener(this);
		this.initPrefs();

		if ('nsContextMenu' in window) {
			nsContextMenu.prototype.__textlink__initItems = nsContextMenu.prototype.initItems;
			nsContextMenu.prototype.initItems = this.initItems;
		}

		var appcontent = document.getElementById('appcontent');
		if (appcontent) {
			appcontent.addEventListener('SubBrowserAdded', this, false);
			appcontent.addEventListener('SubBrowserRemoveRequest', this, false);
		}

		this.initBrowser(gBrowser);
	},
	
	initPrefs : function() 
	{
		var prefs = <![CDATA[
			textlink.schemer
			textlink.schemer.fixup.table
			textlink.schemer.fixup.default
			textlink.find_click_point.strict
			textlink.find_range_size
			textlink.relative.enabled
			textlink.multibyte.enabled
			textlink.contextmenu.openTextLink.current
			textlink.contextmenu.openTextLink.window
			textlink.contextmenu.openTextLink.tab
			textlink.contextmenu.openTextLink.copy
		]]>.toString()
			.replace(/^\s+|\s+$/g, '')
			.split(/\s+/);

		prefs = prefs.concat(
				Components
					.classes['@mozilla.org/preferences;1']
					.getService(Components.interfaces.nsIPrefBranch)
					.getChildList('textlink.actions.', {})
			);

		prefs.sort().forEach(function(aPref) {
			this.observe(null, 'nsPref:changed', aPref);
		}, this);
	},
 
	initBrowser : function(aBrowser) 
	{
		aBrowser.addEventListener('dblclick', this, true);
		aBrowser.addEventListener('keypress', this, true);
	},
 
	// gContextMenu.initItems 
	initItems : function()
	{
		this.__textlink__initItems();

		var TLS = TextLinkService;

		var uris = (TLS.contextItemCurrent || TLS.contextItemWindow ||
					TLS.contextItemTab || TLS.contextItemCopy) ?
				TLS.getSelectionURIRanges(TLS.getEditableFromChild(document.popupNode))
					.map(function(aRange) {
						aRange.range.detach();
						return aRange.uri;
					}) :
				[] ;

		this.showItem('context-openTextLink-current',
			uris.length && TLS.contextItemCurrent);
		this.showItem('context-openTextLink-window',
			uris.length && TLS.contextItemWindow);
		this.showItem('context-openTextLink-tab',
			uris.length && TLS.contextItemTab);
		this.showItem('context-openTextLink-copy',
			uris.length && TLS.contextItemCopy);
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

			[
				'context-openTextLink-current',
				'context-openTextLink-window',
				'context-openTextLink-tab',
				'context-openTextLink-copy'
			].forEach(function(aID) {
				var item = this.setLabel(aID, attr, targets);
				if (item) {
					item.setAttribute('textlink-uris', uris.join('\n'));
				}
			}, TLS);
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

		return item;
	},
  
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.removePrefListener(this);

		var appcontent = document.getElementById('appcontent');
		if (appcontent) {
			appcontent.removeEventListener('SubBrowserAdded', this, false);
			appcontent.removeEventListener('SubBrowserRemoveRequest', this, false);
		}

		this.destroyBrowser(gBrowser);
	},
	
	destroyBrowser : function(aBrowser) 
	{
		aBrowser.removeEventListener('dblclick', this, true);
		aBrowser.removeEventListener('keypress', this, true);
	}
   
}; 

TextLinkService.__proto__ = window['piro.sakura.ne.jp'].prefs;
window.addEventListener('load', TextLinkService, false);
 
