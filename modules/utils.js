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
 * Portions created by the Initial Developer are Copyright (C) 2002-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro.outsider.reflex@gmail.com>
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
 * ***** END LICENSE BLOCK ******/
 
const EXPORTED_SYMBOLS = ['TextLinkUtils']; 

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://textlink-modules/prefs.js');
 
var TextLinkUtils = { 
	prefs : prefs,
	
	schemeFixupDefault : 'http', 
	strict              : true,
	contextItemCurrent  : true,
	contextItemWindow   : true,
	contextItemTab      : true,
	contextItemCopy     : true,

	multilineURIEnabled : false,

	get scheme()
	{
		return this._scheme;
	},
	set scheme(aValue)
	{
		this._scheme = aValue;
		this._schemes = this.niceSplit(this.expandWildcardsToRegExp(this.scheme));
		this.IDNScheme = this.IDNScheme; // reset IDN-enabled schemes list
		this.invalidatePatterns();
		return aValue;
	},
	_scheme : '',
	get schemes()
	{
		return this._schemes.concat(this._fixupSchemes).sort();
	},
	_schemes : [],
	_fixupSchemes : [],

	set IDNScheme(aValue)
	{
		this._IDNScheme = aValue;
		this._IDNSchemes = this.niceSplit(this.expandWildcardsToRegExp(this._IDNScheme))
							.filter(function(aScheme) {
								return this.schemes.indexOf(aScheme) > -1;
							}, this);
		this.invalidatePatterns();
		return aValue;
	},
	get IDNScheme()
	{
		return this._IDNScheme;
	},
	_IDNScheme : '',
	get IDNSchemes()
	{
		if (this.IDNEnabled) {
			if (this._fixupIDNSchemes === null) {
				this._fixupIDNSchemes = [];
				for (let i in this._fixupTargetsHash)
				{
					if (!this._fixupTargetsHash.hasOwnProperty(i))
						continue;
					let fixUpToMatch = this._fixupTargetsHash[i].match(/^(\w+):/);
					let fixUpFromMatch = i.match(/^(\w+):/);
					if (
						fixUpToMatch &&
						this._IDNSchemes.indexOf(fixUpToMatch[1]) > -1 &&
						fixUpFromMatch
						)
						this._fixupIDNSchemes.push(fixUpFromMatch[1]);
				}
			}
			return this._IDNSchemes.concat(this._fixupIDNSchemes).sort();
		}
		else {
			return [];
		}
	},
	_IDNSchemes : [],
	_fixupIDNSchemes : null,

	get nonIDNSchemes()
	{
		if (this.IDNEnabled) {
			if (this._nonIDNSchemes === null) {
				let IDNSchemes = this.IDNSchemes;
				this._nonIDNSchemes = this.schemes
										.filter(function(aScheme) {
											return IDNSchemes.indexOf(aScheme) < 0;
										});
			}
			return this._nonIDNSchemes;
		}
		else {
			return this.schemes;
		}
	},
	_nonIDNSchemes : null,

	get schemeFixupTable()
	{
		return this._schemeFixupTable;
	},
	set schemeFixupTable(aValue)
	{
		this._schemeFixupTable = aValue;

		this._fixupTable = this._schemeFixupTable
					.replace(/(\s*[^:,\s]+)\s*=>\s*([^:,\s]+)(\s*([,\| \n\r\t]|$))/g, '$1:=>$2:$3');

		this._fixupTargets     = [];
		this._fixupTargetsHash = {};
		this._fixupSchemes     = [];
		this.niceSplit(this.expandWildcardsToRegExp(this._fixupTable))
			.forEach(function(aTarget) {
				let [fixUpFrom, fixUpTo] = aTarget.split(/\s*=>\s*/);
				if (!fixUpFrom || !fixUpTo)
					return;
				this._fixupTargetsHash[fixUpFrom] = fixUpTo;
				this._fixupTargets.push(fixUpFrom);
				let match = fixUpFrom.match(/^(\w+):/);
				if (match)
					this._fixupSchemes.push(match[1]);
			}, this);

		this._fixupTargets.sort().forEach(function(aTarget) {
			this._fixupTargetsHash[aTarget] = this._fixupTargetsHash[aTarget];
		}, this);
		this._fixupSchemes.sort();

		this._fixupTargetsPattern = this._fixupTargets.join('|');
		this._fixupTargetsRegExp = new RegExp('^('+this._fixupTargetsPattern+')');

		this.invalidatePatterns();
		return aValue;
	},
	_schemeFixupTable : '',

	get relativePathEnabled()
	{
		return this._relativePathEnabled;
	},
	set relativePathEnabled(val)
	{
		this._relativePathEnabled = val;
		this.invalidatePatterns();
		return val;
	},
	_relativePathEnabled : false,

	get multibyteEnabled()
	{
		return this._multibyteEnabled;
	},
	set multibyteEnabled(val)
	{
		this._multibyteEnabled = val;
		this.invalidatePatterns();
		return val;
	},
	_multibyteEnabled : true,

	get IDNEnabled()
	{
		return this._IDNEnabled;
	},
	set IDNEnabled(val)
	{
		this._IDNEnabled = val;
		this.invalidatePatterns();
		return val;
	},
	_IDNEnabled : true,

	get i18nPathEnabled()
	{
		return this._i18nPathEnabled;
	},
	set i18nPathEnabled(val)
	{
		this._i18nPathEnabled = val;
		this.invalidatePatterns();
		return val;
	},
	_i18nPathEnabled : false,
 
	ACTION_DISABLED               : 0, 
	ACTION_STEALTH                : 1,
	ACTION_SELECT                 : 2,
	ACTION_OPEN_IN_CURRENT        : 4,
	ACTION_OPEN_IN_WINDOW         : 8,
	ACTION_OPEN_IN_TAB            : 16,
	ACTION_OPEN_IN_BACKGROUND_TAB : 32,
	ACTION_COPY                   : 1024,

	actions : {},
 
// regexp 
	
	get URIPattern() 
	{
		if (!this._URIPattern) {
			var patterns = [];
			var base = this.URIPattern_base
						.replace(
							/%PART_PATTERN%/g,
							this.URIPattern_part
						)
						.replace(
							/%LOGIN_PATTERN%/g,
							this.kLoginPattern
						);
			patterns.push(base
							.replace(
								/%SCHEME_PATTERN%/g,
								'(?:'+this.nonIDNSchemes.join('|')+'):'
							)
							.replace(
								/%POSSIBLE_DOMAIN_PATTERN%/g,
								this.getDomainPattern(this.kDOMAIN_LAZY)
							)
							.replace(
								/%DOMAIN_PATTERN%/g,
								this.getDomainPattern()
							));
			if (this.IDNEnabled)
				patterns.push(base
								.replace(
									/%SCHEME_PATTERN%/g,
									'(?:'+this.IDNSchemes.join('|')+'):'
								)
								.replace(
									/%POSSIBLE_DOMAIN_PATTERN%/g,
									this.getDomainPattern(this.kDOMAIN_LAZY | this.kDOMAIN_IDN)
								)
								.replace(
									/%DOMAIN_PATTERN%/g,
									this.getDomainPattern(this.kDOMAIN_IDN)
								));
			this._URIPattern = this.URIPatterns_base.replace(/%URI_PATTERN%/g, patterns.join('|'));
		}

		return this._URIPattern;
	},
	_URIPattern : null,
 
	get URIPatternRelative() 
	{
		if (!this._URIPatternRelative) {
			this._URIPatternRelative = this.URIPatternRelative_base
				.replace(
					/%PART_PATTERN%/g,
					this.URIPattern_part
				);
		}

		return this._URIPatternRelative;
	},
	_URIPatternRelative : null,
 
	get URIPatternMultibyte() 
	{
		if (!this._URIPatternMultibyte) {
			var patterns = [];
			var base = this.URIPatternMultibyte_base
						.replace(
							/%PART_PATTERN%/g,
							this.URIPatternMultibyte_part
						)
						.replace(
							/%LOGIN_PATTERN%/g,
							this.kLoginPatternMultibyte
						);
			patterns.push(base
							.replace(
								/%SCHEME_PATTERN%/g,
								'(?:'+
								this.nonIDNSchemes.map(function(aScheme) {
									return aScheme+'|'+this.convertHalfWidthToFullWidth(aScheme);
								}, this).join('|')+
								')[:\uff1a]'
							)
							.replace(
								/%POSSIBLE_DOMAIN_PATTERN%/g,
								this.getDomainPattern(this.kDOMAIN_MULTIBYTE | this.kDOMAIN_LAZY)
							)
							.replace(
								/%DOMAIN_PATTERN%/g,
								this.getDomainPattern(this.kDOMAIN_MULTIBYTE)
							));
			if (this.IDNEnabled)
				patterns.push(base
								.replace(
									/%SCHEME_PATTERN%/g,
									'(?:'+
									this.IDNSchemes.map(function(aScheme) {
										return aScheme+'|'+this.convertHalfWidthToFullWidth(aScheme);
									}, this).join('|')+
									')[:\uff1a]'
								)
								.replace(
									/%POSSIBLE_DOMAIN_PATTERN%/g,
									this.getDomainPattern(this.kDOMAIN_MULTIBYTE | this.kDOMAIN_LAZY | this.kDOMAIN_IDN)
								)
								.replace(
									/%DOMAIN_PATTERN%/g,
									this.getDomainPattern(this.kDOMAIN_MULTIBYTE | this.kDOMAIN_IDN)
								));
			this._URIPatternMultibyte = this.URIPatternsMultibyte_base.replace(/%URI_PATTERN%/g, patterns.join('|'));
		}

		return this._URIPatternMultibyte;
	},
	_URIPatternMultibyte : null,
 
	get URIPatternMultibyteRelative() 
	{
		if (!this._URIPatternMultibyteRelative) {
			this._URIPatternMultibyteRelative = this.URIPatternMultibyteRelative_base
				.replace(
					/%PART_PATTERN%/g,
					this.URIPatternMultibyte_part
				);
		}

		return this._URIPatternMultibyteRelative;
	},
	_URIPatternMultibyteRelative : null,
 
	getDomainPattern : function(aOptionsFlag) 
	{
		aOptionsFlag = aOptionsFlag || 0;
		var pattern = this._domainPatterns[aOptionsFlag];
		if (!pattern) {
			if (aOptionsFlag & this.kDOMAIN_IDN) {
				let forbiddenCharacters = this.kStringprepForbiddenCharacters+
											this.kIDNDomainSeparators+
											':/@\uff1a\uff0f\uff20';
				if (!(aOptionsFlag & this.kDOMAIN_LAZY))
					forbiddenCharacters += this.prefs.getPref('textlink.idn.lazyDetection.separators');
				let part = '[^'+
							forbiddenCharacters+
							(this.prefs.getPref('network.IDN.blacklist_chars') || '')
								.replace(new RegExp('['+forbiddenCharacters+']', 'g'), '')
								.replace(/(.)\1+/g, '$1')
								.replace(/./g, function(aChar) {
									return '\\u'+(('00'+aChar.charCodeAt(0).toString(16)).substr(-4, 4));
								})+
							']+';
				pattern = part + '(?:[' + this.kIDNDomainSeparators + ']' + part + ')*';
			}
			else if (aOptionsFlag & this.kDOMAIN_MULTIBYTE) {
				let part = '[0-9a-z-\uff10-\uff19\uff41-\uff5a\uff21-\uff3a\uff0d]+';
				pattern = part + '(?:[' + this.kMultibyteDomainSeparators + ']' + part + ')*';
			}
			else {
				let part = '[0-9a-z-]+';
				pattern = part + '(?:' + this.kDomainSeparators + part + ')*';
			}
			if (
				!(aOptionsFlag & this.kDOMAIN_LAZY) ||
				aOptionsFlag & this.kDOMAIN_IDN
				)
				pattern += this.getTLDPattern(aOptionsFlag);

			this._domainPatterns[aOptionsFlag] = pattern;
		}
		return pattern;
	},
	_domainPatterns : {},
	kDOMAIN_MULTIBYTE : (1 << 0),
	kDOMAIN_LAZY      : (1 << 1),
	kDOMAIN_IDN       : (1 << 2),
 
	kDomainSeparators          : '\\.', 
	kMultibyteDomainSeparators : '\\.\uff0e',
	kIDNDomainSeparators       : '\\.\u3002\uff0e',
 
	getTLDPattern : function(aOptionsFlag) 
	{
		var TLD = this.topLevelDomains;
		var halfWidthTLDPattern = '(?:'+TLD.join('|')+')\\b';
		var TLDPattern = aOptionsFlag & this.kDOMAIN_MULTIBYTE || aOptionsFlag & this.kDOMAIN_IDN ?
						'(?:' +
						[halfWidthTLDPattern]
							.concat(TLD.map(this.convertHalfWidthToFullWidth, this))
							.join('|') +
						')' :
						halfWidthTLDPattern ;
		return (aOptionsFlag & this.kDOMAIN_IDN ?
					'['+this.kIDNDomainSeparators+']' :
				aOptionsFlag & this.kDOMAIN_MULTIBYTE ?
					'['+this.kMultibyteDomainSeparators+']' :
					this.kDomainSeparators
				)+
				TLDPattern;
	},
 
	// Forbidden characters in IDN are defined by RFC 3491. 
	//   http://www.ietf.org/rfc/rfc3491.txt
	//   http://www5d.biglobe.ne.jp/~stssk/rfc/rfc3491j.html
	// and
	//   http://www.ietf.org/rfc/rfc3454.txt
	//   http://www.jdna.jp/survey/rfc/rfc3454j.html
	kStringprepForbiddenCharacters : '\\u0000-\\u0020\\u0080-\\u00A0\\u0340\\u0341\\u06DD\\u070F\\u1680\\u180E\\u2000-\\u200F\\u2028-\\u202F\\u205F-\\u2063\\u206A-\\u206F\\u2FF0-\\u2FFB\\u3000\\uD800-\\uF8FF\\uFDD0-\\uFDEF\\uFEFF\\uFFF9-\\uFFFF',
	kStringprepReplaceToNothingRegExp : /[\u00AD\u034F\u1806\u180B-\u180D\u200B-\u200D\u2060\uFE00-\uFE0F\uFEFF]/g,
 
	URIPatterns_base : '\\(?(%URI_PATTERN%)', 
	URIPatternsMultibyte_base : '[\\(\uff08]?(%URI_PATTERN%)', 
 
	URIPattern_base : '%SCHEME_PATTERN%(?://)?%LOGIN_PATTERN%%POSSIBLE_DOMAIN_PATTERN%(?:/(?:%PART_PATTERN%)?)?|%LOGIN_PATTERN%%DOMAIN_PATTERN%(?:/%PART_PATTERN%)?', 
	URIPatternRelative_base : '%PART_PATTERN%(?:\\.|/)%PART_PATTERN%',
 
	URIPatternMultibyte_base : '%SCHEME_PATTERN%(?://|\uff0f\uff0f)?%LOGIN_PATTERN%%POSSIBLE_DOMAIN_PATTERN%(?:[/\uff0f](?:%PART_PATTERN%)?)?|%LOGIN_PATTERN%%DOMAIN_PATTERN%(?:[/\uff0f](?:%PART_PATTERN%)?)?', 
	URIPatternMultibyteRelative_base : '%PART_PATTERN%[\\.\uff0e/\uff0f]%PART_PATTERN%',
 
	kSchemePattern : '[\\*\\+a-z0-9_]+:', 
	kSchemePatternMultibyte : '[\\*\\+a-z0-9_\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff3f]+[:\uff1a]',

	kLoginPattern : '(?:[^/:]+(?::[^/@]+)?@)?',
	kLoginPatternMultibyte : '(?:[^/:\uff0f\uff1a]+(?:[:\uff1a][^@/\uff0f\uff20]+)?[@\uff20])?',

	kURIPattern_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#]+',
	kURIPatternMultibyte_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#\u301c\uff0d\uff3f\uff0e\uff01\uff5e\uffe3\uff0a\u2019\uff08\uff09\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03]+',
 
	get URIPattern_part() 
	{
		if (!this._URIPattern_part) {
			this._URIPattern_part = this.i18nPathEnabled ?
				'[^'+this.kStringprepForbiddenCharacters+']+' :
				this.kURIPattern_part ;
		}
		return this._URIPattern_part;
	},
	_URIPattern_part : null,
	get URIPatternMultibyte_part()
	{
		if (!this._URIPatternMultibyte_part) {
			this._URIPatternMultibyte_part = this.i18nPathEnabled ?
				'[^'+this.kStringprepForbiddenCharacters+']+' :
				this.kURIPatternMultibyte_part ;
		}
		return this._URIPatternMultibyte_part;
	},
	_URIPatternMultibyte_part : null,
 
	get findURIPatternPart() 
	{
		if (!this._findURIPatternPart) {
			this._findURIPatternPart = this.i18nPathEnabled || this.IDNEnabled ?
				'[^'+this.kStringprepForbiddenCharacters+']+' :
				this.kURIPattern_part ;
		}
		return this._findURIPatternPart;
	},
	_findURIPatternPart : null,
	get findURIPatternMultibytePart()
	{
		if (!this._findURIPatternMultibytePart) {
			this._findURIPatternMultibytePart = this.i18nPathEnabled || this.IDNEnabled ?
				'[^'+this.kStringprepForbiddenCharacters+']+' :
				this.kURIPatternMultibyte_part ;
		}
		return this._findURIPatternMultibytePart;
	},
	_findURIPatternMultibytePart : null,
 
	get topLevelDomains() 
	{
		if (!this._topLevelDomains) {
			let TLD = [
					this.prefs.getPref('textlink.gTLD'),
					this.prefs.getPref('textlink.ccTLD'),
					this.prefs.getPref('textlink.extraTLD')
				];
			if (this.IDNEnabled)
				TLD .push(this.prefs.getPref('textlink.IDN_TLD'));
			this._topLevelDomains = this.cleanUpArray(TLD.join(' ').replace(/^\s+|\s+$/g, '').split(/\s+/))
										.reverse(); // this is required to match "com" instead of "co".
		}
		return this._topLevelDomains;
	},
	_topLevelDomains : null,
 
	get URIExceptionPattern() 
	{
		if (!this._URIExceptionPattern)
			this._updateURIExceptionPattern();
		return this._URIExceptionPattern;
	},
	get URIExceptionPattern_start()
	{
		if (!this._URIExceptionPattern_start)
			this._updateURIExceptionPattern();
		return this._URIExceptionPattern_start;
	},
	get URIExceptionPattern_end()
	{
		if (!this._URIExceptionPattern_end)
			this._updateURIExceptionPattern();
		return this._URIExceptionPattern_end;
	},
	get URIExceptionPattern_all()
	{
		if (!this._URIExceptionPattern_all)
			this._updateURIExceptionPattern();
		return this._URIExceptionPattern_all;
	},
	_updateURIExceptionPattern : function()
	{
		try {
			var whole = '^(?:'+this.prefs.getPref('textlink.part.exception.whole')+')$';
			var start = '^(?:'+this.prefs.getPref('textlink.part.exception.start')+')';
			var end = '(?:'+this.prefs.getPref('textlink.part.exception.end')+')$';
			this._URIExceptionPattern = new RegExp(whole, 'i');
			this._URIExceptionPattern_start = new RegExp(start, 'i');
			this._URIExceptionPattern_end = new RegExp(end, 'i');
			this._URIExceptionPattern_all = new RegExp(whole+'|'+start+'|'+end, 'i');
		}
		catch(e) {
			this._URIExceptionPattern = /[^\w\W]/;
			this._URIExceptionPattern_start = /[^\w\W]/;
			this._URIExceptionPattern_end = /[^\w\W]/;
			this._URIExceptionPattern_all = /[^\w\W]/;
		}
	},
	_URIExceptionPattern : null,
	_URIExceptionPattern_start : null,
	_URIExceptionPattern_end : null,
	_URIExceptionPattern_all : null,
 
	invalidatePatterns : function() 
	{
		this._schemeRegExp = null;
		this._fixupIDNSchemes = null;
		this._nonIDNSchemes = null;

		this._domainPatterns = {};
		this._topLevelDomains = null;
		this._topLevelDomainsRegExp = null;

		this._findURIPatternPart = null;
		this._findURIPatternMultibytePart = null;

		this._URIPattern_part = null;
		this._URIPattern = null;
		this._URIPatternMultibyte_part = null;
		this._URIPatternMultibyte = null;

		this._URIMatchingRegExp = null;
		this._URIMatchingRegExp_fromHead = null;
		this._URIPartFinderRegExp_start = null;
		this._URIPartFinderRegExp_end = null;
	},
 
	invalidateExceptionPatterns : function() 
	{
		this._URIExceptionPattern = null;
		this._URIExceptionPattern_start = null;
		this._URIExceptionPattern_end = null;
		this._URIExceptionPattern_all = null;
	},
  
	// XPConnect 
	
	get URIFixup() 
	{
		if (!this._URIFixup) {
			this._URIFixup = Cc['@mozilla.org/docshell/urifixup;1'].getService(Ci.nsIURIFixup);
		}
		return this._URIFixup;
	},
	_URIFixup : null,
  
// utilities 
	
	evaluateXPath : function(aExpression, aContext, aType) 
	{
		if (!aType) aType = Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
		try {
			var xpathResult = (aContext.ownerDocument || aContext || this.document).evaluate(
					aExpression,
					(aContext || this.document),
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
		Cc['@mozilla.org/widget/clipboardhelper;1']
			.getService(Ci.nsIClipboardHelper)
			.copyString(aString);
	},
 
	cleanUpArray : function(aArray) 
	{
		return aArray.slice(0)
					.sort()
					.join('\n')
					.replace(/^(.+)$\n(\1\n)+/gm, '$1\n')
					.split('\n');
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
 
	expandWildcardsToRegExp : function(aInput) 
	{
		return String(aInput)
			.replace(/([\(\)\+\.\{\}])/g, '\\$1')
			.replace(/\?/g, '.')
			.replace(/\*/g, '.+');
	},
 
	niceSplit : function(aInput) 
	{
		return String(aInput)
			.split(/[\s\|,]+/)
			.filter(function(aItem) {
				return !!aItem;
			});
	},
  
// uri operations 
	
	makeURIFromSpec : function(aURI) 
	{
		try {
			var newURI;
			aURI = aURI || '';
			if (aURI && String(aURI).match(/^file:/)) {
				var fileHandler = Services.io.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
				var tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
				newURI = Services.io.newFileURI(tempLocalFile);
			}
			else {
				newURI = Services.io.newURI(aURI, null, null);
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
		var match = aString.match(this._URIMatchingRegExp);
		if (!match)
			return null;
		match = Array.slice(match)
					.filter(function(aMaybeURI) {
						return (
							(
								!this.hasLoadableScheme(aMaybeURI) &&
								!this.URIExceptionPattern_all.test(aMaybeURI)
							) ||
							this.isHeadOfNewURI(aMaybeURI)
						);
					}, this);
		return match.length ? match : null ;
	},
	isHeadOfNewURI : function(aString)
	{
		this._updateURIRegExp();
		var match = aString.match(this._URIMatchingRegExp_fromHead);
		match = match ? match[1] : '' ;
		return this.hasLoadableScheme(match) ? match == aString : false ;
	},
	_URIMatchingRegExp : null,
	_URIMatchingRegExp_fromHead : null,
	_updateURIRegExp : function()
	{
		if (this._URIMatchingRegExp) return;
		var regexp = [];
		if (this.multibyteEnabled) {
			this._URIMatchingRegExp_fromHead = new RegExp(this.URIPatternMultibyte, 'i');
			regexp.push(this.URIPatternMultibyte);
			if (this.relativePathEnabled) regexp.push(this.URIPatternMultibyteRelative);
		}
		else {
			this._URIMatchingRegExp_fromHead = new RegExp(this.URIPattern, 'i');
			regexp.push(this.URIPattern);
			if (this.relativePathEnabled) regexp.push(this.URIPatternRelative);
		}
		this._URIMatchingRegExp = new RegExp(regexp.join('|'), 'ig');
	},
 
	getURIPartFromStart : function(aString, aExcludeURIHead) 
	{
		this._updateURIPartFinderRegExp();
		var match = aString.match(this._URIPartFinderRegExp_start);
		var part = match ? match[1] : '' ;
		return (!aExcludeURIHead || !this.isHeadOfNewURI(part)) ? part : '' ;
	},
	getURIPartFromEnd : function(aString)
	{
		this._updateURIPartFinderRegExp();
		var match = aString.match(this._URIPartFinderRegExp_end);
		return match ? match[1] : '' ;
	},
	_URIPartFinderRegExp_start : null,
	_URIPartFinderRegExp_end : null,
	_updateURIPartFinderRegExp : function()
	{
		if (this._URIPartFinderRegExp_start && this._URIPartFinderRegExp_end)
			return;

		var base = this.multibyteEnabled ?
				this.findURIPatternMultibytePart :
				this.findURIPatternPart ;
		this._URIPartFinderRegExp_start = new RegExp('^('+base+')', 'i');
		this._URIPartFinderRegExp_end   = new RegExp('('+base+')$', 'i');
	},
 
	hasLoadableScheme : function(aURI) 
	{
		if (!this._schemeRegExp)
			this._schemeRegExp = new RegExp('^('+this.schemes.join('|')+'):', 'i');
		return this._schemeRegExp.test(this.convertFullWidthToHalfWidth(aURI));
	},
	_schemeRegExp : null,
 
	hasScheme : function(aInput) 
	{
		return this._firstSchemeRegExp.test(aInput);
	},
	removeScheme : function(aInput)
	{
		return aInput.replace(this._firstSchemeRegExp, '');
	},
	get _firstSchemeRegExp()
	{
		if (!this.__firstSchemeRegExp) {
			this.__firstSchemeRegExp = new RegExp('^'+this.kSchemePatternMultibyte, 'i');
		}
		return this.__firstSchemeRegExp;
	},
	__firstSchemeRegExp : null,
 
	fixupURI : function(aURIComponent, aBaseURI) 
	{
		if (this.multibyteEnabled) {
			aURIComponent = this.convertFullWidthToHalfWidth(aURIComponent);
		}

		aURIComponent = this.sanitizeURIString(aURIComponent);
		if (!aURIComponent) {
			return null;
		}

		aURIComponent = this.fixupScheme(aURIComponent);

		if (this.relativePathEnabled) {
			aURIComponent = this.makeURIComplete(aURIComponent, aBaseURI);
		}

		return this.hasLoadableScheme(aURIComponent) ? aURIComponent : null ;
	},
	
	sanitizeURIString : function(aURIComponent) 
	{
		// escape patterns like program codes like JavaScript etc.
		if (!this._topLevelDomainsRegExp) {
			this._topLevelDomainsRegExp = new RegExp('^(' + this.topLevelDomains.join('|') + ')$');
		}
		if (this.relativePathEnabled) {
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
				!this.relativePathEnabled &&
				aURIComponent.match(/^[\.\/:](.+)$/)
			)
			) {
			aURIComponent = RegExp.$1;
		}

		aURIComponent = this.removeParen(aURIComponent);

		if (this.IDNEnabled || this.i18nPathEnabled)
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
 
	fixupScheme : function(aURI) 
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
		else if (!this._firstSchemeRegExp.test(aURI)) {
			var scheme = this.schemeFixupDefault;
			if (scheme)
				aURI = scheme+'://'+aURI;
		}

		return aURI;
	},
	_fixupTable : '',
	_fixupTargets : [],
	_fixupTargetsHash : {},
	_fixupTargetsPattern : '',
	_fixupTargetsRegExp : '',
 
	// ���΃p�X�̉��� 
	makeURIComplete : function(aURI, aSourceURI)
	{
		if (aURI.match(/^(urn|mailto):/i)) return aURI;

		if (aURI.match(/^([^\/\.]+\.)+([^\/\.]+)/) &&
			RegExp.$2.match(new RegExp(['^(', this.topLevelDomains.join('|'), ')$'].join('')))) {
			var fixedURI = this.URIFixup.createFixupURI(aURI || 'about:blank', this.URIFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);
			return fixedURI.spec;
		}

		var baseURI = Services.io.newURI(aSourceURI, null, null);
		return Services.io.newURI(aURI, null, baseURI).spec;
	},
   
	observe : function(aSubject, aTopic, aData) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.prefs.getPref(aData);
		switch (aData)
		{
			case 'textlink.scheme':
				this.scheme = value;
				return;

			case 'textlink.scheme.fixup.table':
				this.schemeFixupTable = value;
				return;

			case 'textlink.scheme.fixup.default':
				this.schemeFixupDefault = value;
				return;

			case 'textlink.find_click_point.strict':
				this.strict = value;
				return;

			case 'textlink.relative.enabled':
				this.relativePathEnabled = value;
				return;

			case 'textlink.idn.enabled':
			case 'network.enableIDN':
				this.IDNEnabled = this.prefs.getPref('network.enableIDN') && this.prefs.getPref('textlink.idn.enabled');
				return;

			case 'textlink.idn.scheme':
				this.IDNScheme = value;
				return;

			case 'textlink.i18nPath.enabled':
				this.i18nPathEnabled = this.prefs.getPref('textlink.i18nPath.enabled');
				return;

			case 'textlink.gTLD':
			case 'textlink.ccTLD':
			case 'textlink.IDN_TLD':
			case 'textlink.extraTLD':
			case 'network.IDN.blacklist_chars':
				this.invalidatePatterns();
				return;

			case 'textlink.multibyte.enabled':
				this.multibyteEnabled = value;
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

			case 'textlink.part.exception.whole':
			case 'textlink.part.exception.start':
			case 'textlink.part.exception.end':
				this.invalidateExceptionPatterns();
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
	domains : [
		'textlink.',
		'network.enableIDN',
		'network.IDN.blacklist_chars'
	],
 
	init : function() 
	{
		this.prefs.addPrefListener(this);
		this.migratePrefs();
		this.initPrefs();
	},
	
	initPrefs : function() 
	{
		var items = <![CDATA[
			textlink.scheme
			textlink.scheme.fixup.table
			textlink.scheme.fixup.default
			textlink.find_click_point.strict
			textlink.relative.enabled
			textlink.multibyte.enabled
			textlink.multiline.enabled
			textlink.idn.enabled
			textlink.idn.scheme
			textlink.i18nPath.enabled
			textlink.contextmenu.openTextLink.current
			textlink.contextmenu.openTextLink.window
			textlink.contextmenu.openTextLink.tab
			textlink.contextmenu.openTextLink.copy
		]]>.toString()
			.replace(/^\s+|\s+$/g, '')
			.split(/\s+/);

		items = items.concat(this.prefs.getDescendant('textlink.actions.'));

		items.sort().forEach(function(aPref) {
			this.observe(null, 'nsPref:changed', aPref);
		}, this);
	},
 
	kPREF_VERSION : 1, 
	migratePrefs : function()
	{
		// migrate old prefs
		var orientalPrefs = [];
		switch (this.prefs.getPref('textlink.prefsVersion'))
		{
			case 0:
				[
					'textlink.schemer:textlink.scheme',
					'textlink.schemer.fixup.table:textlink.scheme.fixup.table',
					'textlink.schemer.fixup.default:textlink.scheme.fixup.default'
				].forEach(function(aPref) {
					var keys = aPref.split(':');
					var value = this.prefs.getPref(keys[0]);
					if (value !== null) {
						this.prefs.setPref(keys[1], value);
						this.prefs.clearPref(keys[0]);
					}
				}, this);
			default:
				break;
		}
		this.prefs.setPref('textlink.prefsVersion', this.kPREF_VERSION);
	},
  
	destroy : function() 
	{
		this.prefs.removePrefListener(this);
	}
 
};

TextLinkUtils.init(); 
  
