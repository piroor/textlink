var TextLinkService = { 
	
	schemerFixupDefault : 'http', 
	strict              : true,
	contextItemCurrent  : true,
	contextItemWindow   : true,
	contextItemTab      : true,
	contextItemCopy     : true,

	acceptMultilineURI : false,
	canUseDocumentEncoder : true,

	get schemer()
	{
		return this._schemer;
	},
	set schemer(val)
	{
		this._schemer = val;

		this._schemers = this.schemer
			.replace(/([\(\)\+\.\{\}])/g, '\\$1')
			.replace(/\?/g, '.')
			.replace(/\*/g, '.+')
			.split(/[,\| \n\r\t]+/);

		this.invalidatePatterns();
		return val;
	},
	_schemer : '',
	get schemers()
	{
		return this._schemers.concat(this._fixupSchemers);
	},
	_schemers : [],
	_fixupSchemers : [],

	get schemerFixupTable()
	{
		return this._schemerFixupTable;
	},
	set schemerFixupTable(val)
	{
		this._schemerFixupTable = val;

		this._fixupTable = this._schemerFixupTable
					.replace(/(\s*[^:\s]+)\s*=>\s*([^:\s]+)(\s*([,\| \n\r\t]|$))/g, '$1:=>$2:$3');
		this._fixupTargets = this._fixupTable
					.replace(/\s*=>\s*[^,\| \n\r\t]+|\s*=>\s*[^,\| \n\r\t]+$/g, '')
					.replace(/([\(\)\+\.\{\}])/g, '\\$1')
					.replace(/\?/g, '.')
					.replace(/\*/g, '.+')
					.split(/\s*[,\| \n\r\t]+\s*/);
		this._fixupSchemers = this._fixupTargets
					.filter(function(aTarget) {
						return /:$/.test(aTarget);
					})
					.map(function(aTarget) {
						return aTarget.replace(/:$/, '');
					});
		this._fixupTargetsPattern = this._fixupTargets.join('|');
		this._fixupTargetsRegExp = new RegExp('^('+this._fixupTargetsPattern+')');

		this.invalidatePatterns();
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
		this.invalidatePatterns();
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
		this.invalidatePatterns();
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
	kIGNORE_NODE_CONDITION : 'contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " ")) or (contains(" a A ", concat(" ", local-name(), " ")) and @href) or @class="moz-txt-citetags"',
	kIGNORE_TEXT_CONDITION : 'ancestor-or-self::*[contains(" head HEAD style STYLE script SCRIPT iframe IFRAME object OBJECT embed EMBED input INPUT textarea TEXTAREA ", concat(" ", local-name(), " ")) or (contains(" a A ", concat(" ", local-name(), " ")) and @href) or @class="moz-txt-citetags"]',
 
// regexp 
	
	get kURIPattern() 
	{
		if (!this._kURIPattern) {
			this._kURIPattern = this.kURIPattern_base
				.replace(
					/%SCHEMER_PATTERN%/g,
					'('+this.schemers.join('|')+'):'
				)
				.replace(
					/%PART_PATTERN%/g,
					this.kURIPattern_part
				)
				.replace(
					/%DOMAIN_PATTERN%/g,
					this.kDomainPattern
				);
		}

		return this._kURIPattern;
	},
	_kURIPattern : null,
 
	get kURIPatternRelative() 
	{
		if (!this._kURIPatternRelative) {
			this._kURIPatternRelative = this.kURIPatternRelative_base
				.replace(
					/%PART_PATTERN%/g,
					this.kURIPattern_part
				);
		}

		return this._kURIPatternRelative;
	},
	_kURIPatternRelative : null,
 
	get kURIPatternMultibyte() 
	{
		if (!this._kURIPatternMultibyte) {
			this._kURIPatternMultibyte = this.kURIPatternMultibyte_base
				.replace(
					/%SCHEMER_PATTERN%/g,
					'('+
					this.schemers.map(function(aSchemer) {
						return aSchemer+'|'+this.convertHalfWidthToFullWidth(aSchemer);
					}, this).join('|')+
					')[:\uff1a]'
				)
				.replace(
					/%PART_PATTERN%/g,
					this.kURIPatternMultibyte_part
				)
				.replace(
					/%DOMAIN_PATTERN%/g,
					this.kDomainPattern
/*
					'[0-9a-z\\.-\uff10-\uff19\uff41-\uff5a\uff21-\uff3a\uff0e\uff0d]+[\\.\uff0e]('+
					this.topLevelDomains.join('|')+
					'|'+
					this.convertHalfWidthToFullWidth(this.topLevelDomains.join('|')).replace(/\uff5c/g, '|')+
					')'
*/
				);
		}

		return this._kURIPatternMultibyte;
	},
	_kURIPatternMultibyte : null,
 
	get kURIPatternMultibyteRelative() 
	{
		if (!this._kURIPatternMultibyteRelative) {
			this._kURIPatternMultibyteRelative = this.kURIPatternMultibyteRelative_base
				.replace(
					/%PART_PATTERN%/g,
					this.kURIPatternMultibyte_part
				);
		}

		return this._kURIPatternMultibyteRelative;
	},
	_kURIPatternMultibyteRelative : null,
 
	get kDomainPattern()
	{
		if (!this._kDomainPattern) {
			this._kDomainPattern = this.getPref('textlink.idn.enabled') ?
					this.kStringprepAllowedCharacterPattern+'+' :
					'[0-9a-z\\.-]+' ;
			this._kDomainPattern += '\\.('+this.topLevelDomains.join('|')+')\\b'
		}
		return this._kDomainPattern;
	},
	_kDomainPattern : null,

	kStringprepAllowedCharacterPattern : [
		'[^',
		// Forbidden characters in IDN are defined by RFC 3491.
		//   http://www.ietf.org/rfc/rfc3491.txt
		//   http://www5d.biglobe.ne.jp/~stssk/rfc/rfc3491j.html
		// and
		//   http://www.ietf.org/rfc/rfc3454.txt
		//   http://www.jdna.jp/survey/rfc/rfc3454j.html
		'\\u0080-\\u00A0\\u0340\\u0341\\u06DD\\u070F\\u1680\\u180E\\u2000-\\u200F\\u2028-\\u202F\\u205F-\\u2063\\u206A-\\u206F\\u2FF0-\\u2FFB\\u3000\\uD800-\\uF8FF\\uFDD0-\\uFDEF\\uFEFF\\uFFF9-\\uFFFF',
		// half-width space and full-width space
		// (they are allowed by the RFC but I ignore them,
		// because I cannot detect the range of the IRI if it includes spaces.)
		' \u3000\r\n\t',
		']'
	].join(''),
	kStringprepReplaceToNothingRegExp : /[\u00AD\u034F\u1806\u180B-\u180D\u200B-\u200D\u2060\uFE00-\uFE0F\uFEFF]/g,
 
	kURIPattern_base : '\\(?(%SCHEMER_PATTERN%(//)?%PART_PATTERN%|%DOMAIN_PATTERN%(/%PART_PATTERN%)?)', 
	kURIPatternRelative_base : '%PART_PATTERN%(\\.|/)%PART_PATTERN%',
 
	kURIPatternMultibyte_base : '[\\(\uff08]?(%SCHEMER_PATTERN%(//|\uff0f\uff0f)?%PART_PATTERN%|%DOMAIN_PATTERN%([/\uff0f]%PART_PATTERN%)?)', 
	kURIPatternMultibyteRelative_base : '%PART_PATTERN%(\\.|\uff0e|/|\uff0f)%PART_PATTERN%',
 
	kSchemerPattern : '[\\*\\+a-z0-9_]+:', 
	kSchemerPatternMultibyte : '[\\*\\+a-z0-9_\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff3f]+[:\uff1a]',
 
	get kURIPattern_part()
	{
		return this.getPref('textlink.idn.enabled') ?
				this.kStringprepAllowedCharacterPattern+'+' :
				'[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#]+' ;
	}, 
	get kURIPatternMultibyte_part()
	{
		return this.getPref('textlink.idn.enabled') ?
				this.kStringprepAllowedCharacterPattern+'+' :
				'[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#\u301c\uff0d\uff3f\uff0e\uff01\uff5e\uffe3\uff0a\u2019\uff08\uff09\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03]+' ;
	},
 
	// http://www4.plala.or.jp/nomrax/TLD/ 
	// http://ja.wikipedia.org/wiki/%E3%83%88%E3%83%83%E3%83%97%E3%83%AC%E3%83%99%E3%83%AB%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E4%B8%80%E8%A6%A7
	// http://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
	kTopLevelDomains : [
		// gTLD
		'aero',
		'arpa',
		'asia',
		'biz',
		'cat',
		'com',
		'coop',
		'edu',
		'gov',
		'info',
		'int',
		'jobs',
		'mil',
		'mobi',
		'museum',
		'name',
		'nato',
		'net',
		'org',
		'pro',
		'tel',
		'travel',

		// ccTLD
		'ac',
		'ad',
		'ae',
		'af',
		'ag',
		'ai',
		'al',
		'am',
		'an',
		'ao',
		'aq',
		'ar',
		'as',
		'at',
		'au',
		'aw',
		'ax',
		'az',
		'ba',
		'bb',
		'bd',
		'be',
		'bf',
		'bg',
		'bh',
		'bi',
		'bj',
		'bm',
		'bn',
		'bo',
		'br',
		'bs',
		'bt',
		'bv',
		'bw',
		'by',
		'bz',
		'ca',
		'cc',
		'cd',
		'cf',
		'cg',
		'ch',
		'ci',
		'ck',
		'cl',
		'cm',
		'cn',
		'co',
		'cr',
		'cs',
		'cu',
		'cv',
		'cx',
		'cy',
		'cz',
		'dd',
		'de',
		'dj',
		'dk',
		'dm',
		'do',
		'dz',
		'ec',
		'ee',
		'eg',
		'eh',
		'er',
		'es',
		'et',
		'eu',
		'fi',
		'fj',
		'fk',
		'fm',
		'fo',
		'fr',
		'ga',
		'gb',
		'gd',
		'ge',
		'gf',
		'gg',
		'gh',
		'gi',
		'gl',
		'gm',
		'gn',
		'gp',
		'gq',
		'gr',
		'gs',
		'gt',
		'gu',
		'gw',
		'gy',
		'hk',
		'hm',
		'hn',
		'hr',
		'ht',
		'hu',
		'id',
		'ie',
		'il',
		'im',
		'in',
		'io',
		'iq',
		'ir',
		'is',
		'it',
		'je',
		'jm',
		'jo',
		'jp',
		'ke',
		'kg',
		'kh',
		'ki',
		'km',
		'kn',
		'kp',
		'kr',
		'kw',
		'ky',
		'kz',
		'la',
		'lb',
		'lc',
		'li',
		'lk',
		'lr',
		'ls',
		'lt',
		'lu',
		'lv',
		'ly',
		'ma',
		'mc',
		'md',
		'me',
		'mg',
		'mh',
		'mk',
		'ml',
		'mm',
		'mn',
		'mo',
		'mp',
		'mq',
		'mr',
		'ms',
		'mt',
		'mu',
		'mv',
		'mw',
		'mx',
		'my',
		'mz',
		'na',
		'nc',
		'ne',
		'nf',
		'ng',
		'ni',
		'nl',
		'no',
		'np',
		'nr',
		'nu',
		'nz',
		'om',
		'pa',
		'pe',
		'pf',
		'pg',
		'ph',
		'pk',
		'pl',
		'pm',
		'pn',
		'pr',
		'ps',
		'pt',
		'pw',
		'py',
		'qa',
		're',
		'ro',
		'rs',
		'ru',
		'rw',
		'sa',
		'sb',
		'sc',
		'sd',
		'se',
		'sg',
		'sh',
		'si',
		'sj',
		'sk',
		'sl',
		'sm',
		'sn',
		'so',
		'sr',
		'st',
		'su',
		'sv',
		'sy',
		'sz',
		'tc',
		'td',
		'tf',
		'tg',
		'th',
		'tj',
		'tk',
		'tl',
		'tm',
		'tn',
		'to',
		'tp',
		'tr',
		'tt',
		'tv',
		'tw',
		'tz',
		'ua',
		'ug',
		'uk',
		'um',
		'us',
		'uy',
		'uz',
		'va',
		'vc',
		've',
		'vg',
		'vi',
		'vn',
		'vu',
		'wf',
		'ws',
		'ye',
		'yt',
		'yu',
		'za',
		'zm',
		'zr',
		'zw'
	],
	kIDNTopLevelDomains : [
		'\u4e2d\u56fd',
		'\u4e2d\u570b',
		'\u0645\u0635\u0631',
		'\u9999\u6e2f',
		'\u0627\u06cc\u0631\u0627\u0646',
		'\u0627\u0644\u0627\u0631\u062f\u0646',
		'\u0641\u0644\u0633\u0637\u064a\u0646',
		'\u0440\u0444',
		'\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629',
		'\u0dbd\u0d82\u0d9a\u0dcf',
		'\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8',
		'\u53f0\u6e7e',
		'\u53f0\u7063',
		'\u0e44\u0e17\u0e22',
		'\u062a\u0648\u0646\u0633',
		'\u0627\u0645\u0627\u0631\u0627\u062a'
	],
	get topLevelDomains()
	{
		return this.getPref('textlink.idn.enabled') ?
				this.kTopLevelDomains.concat(this.kIDNTopLevelDomains) :
				this.kTopLevelDomains ;
	},
  
	invalidatePatterns : function()
	{
		this._schemerRegExp = null;

		this._kDomainPattern = null;
		this._topLevelDomainsRegExp = null;

		this._kURIPattern = null;
		this._kURIPatternMultibyte = null;

		this._URIMatchingRegExp = null;
		this._URIMatchingRegExp_fromHead = null;
		this._URIPartRegExp_start = null;
		this._URIPartRegExp_end = null;
	},
 
	get URIExceptionPattern() 
	{
		this._updateURIExceptionPattern();
		return this._URIExceptionPattern;
	},
	get URIExceptionPattern_start()
	{
		this._updateURIExceptionPattern();
		return this._URIExceptionPattern_start;
	},
	get URIExceptionPattern_end()
	{
		this._updateURIExceptionPattern();
		return this._URIExceptionPattern_end;
	},
	_updateURIExceptionPattern : function()
	{
		if (this._URIExceptionPattern) return;
		var regexp = this.getPref('textlink.part.exception');
		try {
			this._URIExceptionPattern = new RegExp('^('+regexp+')$', 'i');
			this._URIExceptionPattern_start = new RegExp('^('+regexp+')', 'i');
			this._URIExceptionPattern_end = new RegExp('('+regexp+')$', 'i');
		}
		catch(e) {
			this._URIExceptionPattern = /[^\w\W]/;
			this._URIExceptionPattern_start = /[^\w\W]/;
			this._URIExceptionPattern_end = /[^\w\W]/;
		}
	},
	_URIExceptionPattern : null,
	_URIExceptionPattern_start : null,
	_URIExceptionPattern_end : null,
 
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
 
	get tooltip() 
	{
		return document.getElementById('textLinkTooltip-selectedURI');
	},
	get tooltipBox()
	{
		return document.getElementById('textLinkTooltip-selectedURI-box');
	},
 
	get popupNode() 
	{
		var popup = document.getElementById('contentAreaContextMenu') || // Firefox
					document.getElementById('messagePaneContext'); // Thunderbird
		return popup && popup.triggerNode || document.popupNode ;
	},
 
	get bundle() { 
		if (!this._bundle) {
			this._bundle = document.getElementById('textlink-bundle');
		}
		return this._bundle;
	},
	_bundle : null,
 
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
		var encoder = this._textEncoder;
		if (encoder && this.canUseDocumentEncoder) { // Firefox 3 or later
			var result = this._getTextContentFromRange(aRange, true);
			if (result) {
				return result;
			}
		}
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
				result.push(this._getTextContentFromRange(range));

				if (node.localName.toLowerCase() == 'br') {
					result.push('\n');
				}

				range.selectNode(node);
				range.collapse(false);
			}
			range.setEnd(aRange.endContainer, aRange.endOffset);
			result.push(this._getTextContentFromRange(range, true));
			range.detach();
			return result.join('');
		}
		catch(e) {
		}
		// fallback
		return aRange.toString();
	},
	_getTextContentFromRange : function(aRange, aFinal)
	{
		var encoder = this._textEncoder;
		if (encoder) {
			try {
				encoder.init(
					aRange.startContainer.ownerDocument,
					'text/plain',
					encoder.OutputBodyOnly | encoder.OutputLFLineBreak
				);
				encoder.setRange(aRange);
				var result = encoder.encodeToString();
				if (aFinal) {
					encoder.init(
						document,
						'text/plain',
						encoder.OutputBodyOnly
					);
					encoder.setRange(null);
				}
				return result;
			}
			catch(e) {
			}
		}
		return aRange.toString();
	},
	get _textEncoder()
	{
		if (this.__textEncoder === void(0)) {
			try {
				this.__textEncoder = Components.classes['@mozilla.org/layout/documentEncoder;1?type=text/plain']
										.createInstance(Components.interfaces.nsIDocumentEncoder);
			}
			catch(e) {
				this.__textEncoder = null;
			}
		}
		return this.__textEncoder;
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
 
	evalInSandbox : function(aCode, aOwner) 
	{
		try {
			var sandbox = new Components.utils.Sandbox(aOwner || 'about:blank');
			return Components.utils.evalInSandbox(aCode, sandbox);
		}
		catch(e) {
		}
		return void(0);
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
		this._updateURIRegExp();
		return aString.match(this._URIMatchingRegExp);
	},
	isHeadOfNewURI : function(aString)
	{
		this._updateURIRegExp();
		var match = aString.match(this._URIMatchingRegExp_fromHead);
		match = match ? match[1] : '' ;
		return this.hasLoadableSchemer(match) ? match == aString : false ;
	},
	_URIMatchingRegExp : null,
	_URIMatchingRegExp_fromHead : null,
	_updateURIRegExp : function()
	{
		if (this._URIMatchingRegExp) return;
		var regexp = [];
		if (this.shouldParseMultibyteCharacters) {
			this._URIMatchingRegExp_fromHead = new RegExp(this.kURIPatternMultibyte, 'i');
			regexp.push(this.kURIPatternMultibyte);
			if (this.shouldParseRelativePath) regexp.push(this.kURIPatternMultibyteRelative);
		}
		else {
			this._URIMatchingRegExp_fromHead = new RegExp(this.kURIPattern, 'i');
			regexp.push(this.kURIPattern);
			if (this.shouldParseRelativePath) regexp.push(this.kURIPatternRelative);
		}
		this._URIMatchingRegExp = new RegExp(regexp.join('|'), 'ig');
	},
 
	getURIPartFromStart : function(aString, aExcludeURIHead) 
	{
		this._updateURIPartRegExp();
		var match = aString.match(this._URIPartRegExp_start);
		var part = match ? match[1] : '' ;
		return (!aExcludeURIHead || !this.isHeadOfNewURI(part)) ? part : '' ;
	},
	getURIPartFromEnd : function(aString)
	{
		this._updateURIPartRegExp();
		var match = aString.match(this._URIPartRegExp_end);
		return match ? match[1] : '' ;
	},
	_URIPartRegExp_start : null,
	_URIPartRegExp_end : null,
	_updateURIPartRegExp : function()
	{
		if (this._URIPartRegExp_start && this._URIPartRegExp_end)
			return;

		var base = this.shouldParseMultibyteCharacters ?
				this.kURIPatternMultibyte_part :
				this.kURIPattern_part ;
		this._URIPartRegExp_start = new RegExp('^('+base+')', 'i');
		this._URIPartRegExp_end   = new RegExp('('+base+')$', 'i');
	},
 
	hasLoadableSchemer : function(aURI) 
	{
		if (!this._schemerRegExp) {
			var schemers = this.schemers;
			var colon = ':';
			if (this.shouldParseMultibyteCharacters) {
				schemers = schemers.map(function(aSchemer) {
						return aSchemer+'|'+this.convertHalfWidthToFullWidth(aSchemer);
					}, this);
				colon = '[:\uff1a]';
			}
			this._schemerRegExp = new RegExp('^('+this.schemers.join('|')+')'+colon, 'i');
		}
		return this._schemerRegExp.test(aURI);
	},
	_schemerRegExp : null,
 
	hasSchemer : function(aInput) 
	{
		return this._firstSchemerRegExp.test(aInput);
	},
	removeSchemer : function(aInput)
	{
		return aInput.replace(this._firstSchemerRegExp, '');
	},
	get _firstSchemerRegExp()
	{
		if (!this.__firstSchemerRegExp) {
			this.__firstSchemerRegExp = new RegExp('^'+this.kSchemerPatternMultibyte, 'i');
		}
		return this.__firstSchemerRegExp;
	},
	__firstSchemerRegExp : null,
 
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

		return this.hasLoadableSchemer(aURIComponent) ? aURIComponent : null ;
	},
	
	sanitizeURIString : function(aURIComponent) 
	{
		// escape patterns like program codes like JavaScript etc.
		if (!this._topLevelDomainsRegExp) {
			this._topLevelDomainsRegExp = new RegExp('^(' + this.topLevelDomains.join('|') + ')$');
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

		if (this.getPref('textlink.idn.enabled'))
			aURIComponent = aURIComponent.replace(this.kStringprepReplaceToNothingRegExp, '');

		return aURIComponent; // aURIComponent.replace(/^.*\((.+)\).*$/, '$1');
	},
	_topLevelDomainsRegExp : null,
 
	removeParen : function(aInput) 
	{
		var doRemoveParen = function(aRegExp) {
				let match = aInput.match(aRegExp);
				if (!match) return false;
				aInput = match[1];
				return true;
			};
		while (this._parenPatterns.some(doRemoveParen)) {}
		return aInput;
	},
	_parenPatterns : [
		/^["\u201d\u201c\u301d\u301f](.+)["\u201d\u201c\u301d\u301f]$/,
		/^[`'\u2019\u2018](.+)[`'\u2019\u2018]$/,
		/^[(\uff08](.+)[)\uff09]$/,
		/^[{\uff5b](.+)[}\uff5d]$/,
		/^[\[\uff3b](.+)[\]\uff3d]$/,
		/^[<\uff1c](.+)[>\uff1e]$/,
		/^[\uff62\u300c](.+)[\uff63\u300d]$/,
		/^\u226a(.+)\u226b$/,
		/^\u3008(.+)\u3009$/,
		/^\u300a(.+)\u300b$/,
		/^\u300e(.+)\u300f$/,
		/^\u3010(.+)\u3011$/,
		/^\u3014(.+)\u3015$/,
		/^(.+)["\u201d\u201c\u301d\u301f][^"\u201d\u201c\u301d\u301f]*$/,
		/^(.+)[`'\u2019\u2018][^`'\u2019\u2018]*$/,
		/^(.+)[(\uff08][^)\uff09]*$/,
		/^(.+)[{\uff5b][^}\uff5d]*$/,
		/^(.+)[\[\uff3b][^\]\uff3d]*$/,
		/^(.+)[<\uff1c][^>\uff1e]*$/,
		/^(.+)[\uff62\u300c][^\uff63\u300d]*$/,
		/^(.+)\u226a[^\u226b$]*/,
		/^(.+)\u3008[^\u3009$]*/,
		/^(.+)\u300a[^\u300b$]*/,
		/^(.+)\u300e[^\u300f$]*/,
		/^(.+)\u3010[^\u3011$]*/,
		/^(.+)\u3014[^\u3015$]*/
	],
 
	fixupSchemer : function(aURI) 
	{
		var match = aURI.match(this._fixupTargetsRegExp);
		if (match) {
			var target = match[1];
			var table = this.evalInSandbox('(function() {'+
					'var table = '+this._fixupTable.quote()+';'+
					'var target = '+target.quote()+';'+
					((this._fixupTargetsPattern+'|')
						.replace(
							/([^|]+)\|/g,
							<![CDATA[
								if (/^$1$/.test(target))
									table = table.replace(/\b$1\s*=>/, target+"=>");
							]]>
						))+
					'return table;'+
				'})()');
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
		else if (!this._firstSchemerRegExp.test(aURI)) {
			var schemer = this.schemerFixupDefault;
			if (schemer)
				aURI = schemer+'://'+aURI;
		}

		return aURI;
	},
	_fixupTable : null,
	_fixupTargets : null,
	_fixupTargetsPattern : null,
	_fixupTargetsRegExp : null,
 
	// 相対パスの解決 
	makeURIComplete : function(aURI, aSourceURI)
	{
		if (aURI.match(/^(urn|mailto):/i)) return aURI;

		if (aURI.match(/^([^\/\.]+\.)+([^\/\.]+)/) &&
			RegExp.$2.match(new RegExp(['^(', this.topLevelDomains.join('|'), ')$'].join('')))) {
			var fixedURI = this.URIFixup.createFixupURI(aURI || 'about:blank', this.URIFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);
			return fixedURI.spec;
		}

		var baseURI = this.IOService.newURI(aSourceURI, null, null);
		return this.IOService.newURI(aURI, null, baseURI).spec;
	},
   
// range operations 
	FIND_ALL    : 1,
	FIND_FIRST  : 2,
	FIND_LAST   : 4,
	ALLOW_SAME_URIS : 8,

	FIND_SINGLE : 6,

	ERRROR_FIND_MODE_NOT_SPECIFIED : new Error('you must specify find mode'),
	ERRROR_NO_URI_RANGE : new Error('there is no range maybe URI'),
	
	getURIRangesIterator : function(aFrameOrEditable, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode) aMode = this.FIND_ALL;

		var ranges = [];
		var selection = this.getSelection(aFrameOrEditable);
		if (!selection || !selection.rangeCount)
			throw ERRROR_NO_URI_RANGE;

		var count, end, step;
		if (aMode & this.FIND_LAST) {
			count = selection.rangeCount-1;
			end   = -1;
			step  = -1;
		}
		else {
			count = 0;
			end   = selection.rangeCount;
			step  = 1;
		}
		for (; count != end; count += step)
		{
			let range = selection.getRangeAt(parseInt(count));
			try {
				let iterator = this.getURIRangesIteratorFromRange(range, aMode, aStrict, aExceptionsHash);
				while(true)
				{
					let foundRange = iterator.next();
					yield foundRange;
					ranges.push(foundRange);
				}
			}
			catch(e) {
			}
			if (
				ranges.length &&
				(range.collapsed || aMode & this.FIND_SINGLE)
				) {
				break;
			}
		}
	},
 
	getURIRangesIteratorFromRange : function(aBaseRange, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode) throw this.ERRROR_FIND_MODE_NOT_SPECIFIED;
		var ranges = [];

		var findRange = this.getFindRange(aBaseRange);
		var terms = this._getFindTermsFromRange(findRange, aMode);
		if (!terms.length)
			throw this.ERRROR_NO_URI_RANGE;

		var baseURI = aBaseRange.startContainer.ownerDocument.defaultView.location.href;
		var findOnlyFirst = aBaseRange.collapsed || aMode & this.FIND_SINGLE;

		var foundURIsHash = {};
		if (aExceptionsHash) {
			for (var i in aExceptionsHash)
			{
				foundURIsHash[i] = true;
			}
		}

		var rangeSet = this._getRangeSetFromRange(aBaseRange, findRange, aMode);
		var shouldReturnSingleResult = !(aMode & this.ALLOW_SAME_URIS);

		this.Find.findBackwards = (aMode & this.FIND_LAST);
		for (let i in terms)
		{
			let rangesForTerm = this._findRangesForTerm(
					terms[i],
					rangeSet,
					baseURI,
					aStrict,
					ranges,
					foundURIsHash,
					aMode
				);
			if (!rangesForTerm.length) continue;

			ranges = ranges.concat(rangesForTerm);
			if (shouldReturnSingleResult) {
				rangesForTerm.forEach(function(aRange) {
					foundURIsHash[aRange.uri] = true;
				});
			}
			for (let i in rangesForTerm)
			{
				yield rangesForTerm[i];
			}

			if (ranges.length && findOnlyFirst) break;
		}

		this._destroyRangeSet(rangeSet);
	},
	_getFindTermsFromRange : function(aRange, aMode)
	{
		var terms = [];
		var mayBeURIs = this.matchURIRegExp(this.getTextContentFromRange(aRange));
		if (!mayBeURIs) {
			return terms;
		}
		if (aMode & this.FIND_LAST) {
			mayBeURIs = Array.slice(mayBeURIs).reverse();
		}
		mayBeURIs.forEach(function(aTerm) {
			if (typeof aTerm != 'string') aTerm = aTerm[0];
			aTerm = aTerm.replace(/^\s+|\s+$/g, '');
			aTerm = this.sanitizeURIString(aTerm);
			if (!aTerm || terms.indexOf(aTerm) > -1) return;

			let hadlWidthTerm = this.convertFullWidthToHalfWidth(aTerm);
			if (!this.shouldParseRelativePath && this.hasSchemer(aTerm)) {
				let termForCheck = hadlWidthTerm;
				while (this.hasSchemer(termForCheck))
				{
					if (this.hasLoadableSchemer(termForCheck)) break;
					termForCheck = this.removeSchemer(termForCheck);
					aTerm = this.removeSchemer(aTerm);
				}
				if (!this.hasLoadableSchemer(termForCheck)) return;
			}
			else if (this.URIExceptionPattern.test(hadlWidthTerm)) {
				return;
			}

			if (terms.indexOf(aTerm) < 0) terms.push(aTerm);
		}, this);
		if (aMode & this.FIND_ALL) {
			// 文字列長が長いものから先にサーチするために並べ替える（部分一致を除外するため）
			terms.sort(function(aA, aB) { return (aB.length - aA.length) || (aB - aA); });
		}
		return terms;
	},
	_getRangeSetFromRange : function(aBaseRange, aFindRange, aMode)
	{
		var findRange = aFindRange || this.getFindRange(aBaseRange);

		var editable = this.getEditableFromChild(findRange.startContainer);
		if (editable) {
			findRange.detach();
			findRange = editable.ownerDocument.createRange();
			findRange.selectNode(editable);
		}

		var startPoint = findRange.cloneRange();
		startPoint.collapse(!(aMode & this.FIND_LAST));
		var endPoint = findRange.cloneRange();
		endPoint.collapse(aMode & this.FIND_LAST);

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

		return {
				findRange  : findRange,
				startPoint : startPoint,
				endPoint   : endPoint,
				base       : aBaseRange,
				position   : posRange
			};
	},
	_destroyRangeSet : function(aRangeSet)
	{
		aRangeSet.findRange.detach();
		aRangeSet.startPoint.detach();
		aRangeSet.endPoint.detach();
		aRangeSet.position.detach();
		delete aRangeSet.findRange;
		delete aRangeSet.startPoint;
		delete aRangeSet.endPoint;
		delete aRangeSet.position;
		delete aRangeSet.base;
	},
	_findRangesForTerm : function(aTerm, aRangeSet, aBaseURI, aStrict, aRanges, aFoundURIsHash, aMode)
	{
		if (!aFoundURIsHash) aFoundURIsHash = {};
		if (!aRanges) aRanges = [];
		if (this.Find.findBackwards) {
			aRangeSet.startPoint.setStart(aRangeSet.findRange.endContainer, aRangeSet.findRange.endOffset);
		}
		else {
			aRangeSet.startPoint.setStart(aRangeSet.findRange.startContainer, aRangeSet.findRange.startOffset);
		}
		aRangeSet.startPoint.collapse(true);
		var termRange;
		var uriRanges = [];
		var uriRange = null;
		var shouldReturnSingleResult = !(aMode & this.ALLOW_SAME_URIS);
		FIND_URI_RANGE:
		while (termRange = this.Find.Find(aTerm, aRangeSet.findRange, aRangeSet.startPoint, aRangeSet.endPoint))
		{
			let range = this.shrinkURIRange(termRange.cloneRange());
			let uri = this.fixupURI(range.toString(), aBaseURI);
			let ranges = this.getFollowingURIPartRanges(range);
			if (ranges.length) {
				ranges.forEach(function(aRange) {
					uri += this.convertFullWidthToHalfWidth(aRange.toString());
				}, this);
			}
			ranges.unshift(range);

			if (
				ranges.some(function(aRange) {
					return this._containsRange(aRangeSet.base, aRange, aStrict)
				}, this) &&
				uri &&
				!(uri in aFoundURIsHash)
				) {
				for (let i = 0, maxi = ranges.length; i < maxi; i++)
				{
					// 既に見つかったより長いURI文字列の一部である場合は除外する。
					let range = ranges[i];
					aRangeSet.position.setEnd(range.startContainer, range.startOffset);
					let start = aRangeSet.position.toString().length;
					uriRange = {
						range  : range,
						uri    : uri,
						start  : start,
						end    : start + aTerm.length,
						base   : aRangeSet.base
					};

					if (aRanges.some(this._checkRangeFound, uriRange))
						continue;

					uriRanges.push(uriRange);
					if (shouldReturnSingleResult) {
						break FIND_URI_RANGE;
					}
				}
			}

			if (shouldReturnSingleResult) {
				ranges.forEach(function(aRange) {
					aRange.detach();
				});
			}

			if (this.Find.findBackwards) {
				aRangeSet.startPoint.setEnd(termRange.startContainer, termRange.startOffset);
			}
			else {
				aRangeSet.startPoint.setEnd(termRange.endContainer, termRange.endOffset);
			}
			aRangeSet.startPoint.collapse(false);
		}
		if (termRange) termRange.detach();
		return uriRanges;
	},
	_containsRange : function(aBase, aTarget, aStrict)
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
	_checkRangeFound : function(aRange)
	{
		return (aRange.start >= this.start && aRange.end <= this.end) ||
				(aRange.start <= this.start && aRange.end >= this.end);
	},
	_compareRangePosition : function(aA, aB)
	{
		return (aA.base == aB.base) ? (aA.start - aB.start) :
				(aA.base.comparePoint(aB.base.startContainer, aB.base.startOffset) < 0) ? 1 : -1 ;
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

		var expandToBefore = aBaseRange.collapsed;
		var expandToAfter  = aBaseRange.collapsed;
		if (!aBaseRange.collapsed) {
			var string = aBaseRange.toString();
			expandToBefore = this.getURIPartFromStart(string);
			expandToAfter  = this.getURIPartFromEnd(string);
		}
		if (expandToBefore)
			this._expandURIRangeToBefore(findRange);
		if (expandToAfter)
			this._expandURIRangeToAfter(findRange);

		return findRange;
	},
	_expandURIRangeToBefore : function(aRange)
	{
		var expandRange = aRange.cloneRange();
		expandRange.selectNode(aRange.startContainer);
		expandRange.setEnd(aRange.startContainer, aRange.startOffset);

		var node   = aRange.startContainer;
		var offset = aRange.startOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this._getFirstTextNodeFromRange(aRange);
			offset = 0;
		}
		var baseBlock = this._getParentBlock(node);
		var nodes = this.evaluateXPath(
				'preceding::text()[not('+this.kIGNORE_TEXT_CONDITION+')]',
				node
			);
		var i = nodes.snapshotLength-1,
			lastNode;
		while (true)
		{
			lastNode = node;
			if (this._getParentBlock(lastNode) != baseBlock) break;
			try{ // Firefox 2 sometimes fails...
				expandRange.setStart(lastNode, 0);
				let string = expandRange.toString();
				let part = this.getURIPartFromEnd(string);
				if (!part.length) break;
				if (
					part.length < string.length ||
					(part.length == string.length && i == -1)
					) {
					offset = (expandRange.startContainer == aRange.startContainer ? string : expandRange.startContainer.textContent ).length - part.length;
					break;
				}
				if (i == -1) break;
			}
			catch(e){
			}
			node = nodes.snapshotItem(i--);
			if (!node) break;
			offset = node.textContent.length;
			expandRange.selectNode(node);
		}
		if (
			lastNode &&
			(lastNode != aRange.startContainer || offset != aRange.startOffset)
			) {
			aRange.setStart(lastNode, offset);
		}

		expandRange.detach();
	},
	_expandURIRangeToAfter : function(aRange, aRanges)
	{
		var expandRange = aRange.cloneRange();
		expandRange.selectNode(aRange.endContainer);
		expandRange.setStart(aRange.endContainer, aRange.endOffset);

		var node   = aRange.endContainer;
		var offset = aRange.endOffset;
		if (node.nodeType == Node.ELEMENT_NODE) {
			node = this._getLastTextNodeFromRange(aRange);
			offset = node ? node.textContent.length : 0 ;
		}
		var baseBlock = this._getParentBlock(node);
		var nodes = this.evaluateXPath(
				'following::text()[not('+this.kIGNORE_TEXT_CONDITION+')]',
				node
			);
		var i = 0,
			maxi = nodes.snapshotLength,
			headPartIsFound = aRanges && this.isHeadOfNewURI(aRange.toString()),
			lastNode;
		while (true)
		{
			lastNode = node;
			if (this._getParentBlock(lastNode) != baseBlock) break;
			try{ // Firefox 2 sometimes fails...
				expandRange.setEnd(lastNode, lastNode.textContent.length);
				let string = expandRange.toString();
				let delta = 0;
				if (this.acceptMultilineURI) {
					// 勝手に最適化？されて、Rangeの開始位置がずれてしまうことがあるので、
					// 強制的にRangeの開始位置を元に戻す
					if (expandRange.startContainer.nodeType == Node.ELEMENT_NODE) {
						expandRange.setStart(this._getFirstTextNodeFromRange(expandRange), 0);
					}

					let originalString = string;
					string = string.replace(/^[\n\r]+|[\n\r]+$/g, '');
					delta = originalString.indexOf(string);

					originalString = string;
					string = string.replace(this.URIExceptionPattern_start, '');
					if (originalString.indexOf(string) != 0) {
						string = '';
						delta = 0;
					}
				}
				if (!this.acceptMultilineURI || string) {
					let part = this.getURIPartFromStart(string, headPartIsFound);
					if (!part.length) break;
					let partRange;
					if (aRanges) {
						if (!headPartIsFound && this.isHeadOfNewURI(part)) headPartIsFound = true;
						partRange = expandRange.cloneRange();
						aRanges.push(partRange);
						partRange.setStart(lastNode, partRange.startOffset + delta);
						partRange.setEnd(lastNode, partRange.startOffset + part.length);
					}
					if (
						part.length < string.length ||
						(part.length == string.length && i == maxi)
						) {
						offset = expandRange.startOffset + part.length + delta;
						if (aRanges) {
							partRange.setEnd(lastNode, offset);
						}
						break;
					}
				}
				if (i == maxi) break;

			}
			catch(e) {
			}
			node = nodes.snapshotItem(i++);
			if (!node) break;
			offset = 0;
			expandRange.selectNode(node);
		}
		if (
			!aRanges &&
			lastNode &&
			(lastNode != aRange.endContainer || offset != aRange.endOffset)
			) {
			aRange.setEnd(lastNode, offset);
		}

		expandRange.detach();
	},
	_getFirstTextNodeFromRange : function(aRange)
	{
		return this.evaluateXPath(
				'descendant-or-self::text()[not('+this.kIGNORE_TEXT_CONDITION+')][1]',
				aRange.startContainer.childNodes.item(aRange.startOffset) || aRange.startContainer.firstChild,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
	_getLastTextNodeFromRange : function(aRange)
	{
		return this.evaluateXPath(
				'descendant-or-self::text()[not('+this.kIGNORE_TEXT_CONDITION+')][last()]',
				aRange.endContainer.childNodes.item(aRange.endOffset) || aRange.endContainer.lastChild,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
	_getParentBlock : function(aNode)
	{
		if (!aNode) return null;
		var win = aNode.ownerDocument.defaultView;
		if (aNode.nodeType != Node.ELEMENT_NODE) aNode = aNode.parentNode;
		while (aNode)
		{
			let display = win.getComputedStyle(aNode, null).getPropertyValue('display');
			if (display != 'inline') break;
			aNode = aNode.parentNode;
		}
		return aNode;
	},
  
	getSelectionURIRanges : function(aFrameOrEditable, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode) aMode = this.FIND_ALL;

		var ranges = [];
		try {
			var iterator = this.getURIRangesIterator(aFrameOrEditable, aMode, aStrict, aExceptionsHash);
			while(true)
			{
				ranges.push(iterator.next());
			}
		}
		catch(e) {
		}

		if (aMode & this.FIND_ALL) {
			ranges.sort(this._compareRangePosition);
		}

		return ranges;
	},
	
	getFirstSelectionURIRange : function(aFrameOrEditable, aStrict, aExceptionsHash) 
	{
		var ranges = this.getSelectionURIRanges(aFrameOrEditable, this.FIND_FIRST, aStrict, aExceptionsHash);
		return ranges.length ? ranges[0] : null ;
	},
 
	getLastSelectionURIRange : function(aFrameOrEditable, aStrict, aExceptionsHash) 
	{
		var ranges = this.getSelectionURIRanges(aFrameOrEditable, this.FIND_LAST, aStrict, aExceptionsHash);
		return ranges.length ? ranges[0] : null ;
	},
 
	getURIRangesFromRange : function(aBaseRange, aMode, aStrict, aExceptionsHash) 
	{
		if (!aMode) aMode = this.FIND_ALL;
		var ranges = [];

		try {
			var iterator = this.getURIRangesIteratorFromRange(aBaseRange, aMode, aStrict, aExceptionsHash);
			while(true)
			{
				ranges.push(iterator.next());
			}
		}
		catch(e if e instanceof StopIteration) {
		}
		catch(e if e == this.ERRROR_NO_URI_RANGE) {
			return ranges;
		}

		if (aMode & this.FIND_ALL) {
			ranges.sort(this._compareRangePosition);
		}

		return ranges;
	},
  
	shrinkURIRange : function(aRange) 
	{
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
 
	getFollowingURIPartRanges : function(aRange) 
	{
		var ranges = [];
		if (this.acceptMultilineURI) {
			this._expandURIRangeToAfter(aRange, ranges);
		}
		return ranges;
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

			case 'popuphiding':
				this.destroyTooltip();
				this.stopProgressiveBuildTooltip();
				return;

			case 'SubBrowserAdded':
				this.initBrowser(aEvent.originalTarget.browser);
				return;

			case 'SubBrowserRemoveRequest':
				this.destroyBrowser(aEvent.originalTarget.browser);
				return;

			case 'keypress':
				if (aEvent.keyCode != aEvent.DOM_VK_ENTER &&
					aEvent.keyCode != aEvent.DOM_VK_RETURN)
					return;
				break;

			case 'UIOperationHistoryPreUndo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onPreUndoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;

			case 'UIOperationHistoryUndo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onUndoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;

			case 'UIOperationHistoryRedo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onRedoOpenTextLinkInTabs(aEvent);
						return;
				}

			case 'UIOperationHistoryRedo:TabbarOperations':
				switch (aEvent.entry.name)
				{
					case 'textlink-openTabs':
						this.onPostRedoOpenTextLinkInTabs(aEvent);
						return;
				}
				break;
		}

		this.handleUserActionEvent(aEvent);
	},
	
	handleUserActionEvent : function(aEvent) 
	{
		this.getActionsForEvent(aEvent).some(function(aAction) {
			try {
				this.openClickedURI(aEvent, aAction.action);
				return true;
			}
			catch(e) {
			}
			return false;
		}, this);
	},
 
	getActionsForEvent : function(aEvent) 
	{
		var actions = [];
		if (
			aEvent.originalTarget.ownerDocument == document ||
			aEvent.originalTarget.ownerDocument.designMode == 'on' ||
			(
				this.evaluateXPath(
					'ancestor-or-self::*[1]',
					aEvent.originalTarget,
					XPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue
					.localName
					.search(/^(textarea|input|textbox|select|menulist|scrollbar(button)?|slider|thumb)$/i) > -1
			)
			) {
			return actions;
		}

		for (let i in this.actions)
		{
			let action = this.actions[i];
			if (this.actionShouldHandleEvent(action, aEvent)) {
				actions.push(this.actions[i]);
			}
		}
		return actions;
	},
 
	actionShouldHandleEvent : function(aAction, aEvent) 
	{
		var trigger;
		return (
			(
				(
					aEvent.type == 'keypress' &&
					(trigger = aAction.triggerKey.toLowerCase()) &&
					/(VK_[^-,|\s]+)/i.test(trigger) &&
					aEvent['DOM_'+RegExp.$1.toUpperCase()] &&
					(
						RegExp.$1.toUpperCase().search(/VK_(ENTER|RETURN)/) > -1 ?
							(
								aEvent.keyCode == aEvent.DOM_VK_ENTER ||
								aEvent.keyCode == aEvent.DOM_VK_RETURN
							) :
							aEvent.keyCode == aEvent['DOM_'+RegExp.$1.toUpperCase()]
					)
				) ||
				(
					(trigger = aAction.triggerMouse.toLowerCase()) &&
					(
						aEvent.type == 'dblclick' ?
							(aEvent.button == 0 && trigger.indexOf('dblclick') > -1) :
						aEvent.type == 'click' ?
							(aEvent.button == (trigger.indexOf('middleclick') > -1 ? 1 : 0 )) :
							false
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
		);
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

			case 'textlink.relative.enabled':
				this.shouldParseRelativePath = value;
				return;

			case 'textlink.idn.enabled':
				this.invalidatePatterns();
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

			case 'textlink.part.exception':
				this._URIExceptionPattern = null;
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
		this.stopProgressiveBuildTooltip();

		var target = this.getEditableFromChild(this.popupNode);
		var selection = this.getSelection(target);
		selection = selection ?
			[
				this.popupNode.ownerDocument.defaultView.location.href,
				(function() {
					var positions = [];
					for (let i = 0, maxi = selection.rangeCount; i < maxi; i++)
					{
						let range = selection.getRangeAt(i);
						let position = range.cloneRange();
						position.collapse(true);
						try {
							position.setStartBefore(range.startContainer.ownerDocument.documentElement);
							positions.push(position.toString().length+'+'+range.toString().length);
						}
						catch(e) {
						}
					}
					return positions.join(',');
				})(),
				selection.toString()
			].join('\n') :
			null ;

		if (this.tooltip.lastSelection != selection) {
			this.tooltip.findURIsIterator = this.getURIRangesIterator(target);
			this.tooltip.foundURIRanges   = [];
			this.tooltip.lastSelection    = selection;
		}

		this.tooltip.buildTimer = window.setInterval(function(aSelf) {
			if (aSelf.updateTooltip()) return;
			window.clearInterval(aSelf.tooltip.buildTimer);
			aSelf.tooltip.buildTimer       = null;
			aSelf.tooltip.foundURIRanges.forEach(function(aRange) {
				aRange.range.detach();
			});
			aSelf.tooltip.foundURIRanges   = [];
			aSelf.tooltip.findURIsIterator = null;
		}, 1, this);
	},
	stopProgressiveBuildTooltip : function()
	{
		if (this.tooltip.buildTimer) {
			window.clearInterval(this.tooltip.buildTimer);
			this.tooltip.buildTimer = null;
		}
	},
	updateTooltip : function()
	{
		this.destroyTooltip();

		var iterator = this.tooltip.findURIsIterator;
		if (iterator) {
			var ranges = this.tooltip.foundURIRanges;
			try {
				ranges.push(iterator.next());
			}
			catch(e if e instanceof StopIteration) {
			}
			catch(e) {
				return false;
			}
			ranges.sort(this._compareRangePosition);

			this.tooltip.foundURIs = ranges.map(function(aRange) {
				return aRange.uri;
			});
		}

		var fragment = document.createDocumentFragment();
		this.tooltip.foundURIs.forEach(function(aURI) {
			var line = document.createElement('description');
			line.setAttribute('value', aURI);
			fragment.appendChild(line);
		});

		this.tooltipBox.appendChild(fragment);
		return iterator;
	},
	destroyTooltip : function()
	{
		var range = document.createRange();
		range.selectNodeContents(this.tooltipBox);
		range.deleteContents();
		range.detach();
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

		var ranges = this.getSelectionURIRanges(frame, this.FIND_FIRST, this.strict);
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
		this.loadURI(uri, referrer, aEvent, aAction);
	},
	loadURI : function(aURI, aReferrer, aEvent, aAction)
	{
		var b = aEvent.currentTarget;
		var frame = aEvent.originalTarget.ownerDocument.defaultView;

		if (aAction & this.ACTION_OPEN_IN_CURRENT ||
			aURI.match(/^mailto:/) ||
			b.localName != 'tabbrowser') {
			b.loadURI(aURI, aReferrer);
		}
		else if (aAction & this.ACTION_OPEN_IN_WINDOW) {
			window.openDialog(this.browserURI, '_blank', 'chrome,all,dialog=no', aURI, null, aReferrer);
		}
		else {
			if ('TreeStyleTabService' in window) { // Tree Style Tab
				TreeStyleTabService.readyToOpenChildTab(frame);
			}
			b.loadOneTab(aURI, aReferrer, null, null, (aAction & this.ACTION_OPEN_IN_BACKGROUND_TAB));
		}
	},
 
	openTextLinkIn : function(aAction, aTarget) 
	{
		var frame = this.getCurrentFrame();
		var uris = this.getSelectionURIRanges(this.getEditableFromChild(aTarget) || frame	);
		if (!uris.length) return;

		var selection = frame.getSelection();
		selection.removeAllRanges();
		uris = uris.map(function(aRange) {
				selection.addRange(aRange.range);
				return aRange.uri;
			});

		if (aAction == this.ACTION_COPY) {
			if (uris.length > 1) uris.push('');
			this.setClipBoard(uris.join('\r\n'));
			return;
		}

		if (aAction === void(0))
			aAction = this.ACTION_OPEN_IN_CURRENT;

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

		if (aAction == this.ACTION_OPEN_IN_WINDOW) {
			uris.forEach(function(aURI) {
				window.open(aURI);
			});
			return;
		}

		if (aAction == this.ACTION_OPEN_IN_CURRENT && uris.length == 1) {
			this.browser.loadURI(uris[i]);
			return;
		}

		if ('UndoTabService' in window && UndoTabService.isUndoable()) {
			let self = this;
			let state = UndoTabService.getTabState(this.browser.selectedTab);
			let oldSelected = this.browser.selectedTab;
			let entry;
			UndoTabService.doOperation(
				function(aInfo) {
					let tabs = self.openTextLinkInTabs(uris, aAction);
					let replace = tabs.length < uris.length;
					entry.data = UndoTabService.getTabOpetarionTargetsData({
						browser : self.browser,
						tabs : {
							oldSelected : oldSelected,
							newSelected : self.browser.selectedTab,
							first       : tabs[0]
						}
						}, {
						replace : replace,
						state   : replace ? state : null ,
						uris    : uris
					});
				},
				(entry = {
					name  : 'textlink-openTabs',
					label : this.bundle.getString('undo_openTextLinkInTabs_label')
				})
			);
		}
		else {
			this.openTextLinkInTabs(uris, aAction);
		}
	},
	openTextLinkInTabs : function(aURIs, aAction)
	{
		var selectTab;
		var tabs = [];
		var b = this.browser;
		aURIs.forEach(function(aURI, aIndex) {
			if (
				aIndex == 0 &&
				(
					(aAction == this.ACTION_OPEN_IN_CURRENT) ||
					(b.currentURI && b.currentURI.spec == 'about:blank')
				)
				) {
				if ('TreeStyleTabService' in window) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				b.loadURI(aURI);
				if (!selectTab) selectTab = b.selectedTab;
				tabs.push(b.selectedTabs);
			}
			else {
				if ('TreeStyleTabService' in window && !TreeStyleTabService.checkToOpenChildTab(b)) // Tree Style Tab
					TreeStyleTabService.readyToOpenChildTab(b, true);
				let tab = b.addTab(aURI);
				if (!selectTab) selectTab = tab;
				tabs.push(tab);
			}
		}, this);

		if ('TreeStyleTabService' in window) // Tree Style Tab
			TreeStyleTabService.stopToOpenChildTab(b);

		if (selectTab &&
			aAction != this.ACTION_OPEN_IN_BACKGROUND_TAB) {
			b.selectedTab = selectTab;
			if ('scrollTabbarToTab' in b) b.scrollTabbarToTab(selectTab);
			if ('setFocusInternal' in b) b.setFocusInternal();
		}

		return tabs;
	},
	onPreUndoOpenTextLinkInTabs : function(aEvent)
	{
		var data   = aEvent.entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (target.browser)
			data.tabs.newSelected = UndoTabService.getId(target.browser.selectedTab);
	},
	onUndoOpenTextLinkInTabs : function(aEvent)
	{
		var entry  = aEvent.entry;
		var data   = entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (!target.browser)
			return aEvent.preventDefault();

		if (target.tabs.oldSelected)
			target.browser.selectedTab = target.tabs.oldSelected;
		if (data.replace)
			UndoTabService.setTabState(target.tab, target.state);
	},
	onRedoOpenTextLinkInTabs : function(aEvent)
	{
		var entry  = aEvent.entry;
		var data   = entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		data.tabs.oldSelected = UndoTabService.getId(target.browser.selectedTab);
		if (!data.replace)
			return;

		if (!target.tabs.first)
			return aEvent.preventDefault();
		data.state = UndoTabService.getTabState(target.tabs.first);
		target.tabs.first.linkedBrowser.loadURI(data.uris[0]);
	},
	onPostRedoOpenTextLinkInTabs : function(aEvent)
	{
		var data   = aEvent.entry.data;
		var target = UndoTabService.getTabOpetarionTargetsBy(data);
		if (target.tabs.newSelected)
			target.browser.selectedTab = target.tabs.newSelected;
	},
 
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		window.addEventListener('UIOperationHistoryPreUndo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryUndo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryRedo:TabbarOperations', this, false);
		window.addEventListener('UIOperationHistoryPostRedo:TabbarOperations', this, false);

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

		// hacks.js
		this.overrideExtensions();
	},
	
	initPrefs : function() 
	{
		var prefs = <![CDATA[
			textlink.schemer
			textlink.schemer.fixup.table
			textlink.schemer.fixup.default
			textlink.find_click_point.strict
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

		var uris = [];
		var target;
		if (
			(
				TLS.contextItemCurrent ||
				TLS.contextItemWindow ||
				TLS.contextItemTab ||
				TLS.contextItemCopy
			) &&
			this.isTextSelected &&
			this.isContentSelected
			) {
			try {
				target = TLS.getEditableFromChild(TLS.popupNode);
				var first = TLS.getFirstSelectionURIRange(target);
				var found = {};
				if (first) {
					uris.push(first.uri);
					first.range.detach();
					found[first.uri] = true;
				}
				var last = TLS.getLastSelectionURIRange(target, false, found);
				if (last) {
					uris.push(last.uri);
					last.range.detach();
				}
			}
			catch(e) {
			}
		}

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

		window.removeEventListener('UIOperationHistoryPreUndo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryUndo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryRedo:TabbarOperations', this, false);
		window.removeEventListener('UIOperationHistoryPostRedo:TabbarOperations', this, false);

		this.destroyBrowser(gBrowser);
	},
	
	destroyBrowser : function(aBrowser) 
	{
		aBrowser.removeEventListener('dblclick', this, true);
		aBrowser.removeEventListener('keypress', this, true);
	}
   
}; 

TextLinkService.__proto__ = window['piro.sakura.ne.jp'].prefs;
 
