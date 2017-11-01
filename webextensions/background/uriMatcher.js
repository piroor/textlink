/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

var URIMatcher = { 
  matchSingle: async function(aParams) {
    log('matchSingle: ', aParams);
    this._updateURIRegExp();
    var match = aParams.text.match(this._URIMatchingRegExp);
    log('String.match: ', match);
    if (!match)
      return null;
    match = [...match].filter(aMaybeURI => (
      (!this.hasLoadableScheme(aMaybeURI) &&
       !this.URIExceptionPattern_all.test(aMaybeURI)) ||
      this.isHeadOfNewURI(aMaybeURI)
    ));
    if (match.length <= 0)
      return null;

    for (let maybeURI of match) {
      maybeURI = this.sanitizeURIString(maybeURI);
      let range = await this.findTextRange({
        text:   maybeURI,
        cursor: aParams.cursor,
        tabId:  aParams.tabId
      });
      if (!range)
        continue;
      return {
        text:  maybeURI,
        range: range,
        uri:   this.fixupURI(maybeURI, aParams.baseURI)
      };
    }
    log(' => no match');
    return null;
  },

  matchAll: async function(aParams) {
    log('matchAll: ', aParams);
    this._updateURIRegExp();
    var match = aParams.text.match(this._URIMatchingRegExp);
    log('String.match: ', match);
    if (!match)
      return [];
    match = [...match].filter(aMaybeURI => (
      (!this.hasLoadableScheme(aMaybeURI) &&
       !this.URIExceptionPattern_all.test(aMaybeURI)) ||
      this.isHeadOfNewURI(aMaybeURI)
    ));
    var results = [];
    if (match.length > 0) {
      let maybeURIs = Array.slice(match, 0).map(aMaybeURI => this.sanitizeURIString(aMaybeURI));
      for (let range of aParams.ranges) {
        for (let maybeURI of maybeURIs) {
          let ranges = await this.findAllTextRanges({
            text:  maybeURI,
            range: range,
            tabId: aParams.tabId
          });
          if (ranges.length == 0)
            continue;
          let uri = this.fixupURI(maybeURI, aParams.baseURI);
          results = results.concat(ranges.map(aRange => {
            return {
              text:  maybeURI,
              range: aRange,
              uri:   uri
            };
          }));
          await wait(0);
        }
        await wait(0);
      }
    }
    results.sort((aA, aB) =>
                   aA.range.startTextNodePos - aB.range.startTextNodePos ||
                   aA.range.startOffset - aB.range.startOffset);
    var uris = {};
    results = results.filter(aRange => {
      if (aRange.uri in uris)
        return false;
      uris[aRange.uri] = true;
      return true;
    });
    log(' => ', results);
    return results;
  },

  findTextRange: async function(aParams) {
    var match = await browser.find.find(aParams.text, {
      tabId:            aParams.tabId,
      caseSensitive:    true,
      includeRangeData: true
    });
    for (let rangeData of match.rangeData) {
      if (rangeData.framePos != aParams.cursor.framePos ||
          rangeData.startTextNodePos > aParams.cursor.startTextNodePos ||
          (rangeData.startTextNodePos == aParams.cursor.startTextNodePos &&
           rangeData.startOffset > aParams.cursor.startOffset) ||
          rangeData.endTextNodePos < aParams.cursor.endTextNodePos ||
          (rangeData.endTextNodePos == aParams.cursor.endTextNodePos &&
           rangeData.endOffset < aParams.cursor.endOffset))
        continue;
      return rangeData;
    }
    return null;
  },

  findAllTextRanges: async function(aParams) {
    var match = await browser.find.find(aParams.text, {
      tabId:            aParams.tabId,
      caseSensitive:    true,
      includeRangeData: true
    });
    return match.rangeData.filter(aRangeData => !(
      aRangeData.framePos != aParams.range.framePos ||
      aRangeData.startTextNodePos > aParams.range.endTextNodePos ||
      (aRangeData.startTextNodePos == aParams.range.endTextNodePos &&
       aRangeData.startOffset > aParams.range.endOffset) ||
      aRangeData.endTextNodePos < aParams.range.startTextNodePos ||
      (aRangeData.endTextNodePos == aParams.range.startTextNodePos &&
       aRangeData.endOffset < aParams.range.startOffset)
    ));
  },

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

  get scheme() {
    return this._scheme;
  },
  set scheme(aValue) {
    this._scheme = aValue || configs.scheme;
    this._schemes = this.niceSplit(this.expandWildcardsToRegExp(this.scheme));
    this.IDNScheme = this.IDNScheme; // reset IDN-enabled schemes list
    this.invalidatePatterns();
    return aValue;
  },
  _scheme : '',
  get schemes() {
    return this._schemes.concat(this._fixupSchemes).sort();
  },
  _schemes : [],
  _fixupSchemes : [],

  set IDNScheme(aValue) {
    this._IDNScheme = aValue || configs.IDNScheme;
    this._IDNSchemes = this.niceSplit(this.expandWildcardsToRegExp(this._IDNScheme))
      .filter(function(aScheme) {
        return this.schemes.indexOf(aScheme) > -1;
      }, this);
    this.invalidatePatterns();
    return aValue;
  },
  get IDNScheme() {
    return this._IDNScheme;
  },
  _IDNScheme : '',
  get IDNSchemes() {
    if (configs.IDNEnabled) {
      if (this._fixupIDNSchemes === null) {
        this._fixupIDNSchemes = [];
        for (let i in this._fixupTargetsHash) {
          if (!this._fixupTargetsHash.hasOwnProperty(i))
            continue;
          let fixUpToMatch = this._fixupTargetsHash[i].match(/^(\w+):/);
          let fixUpFromMatch = i.match(/^(\w+):/);
          if (fixUpToMatch &&
              this._IDNSchemes.indexOf(fixUpToMatch[1]) > -1 &&
              fixUpFromMatch)
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

  get nonIDNSchemes() {
    if (configs.IDNEnabled) {
      if (this._nonIDNSchemes === null) {
        let IDNSchemes = this.IDNSchemes;
        this._nonIDNSchemes = this.schemes
          .filter(aScheme => IDNSchemes.indexOf(aScheme) < 0);
      }
      return this._nonIDNSchemes;
    }
    else {
      return this.schemes;
    }
  },
  _nonIDNSchemes : null,

  get schemeFixupTable() {
    return this._schemeFixupTable;
  },
  set schemeFixupTable(aValue) {
    this._schemeFixupTable = aValue || configs.schemeFixupTable;

    this._fixupTable = this._schemeFixupTable
      .replace(/(\s*[^:,\s]+)\s*=>\s*([^:,\s]+)(\s*([,\| \n\r\t]|$))/g, '$1:=>$2:$3');

    this._fixupTargets     = [];
    this._fixupTargetsHash = {};
    this._fixupSchemes     = [];
    this.niceSplit(this.expandWildcardsToRegExp(this._fixupTable))
      .forEach(aTarget => {
        let [fixUpFrom, fixUpTo] = aTarget.split(/\s*=>\s*/);
        if (!fixUpFrom || !fixUpTo)
          return;
        this._fixupTargetsHash[fixUpFrom] = fixUpTo;
        this._fixupTargets.push(fixUpFrom);
        let match = fixUpFrom.match(/^(\w+):/);
        if (match)
          this._fixupSchemes.push(match[1]);
      });

    this._fixupTargets.sort().forEach(aTarget => {
      this._fixupTargetsHash[aTarget] = this._fixupTargetsHash[aTarget];
    });
    this._fixupSchemes.sort();

    this._fixupTargetsPattern = this._fixupTargets.join('|');
    this._fixupTargetsRegExp = new RegExp(`^(${this._fixupTargetsPattern})`);

    this.invalidatePatterns();
    return aValue;
  },
  _schemeFixupTable : '',

 
  // regexp 
  
  get URIPattern() {
    if (!this._URIPattern) {
      let patterns = [];
      let base = this.URIPattern_base
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
          `(?:${this.nonIDNSchemes.join('|')}):`
        )
        .replace(
          /%POSSIBLE_DOMAIN_PATTERN%/g,
          this.getDomainPattern(kDOMAIN_LAZY)
        )
        .replace(
          /%DOMAIN_PATTERN%/g,
          this.getDomainPattern()
        ));
      if (configs.IDNEnabled)
        patterns.push(base
          .replace(
            /%SCHEME_PATTERN%/g,
            `(?:${this.IDNSchemes.join('|')}):`
          )
          .replace(
            /%POSSIBLE_DOMAIN_PATTERN%/g,
            this.getDomainPattern(kDOMAIN_LAZY | kDOMAIN_IDN)
          )
          .replace(
            /%DOMAIN_PATTERN%/g,
            this.getDomainPattern(kDOMAIN_IDN)
          ));
      this._URIPattern = this.URIPatterns_base.replace(/%URI_PATTERN%/g, patterns.join('|'));
    }

    return this._URIPattern;
  },
  _URIPattern : null,
 
  get URIPatternRelative() {
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
 
  get URIPatternMultibyte() {
    if (!this._URIPatternMultibyte) {
      let patterns = [];
      let base = this.URIPatternMultibyte_base
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
                  return `${aScheme}|${this.convertHalfWidthToFullWidth(aScheme)}`;
                }, this).join('|')+
                ')[:\uff1a]'
        )
        .replace(
          /%POSSIBLE_DOMAIN_PATTERN%/g,
          this.getDomainPattern(kDOMAIN_MULTIBYTE | kDOMAIN_LAZY)
        )
        .replace(
          /%DOMAIN_PATTERN%/g,
          this.getDomainPattern(kDOMAIN_MULTIBYTE)
        ));
      if (configs.IDNEnabled)
        patterns.push(base
          .replace(
            /%SCHEME_PATTERN%/g,
            '(?:'+
                  this.IDNSchemes.map(function(aScheme) {
                    return `${aScheme}|${this.convertHalfWidthToFullWidth(aScheme)}`;
                  }, this).join('|')+
                  ')[:\uff1a]'
          )
          .replace(
            /%POSSIBLE_DOMAIN_PATTERN%/g,
            this.getDomainPattern(kDOMAIN_MULTIBYTE | kDOMAIN_LAZY | kDOMAIN_IDN)
          )
          .replace(
            /%DOMAIN_PATTERN%/g,
            this.getDomainPattern(kDOMAIN_MULTIBYTE | kDOMAIN_IDN)
          ));
      this._URIPatternMultibyte = this.URIPatternsMultibyte_base.replace(/%URI_PATTERN%/g, patterns.join('|'));
    }

    return this._URIPatternMultibyte;
  },
  _URIPatternMultibyte : null,
 
  get URIPatternMultibyteRelative() {
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
 
  getDomainPattern(aOptionsFlag) {
    aOptionsFlag = aOptionsFlag || 0;
    var pattern = this._domainPatterns[aOptionsFlag];
    if (!pattern) {
      if (aOptionsFlag & kDOMAIN_IDN) {
        let forbiddenCharacters = this.kStringprepForbiddenCharacters+
                      this.kIDNDomainSeparators+
                      ':/@\uff1a\uff0f\uff20';
        if (!(aOptionsFlag & kDOMAIN_LAZY))
          forbiddenCharacters += configs.IDNLazyDetectionSeparators;
        let part = '[^'+
              forbiddenCharacters+
              (configs.IDNBlacklistChars || '')
                .replace(new RegExp(`[${forbiddenCharacters}]`, 'g'), '')
                .replace(/(.)\1+/g, '$1')
                .replace(/./g, function(aChar) {
                  var code = `00${aChar.charCodeAt(0).toString(16)}`.substr(-4, 4);
                  return `\\u${code}`;
                })+
              ']+';
        pattern = `${part}(?:[${this.kIDNDomainSeparators}]${part})*`;
      }
      else if (aOptionsFlag & kDOMAIN_MULTIBYTE) {
        let part = '[0-9a-z-\uff10-\uff19\uff41-\uff5a\uff21-\uff3a\uff0d]+';
        pattern = `${part}(?:[${this.kMultibyteDomainSeparators}]${part})*`;
      }
      else {
        let part = '[0-9a-z-]+';
        pattern = `${part}(?:${this.kDomainSeparators + part})*`;
      }

      if (!(aOptionsFlag & kDOMAIN_LAZY) ||
          aOptionsFlag & kDOMAIN_IDN)
        pattern += this.getTLDPattern(aOptionsFlag);

      if (aOptionsFlag & kDOMAIN_IDN ||
          aOptionsFlag & kDOMAIN_MULTIBYTE) {
        pattern += '(?:[:\uff1a][0-9\uff10-\uff19]+)?';
      }
      else {
        pattern += '(?::[0-9]+)?';
      }

      this._domainPatterns[aOptionsFlag] = pattern;
    }
    return pattern;
  },
  _domainPatterns : {},
 
  getTLDPattern(aOptionsFlag) {
    var TLD = this.topLevelDomains;
    var halfWidthTLDPattern = `(?:${TLD.join('|')})\\b`;
    var TLDPattern = aOptionsFlag & kDOMAIN_MULTIBYTE || aOptionsFlag & kDOMAIN_IDN ?
      `(?:${
        [halfWidthTLDPattern]
          .concat(TLD.map(this.convertHalfWidthToFullWidth, this))
          .join('|')
      })` :
      halfWidthTLDPattern ;
    return (aOptionsFlag & kDOMAIN_IDN ?
      `[${this.kIDNDomainSeparators}]` :
      aOptionsFlag & kDOMAIN_MULTIBYTE ?
        `[${this.kMultibyteDomainSeparators}]` :
        this.kDomainSeparators
    ) + TLDPattern;
  },
 
  get URIPattern_part() {
    if (!this._URIPattern_part) {
      this._URIPattern_part = configs.i18nPathEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPattern_part ;
    }
    return this._URIPattern_part;
  },
  _URIPattern_part : null,
  get URIPatternMultibyte_part() {
    if (!this._URIPatternMultibyte_part) {
      this._URIPatternMultibyte_part = configs.i18nPathEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPatternMultibyte_part ;
    }
    return this._URIPatternMultibyte_part;
  },
  _URIPatternMultibyte_part : null,
 
  get findURIPatternPart() {
    if (!this._findURIPatternPart) {
      this._findURIPatternPart = configs.i18nPathEnabled || configs.IDNEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPattern_part ;
    }
    return this._findURIPatternPart;
  },
  _findURIPatternPart : null,
  get findURIPatternMultibytePart() {
    if (!this._findURIPatternMultibytePart) {
      this._findURIPatternMultibytePart = configs.i18nPathEnabled || configs.IDNEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPatternMultibyte_part ;
    }
    return this._findURIPatternMultibytePart;
  },
  _findURIPatternMultibytePart : null,
 
  get topLevelDomains() {
    if (!this._topLevelDomains) {
      let TLD = [
        configs.gTLD,
        configs.ccTLD,
        configs.extraTLD
      ];
      if (configs.IDNEnabled)
        TLD.push(configs.IDN_TLD);
      this._topLevelDomains = this.cleanUpArray(TLD.join(' ').replace(/^\s+|\s+$/g, '').split(/\s+/))
        .reverse(); // this is required to match "com" instead of "co".
    }
    return this._topLevelDomains;
  },
  _topLevelDomains : null,
 
  get URIExceptionPattern() {
    if (!this._URIExceptionPattern)
      this._updateURIExceptionPattern();
    return this._URIExceptionPattern;
  },
  get URIExceptionPattern_start() {
    if (!this._URIExceptionPattern_start)
      this._updateURIExceptionPattern();
    return this._URIExceptionPattern_start;
  },
  get URIExceptionPattern_end() {
    if (!this._URIExceptionPattern_end)
      this._updateURIExceptionPattern();
    return this._URIExceptionPattern_end;
  },
  get URIExceptionPattern_all() {
    if (!this._URIExceptionPattern_all)
      this._updateURIExceptionPattern();
    return this._URIExceptionPattern_all;
  },
  _updateURIExceptionPattern() {
    try {
      var whole = `^(?:${configs.partExceptionWhole})$`;
      var start = `^(?:${configs.partExceptionStart})`;
      var end = `(?:${configs.partExceptionEnd})$`;
      this._URIExceptionPattern = new RegExp(whole, 'i');
      this._URIExceptionPattern_start = new RegExp(start, 'i');
      this._URIExceptionPattern_end = new RegExp(end, 'i');
      this._URIExceptionPattern_all = new RegExp(`${whole}|${start}|${end}`, 'i');
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
 
  invalidatePatterns() {
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
 
  invalidateExceptionPatterns() {
    this._URIExceptionPattern = null;
    this._URIExceptionPattern_start = null;
    this._URIExceptionPattern_end = null;
    this._URIExceptionPattern_all = null;
  },
  
  cleanUpArray(aArray) {
    return aArray.slice(0)
      .sort()
      .join('\n')
      .replace(/^(.+)$\n(\1\n)+/gm, '$1\n')
      .split('\n');
  },
  
  // string operations 
  
  // from http://taken.s101.xrea.com/blog/article.php?id=510
  convertFullWidthToHalfWidth(aString) {
    return aString.replace(this.fullWidthRegExp, this.f2h)
      .replace(/\u301c/g, '~'); // another version of tilde
  },
  fullWidthRegExp : /[\uFF01\uFF02\uFF03\uFF04\uFF05\uFF06\uFF07\uFF08\uFF09\uFF0A\uFF0B\uFF0C\uFF0D\uFF0E\uFF0F\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19\uFF1A\uFF1B\uFF1C\uFF1D\uFF1E\uFF1F\uFF20\uFF21\uFF22\uFF23\uFF24\uFF25\uFF26\uFF27\uFF28\uFF29\uFF2A\uFF2B\uFF2C\uFF2D\uFF2E\uFF2F\uFF30\uFF31\uFF32\uFF33\uFF34\uFF35\uFF36\uFF37\uFF38\uFF39\uFF3A\uFF3B\uFF3C\uFF3D\uFF3E\uFF3F\uFF40\uFF41\uFF42\uFF43\uFF44\uFF45\uFF46\uFF47\uFF48\uFF49\uFF4A\uFF4B\uFF4C\uFF4D\uFF4E\uFF4F\uFF50\uFF51\uFF52\uFF53\uFF54\uFF55\uFF56\uFF57\uFF58\uFF59\uFF5A\uFF5B\uFF5C\uFF5D\uFF5E]/g,
  f2h(aChar) {
    var code = aChar.charCodeAt(0);
    code &= 0x007F;
    code += 0x0020;
    return String.fromCharCode(code);
  },

  convertHalfWidthToFullWidth(aString) {
    return aString.replace(this.halfWidthRegExp, this.h2f);
  },
  halfWidthRegExp : /[!"#$%&'\(\)\*\+,-\.\/0123456789:;<=>\?@ABCDEFGHIJKLMNOPQRSTUVWXYZ\[\\\]\^_`abcdefghijklmnopqrstuvwxyz\{\|\}~]/g,
  h2f(aChar) {
    var code = aChar.charCodeAt(0);
    code += 0xFF00;
    code -= 0x0020;
    return String.fromCharCode(code);
  },
 
  expandWildcardsToRegExp(aInput)  {
    return String(aInput)
      .replace(/([\(\)\+\.\{\}])/g, '\\$1')
      .replace(/\?/g, '.')
      .replace(/\*/g, '.+');
  },
 
  niceSplit(aInput) {
    return String(aInput)
      .split(/[\s\|,]+/)
      .filter(aItem => !!aItem);
  },

  isHeadOfNewURI(aString) {
    this._updateURIRegExp();
    var match = aString.match(this._URIMatchingRegExp_fromHead);
    match = match ? match[1] : '' ;
    return this.hasLoadableScheme(match) ? match == aString : false ;
  },
  _URIMatchingRegExp : null,
  _URIMatchingRegExp_fromHead : null,
  _updateURIRegExp() {
    if (this._URIMatchingRegExp)
      return;
    var regexp = [];
    if (configs.multibyteEnabled) {
      this._URIMatchingRegExp_fromHead = new RegExp(this.URIPatternMultibyte, 'i');
      regexp.push(this.URIPatternMultibyte);
      if (configs.relativeEnabled)
        regexp.push(this.URIPatternMultibyteRelative);
    }
    else {
      this._URIMatchingRegExp_fromHead = new RegExp(this.URIPattern, 'i');
      regexp.push(this.URIPattern);
      if (configs.relativeEnabled)
        regexp.push(this.URIPatternRelative);
    }
    this._URIMatchingRegExp = new RegExp(regexp.join('|'), 'ig');
  },
 
  getURIPartFromStart(aString, aExcludeURIHead) {
    this._updateURIPartFinderRegExp();
    var match = aString.match(this._URIPartFinderRegExp_start);
    var part = match ? match[1] : '' ;
    return (!aExcludeURIHead || !this.isHeadOfNewURI(part)) ? part : '' ;
  },
  getURIPartFromEnd(aString) {
    this._updateURIPartFinderRegExp();
    var match = aString.match(this._URIPartFinderRegExp_end);
    return match ? match[1] : '' ;
  },
  _URIPartFinderRegExp_start : null,
  _URIPartFinderRegExp_end : null,
  _updateURIPartFinderRegExp() {
    if (this._URIPartFinderRegExp_start && this._URIPartFinderRegExp_end)
      return;

    var base = configs.multibyteEnabled ?
      this.findURIPatternMultibytePart :
      this.findURIPatternPart ;
    this._URIPartFinderRegExp_start = new RegExp(`^(${base})`, 'i');
    this._URIPartFinderRegExp_end   = new RegExp(`(${base})$`, 'i');
  },
 
  hasLoadableScheme(aURI)  {
    if (!this._schemeRegExp)
      this._schemeRegExp = new RegExp(`^(${this.schemes.join('|')}):`, 'i');
    return this._schemeRegExp.test(this.convertFullWidthToHalfWidth(aURI));
  },
  _schemeRegExp : null,
 
  hasScheme(aInput) {
    return this._firstSchemeRegExp.test(aInput);
  },
  removeScheme(aInput) {
    return aInput.replace(this._firstSchemeRegExp, '');
  },
  get _firstSchemeRegExp() {
    if (!this.__firstSchemeRegExp)
      this.__firstSchemeRegExp = new RegExp(`^${this.kSchemePatternMultibyte}`, 'i');
    return this.__firstSchemeRegExp;
  },
  __firstSchemeRegExp : null,
 
  fixupURI(aURIComponent, aBaseURI) {
    log('fixupURI: ', aURIComponent, aBaseURI);
    if (configs.multibyteEnabled)
      aURIComponent = this.convertFullWidthToHalfWidth(aURIComponent);

    aURIComponent = this.sanitizeURIString(aURIComponent);
    if (!aURIComponent) {
      log(' => not a URI');
      return null;
    }

    aURIComponent = this.fixupScheme(aURIComponent);

    if (configs.relativeEnabled)
      aURIComponent = this.makeURIComplete(aURIComponent, aBaseURI);

    var result = this.hasLoadableScheme(aURIComponent) ? aURIComponent : null ;
    log(' => ', result);
    return result;
  },
  
  sanitizeURIString(aURIComponent) {
    log('sanitizeURIString ', aURIComponent);
    // escape patterns like program codes like JavaScript etc.
    if (!this._topLevelDomainsRegExp) {
      this._topLevelDomainsRegExp = new RegExp(`^(${this.topLevelDomains.join('|')})$`);
    }
    if (configs.relativeEnabled) {
      if ((aURIComponent.match(/^([^\/\.]+\.)+([^\/\.]+)$/) &&
           !RegExp.$2.match(this._topLevelDomainsRegExp)) ||
          aURIComponent.match(/(\(\)|\([^\/]+\)|[;\.,])$/))
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
      (!configs.relativeEnabled &&
       aURIComponent.match(/^[\.\/:](.+)$/))
    ) {
      aURIComponent = RegExp.$1;
    }

    aURIComponent = this.removeParen(aURIComponent);

    if (configs.IDNEnabled || configs.i18nPathEnabled)
      aURIComponent = aURIComponent.replace(this.kStringprepReplaceToNothingRegExp, '');

    log(' => ', aURIComponent);
    return aURIComponent; // aURIComponent.replace(/^.*\((.+)\).*$/, '$1');
  },
  _topLevelDomainsRegExp : null,
 
  removeParen(aInput) {
    log('removeParen: ', aInput);
    var doRemoveParen = (aRegExp) => {
      let match = aInput.match(aRegExp);
      if (!match)
        return false;
      aInput = match[1];
      return true;
    };
    while (this._parenPatterns.some(doRemoveParen)) {}
    log(' => ', aInput);
    return aInput;
  },
 
  fixupScheme(aURI) {
    log('fixupScheme: ', aURI);
    var match = aURI.match(this._fixupTargetsRegExp);
    if (match) {
      let target = match[1];
      let table = this._fixupTable;
      for (let pattern of this.niceSplit(this._fixupTargetsPattern, '|')) {
        if (new RegExp(pattern).test(target))
          table = table.replace(new RegExp(`\\b${pattern}\\s*=>`), `${target}=>`);
      }
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
      let scheme = configs.schemeFixupDefault;
      if (scheme)
        aURI = `${scheme}://${aURI}`;
    }

    log(' => ', aURI);
    return aURI;
  },
  _fixupTable : '',
  _fixupTargets : [],
  _fixupTargetsHash : {},
  _fixupTargetsPattern : '',
  _fixupTargetsRegExp : '',
 
  // 相対パスの解決 
  makeURIComplete(aURI, aSourceURI) {
    if (aURI.match(/^(urn|mailto):/i))
      return aURI;

    if (aURI.match(/^([^\/\.]+\.)+([^\/\.]+)/) &&
        RegExp.$2.match(new RegExp(`^(${this.topLevelDomains.join('|')})$`))) {
      return `${configs.schemeFixupDefault}://${aURI}`;
    }
    var base = aSourceURI.split('#')[0].split('?')[0].replace(/[^\/]+$/, '');
    return `${base}${aURI}`;
  },
   
  onConfigChanged(aKey) {
    switch (aKey) {
      case 'scheme':
        this.scheme = null;
        return;

      case 'schemeFixupTable':
        this.schemeFixupTable = null;
        return;

      case 'IDNScheme':
        this.IDNScheme = null;
        return;

      case 'relativeEnabled':
      case 'IDNEnabled':
      case 'i18nPathEnabled':
      case 'gTLD':
      case 'ccTLD':
      case 'IDN_TLD':
      case 'extraTLD':
      case 'IDNBlacklistChars':
      case 'multibyteEnabled':
        this.invalidatePatterns();
        return;

      case 'partExceptionWhole':
      case 'partExceptionStart':
      case 'partExceptionEnd':
        this.invalidateExceptionPatterns();
        return;
    }
  }
 
};
configs.$loaded.then(() => {
  URIMatcher.scheme =
    URIMatcher.schemeFixupTable =
      URIMatcher.IDNScheme = null;
});
