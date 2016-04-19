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
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2015-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
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

var TextLinkConstants = {
	ACTION_DISABLED               : 0, 
	ACTION_STEALTH                : 1,
	ACTION_SELECT                 : 2,
	ACTION_OPEN_IN_CURRENT        : 4,
	ACTION_OPEN_IN_WINDOW         : 8,
	ACTION_OPEN_IN_TAB            : 16,
	ACTION_OPEN_IN_BACKGROUND_TAB : 32,
	ACTION_COPY                   : 1024,

	kDOMAIN_MULTIBYTE : (1 << 0),
	kDOMAIN_LAZY      : (1 << 1),
	kDOMAIN_IDN       : (1 << 2),
 
	kDomainSeparators          : '\\.', 
	kMultibyteDomainSeparators : '\\.\uff0e',
	kIDNDomainSeparators       : '\\.\u3002\uff0e',

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

	kLoginPattern : '(?:[^\\s\u3000/:]+(?::[^\\s\u3000/@]+)?@)?',
	kLoginPatternMultibyte : '(?:[^\\s\u3000/:\uff0f\uff1a]+(?:[:\uff1a][^\\s\u3000@/\uff0f\uff20]+)?[@\uff20])?',

	kURIPattern_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#]+',
	kURIPatternMultibyte_part : '[-_\\.!~*\'()a-z0-9;/?:@&=+$,%#\u301c\uff0d\uff3f\uff0e\uff01\uff5e\uffe3\uff0a\u2019\uff08\uff09\uff41-\uff5a\uff21-\uff3a\uff10-\uff19\uff1b\uff0f\uff1f\uff1a\uff20\uff06\uff1d\uff0b\uff04\uff0c\uff05\uff03]+',
 
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

	kCONFIG_VERSION : 2,

	COMMAND_REQUEST_SELECTION_SUMMARY        : 'request-selection-summary',
	COMMAND_REPORT_SELECTION_SUMMARY         : 'report-selection-summary',
	COMMAND_REQUEST_CANCEL_SELECTION_SUMMARY : 'request-cancel-selection-summary',

	COMMAND_REQUEST_SELECTION_URIS           : 'request-selection-uris',
	COMMAND_REPORT_SELECTION_URIS            : 'report-selection-uris',
	COMMAND_REPORT_SELECTION_URIS_PROGRESS   : 'report-selection-uris-progress',
	COMMAND_REQUEST_CANCEL_SELECTION_URIS    : 'request-cancel-selection-uris',

	COMMAND_REQUEST_CURRENT_URI              : 'request-current-uri',

	COMMAND_OPEN_URI_WITH_ACTION : 'open-uri-with-action',
	COMMAND_LOAD_URI             : 'load-uri'
};
