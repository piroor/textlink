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
    var match = this.matchMaybeURIs(aParams.text);
    if (match.length == 0)
      return null;

    for (let maybeURI of match) {
      maybeURI = this.sanitizeURIString(maybeURI);
      let uriRange = await this.findTextRange({
        text:  maybeURI,
        range: aParams.cursor,
        tabId: aParams.tabId
      });
      if (!uriRange)
        continue;
      return {
        text:  maybeURI,
        range: uriRange,
        uri:   this.fixupURI(maybeURI, aParams.baseURI)
      };
    }
    log(' => no match');
    return null;
  },

  matchAll: async function(aParams) {
    log('matchAll: ', aParams);
    aParams.onProgress && aParams.onProgress(0);
    this._updateURIRegExp();
    var results = [];
    var startAt = Date.now();

    var maxCount = 0;
    var uniqueURIs = {};
    for (let range of aParams.ranges) {
      let match = this.matchMaybeURIs(range.text);
      if (match.length == 0) {
        range.maybeURIs = [];
        continue;
      }

      let maybeURIs = Array.slice(match, 0).map(aMaybeURI => this.sanitizeURIString(aMaybeURI));
      range.maybeURIs = [];
      for (let maybeURI of maybeURIs) {
        let uri = this.fixupURI(maybeURI, aParams.baseURI);
        if (uri in uniqueURIs)
          continue;
        uniqueURIs[uri] = true;
        range.maybeURIs.push({
          original: maybeURI,
          uri:      uri
        });
      }
      maxCount += range.maybeURIs.length;
    }

    var count = 0;
    for (let range of aParams.ranges) {
      for (let maybeURI of range.maybeURIs) {
        let uriRange = await this.findTextRange({
          text:  maybeURI.original,
          range: range,
          tabId: aParams.tabId
        });
        if (uriRange) {
          results.push({
            text:  maybeURI.original,
            range: uriRange,
            uri:   maybeURI.uri
          });
        }
        count++;
        if (Date.now() - startAt > 250)
          aParams.onProgress && aParams.onProgress(count / maxCount);
        if (count % 100 == 0)
          await wait(0);
      }
    }
    aParams.onProgress && aParams.onProgress(1);
    results.sort((aA, aB) =>
      aA.range.startTextNodePos - aB.range.startTextNodePos ||
      aA.range.startOffset - aB.range.startOffset);
    log(' => ', results);
    return results;
  },

  matchMaybeURIs(aText) {
    let match = aText.match(this._URIMatchingRegExp);
    if (!match)
      return [];
    match = [...match].filter(aMaybeURI => (
      (!this.hasLoadableScheme(aMaybeURI) &&
       !this.URIExceptionPattern_all.test(aMaybeURI)) ||
      this.isHeadOfNewURI(aMaybeURI)
    ));
    if (match.length == 0)
      return [];
    return match;
  },

  findTextRange: async function(aParams) {
    if (!('startTextNodePos' in aParams.range) ||
        !('endTextNodePos' in aParams.range)) {
      // text, fake range
      let wholeText = aParams.range.text;
      let length    = aParams.text.length;
      let startAt   = 0;
      while (true) {
        let index = wholeText.indexOf(aParams.text, startAt);
        startAt = index + length;
        if (index < 0)
          return null;
        if (index > aParams.range.endOffset ||
            index + length < aParams.range.startOffset)
          continue;
        return {
          startOffset: index,
          endOffset:   index + length,
          text:        aParams.text
        };
      }
      return null;
    }

    // real range
    var match = await browser.find.find(aParams.text, {
      tabId:            aParams.tabId,
      caseSensitive:    true,
      includeRangeData: true
    });
    for (let rangeData of match.rangeData) {
      if (rangeData.framePos != aParams.range.framePos ||
          rangeData.startTextNodePos > aParams.range.endTextNodePos ||
          (rangeData.startTextNodePos == aParams.range.endTextNodePos &&
           rangeData.startOffset > aParams.range.endOffset) ||
          rangeData.endTextNodePos < aParams.range.startTextNodePos ||
          (rangeData.endTextNodePos == aParams.range.startTextNodePos &&
           rangeData.endOffset < aParams.range.startOffset))
        continue;
      return rangeData;
    }
    return null;
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
    this._scheme = aValue;
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
    this._IDNScheme = aValue;
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
    if (this.configs.IDNEnabled) {
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
    if (this.configs.IDNEnabled) {
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
    this._schemeFixupTable = aValue;

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
      if (this.configs.IDNEnabled)
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
      if (this.configs.IDNEnabled)
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
          forbiddenCharacters += this.configs.IDNLazyDetectionSeparators;
        let part = '[^'+
              forbiddenCharacters+
              (this.configs.IDNBlacklistChars || '')
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
      this._URIPattern_part = this.configs.i18nPathEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPattern_part ;
    }
    return this._URIPattern_part;
  },
  _URIPattern_part : null,
  get URIPatternMultibyte_part() {
    if (!this._URIPatternMultibyte_part) {
      this._URIPatternMultibyte_part = this.configs.i18nPathEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPatternMultibyte_part ;
    }
    return this._URIPatternMultibyte_part;
  },
  _URIPatternMultibyte_part : null,
 
  get findURIPatternPart() {
    if (!this._findURIPatternPart) {
      this._findURIPatternPart = this.configs.i18nPathEnabled || this.configs.IDNEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPattern_part ;
    }
    return this._findURIPatternPart;
  },
  _findURIPatternPart : null,
  get findURIPatternMultibytePart() {
    if (!this._findURIPatternMultibytePart) {
      this._findURIPatternMultibytePart = this.configs.i18nPathEnabled || this.configs.IDNEnabled ?
        `[^${this.kStringprepForbiddenCharacters}]+` :
        this.kURIPatternMultibyte_part ;
    }
    return this._findURIPatternMultibytePart;
  },
  _findURIPatternMultibytePart : null,
 
  get topLevelDomains() {
    if (!this._topLevelDomains) {
      let TLD = [
        this.configs.gTLD,
        this.configs.ccTLD,
        this.configs.extraTLD
      ];
      if (this.configs.IDNEnabled)
        TLD.push(this.configs.IDN_TLD);
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
      var whole = `^(?:${this.configs.partExceptionWhole})$`;
      var start = `^(?:${this.configs.partExceptionStart})`;
      var end = `(?:${this.configs.partExceptionEnd})$`;
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
    if (this.configs.multibyteEnabled) {
      this._URIMatchingRegExp_fromHead = new RegExp(this.URIPatternMultibyte, 'i');
      regexp.push(this.URIPatternMultibyte);
      if (this.configs.relativeEnabled)
        regexp.push(this.URIPatternMultibyteRelative);
    }
    else {
      this._URIMatchingRegExp_fromHead = new RegExp(this.URIPattern, 'i');
      regexp.push(this.URIPattern);
      if (this.configs.relativeEnabled)
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

    var base = this.configs.multibyteEnabled ?
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
    var originalURIComponent = aURIComponent;
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
    if (result != originalURIComponent)
      log(`fixupURI: ${originalURIComponent} => ${result}`);
    return result;
  },
  
  sanitizeURIString(aURIComponent) {
    var originalURIComponent = aURIComponent;
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
      (!this.configs.relativeEnabled &&
       aURIComponent.match(/^[\.\/:](.+)$/))
    ) {
      aURIComponent = RegExp.$1;
    }

    aURIComponent = this.removeParen(aURIComponent);

    if (this.configs.IDNEnabled || this.configs.i18nPathEnabled)
      aURIComponent = aURIComponent.replace(this.kStringprepReplaceToNothingRegExp, '');

    if (aURIComponent != originalURIComponent)
      log(`sanitizeURIString: ${originalURIComponent} => ${aURIComponent}`);
    return aURIComponent; // aURIComponent.replace(/^.*\((.+)\).*$/, '$1');
  },
  _topLevelDomainsRegExp : null,
 
  removeParen(aInput) {
    var originalInput = aInput;
    var doRemoveParen = (aRegExp) => {
      let match = aInput.match(aRegExp);
      if (!match)
        return false;
      aInput = match[1];
      return true;
    };
    while (this._parenPatterns.some(doRemoveParen)) {}
    if (aInput != originalInput)
      log(`removeParen: ${originalInput} => ${aInput}`);
    return aInput;
  },
 
  fixupScheme(aURI) {
    var originalURI = aURI;
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
      let scheme = this.configs.schemeFixupDefault;
      if (scheme)
        aURI = `${scheme}://${aURI}`;
    }

    if (aURI != originalURI)
      log(`fixupScheme: ${originalURI} => ${aURI}`);
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
      return `${this.configs.schemeFixupDefault}://${aURI}`;
    }
    var base = aSourceURI.split('#')[0].split('?')[0].replace(/[^\/]+$/, '');
    return `${base}${aURI}`;
  },
   
  onChangeConfig(aKey) {
    switch (aKey) {
      case 'scheme':
        this.scheme = this.configs[aKey];
        return;

      case 'schemeFixupTable':
        this.schemeFixupTable = this.configs[aKey];
        return;

      case 'IDNScheme':
        this.IDNScheme = this.configs[aKey];
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
  },

  init: async function(aConfigs) {
    log('URIMatcher init with configs ', aConfigs);
    if (aConfigs.$loaded)
      await aConfigs.$loaded;

    log('URIMatcher init: ready to init');
    this.configs = aConfigs;

    this.scheme           = aConfigs.scheme;
    this.schemeFixupTable = aConfigs.schemeFixupTable;
    this.IDNScheme        = aConfigs.IDNScheme;
    aConfigs.$addObserver(this);
  }
};
window.configs && URIMatcher.init(configs);
