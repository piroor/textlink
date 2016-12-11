utils.include('common.inc.js');

function setUp()
{
	sv = getNewUtils();
}

function tearDown()
{
}

const HALF_WIDTH = (1 << 0);
const FULL_WIDTH = (1 << 1);
const IDN        = (1 << 2);
const RELATIVE   = (1 << 3);

var halfWidthAbsoluteURISources = ['http://www.example.com/',
                                   'http://user@www.example.com/',
                                   'http://user:pass@www.example.com/'];
var fullWidthAbsoluteURISources = ['ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／',
                                   'ｈｔｔｐ：／／ｕｓｅｒ＠ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／',
                                   'ｈｔｔｐ：／／ｕｓｅｒ：ｐａｓｓ＠ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／'];
var IDNAbsoluteURISources       = ['http://日本語.jp/',
                                   'http://ユーザ@日本語.jp/',
                                   'http://ユーザ:パスワード@日本語.jp/'];
var halfWidthRelativeURISource  = '../directory/file';
var fullWidthRelativeURISource  = '．．／ｄｉｒｅｃｔｏｒｙ／ｆｉｌｅ';
var noURI                       = 'テキスト';

var halfWidthAbsoluteURIs = [
		halfWidthAbsoluteURISources.join('\n'),
		halfWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'~user/'; }).join('\n'),
		halfWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'?query1=value1&query2=value2'; }).join('\n'),
		halfWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'#hash'; }).join('\n'),
		'about:config',
		'chrome://browser/content/browser.xul',
		'data:text/plain,foobar'
	].join('\n').split('\n');
var fullWidthAbsoluteURIs = [
		fullWidthAbsoluteURISources.join('\n'),
		fullWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'\u301cｕｓｅｒ／'; }).join('\n'),
		fullWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'\uff5eｕｓｅｒ／'; }).join('\n'),
		fullWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２'; }).join('\n'),
		fullWidthAbsoluteURISources
			.map(function(aURI) { return aURI+'＃ｈａｓｈ'; }).join('\n'),
		'ａｂｏｕｔ：ｃｏｎｆｉｇ',
		'ｃｈｒｏｍｅ：／／ｂｒｏｗｓｅｒ／ｃｏｎｔｅｎｔ／ｂｒｏｗｓｅｒ．ｘｕｌ',
		'ｄａｔａ：ｔｅｘｔ／ｐｌａｉｎ，ｆｏｏｂａｒ'
	].join('\n').split('\n');
var IDNAbsoluteURIs = [
		IDNAbsoluteURISources.join('\n'),
		IDNAbsoluteURISources
			.map(function(aURI) { return aURI+'~user/'; }).join('\n'),
		IDNAbsoluteURISources
			.map(function(aURI) { return aURI+'?query1=value1&query2=value2'; }).join('\n'),
		IDNAbsoluteURISources
			.map(function(aURI) { return aURI+'#hash'; }).join('\n')
	].join('\n').split('\n');
var halfWidthRelativeURIs = [
		halfWidthRelativeURISource,
		halfWidthRelativeURISource+'~user/',
		halfWidthRelativeURISource+'?query1=value1&query2=value2',
		halfWidthRelativeURISource+'#hash'
	].join('\n').split('\n');
var fullWidthRelativeURIs = [
		fullWidthRelativeURISource,
		fullWidthRelativeURISource+'\u301cｕｓｅｒ／',
		fullWidthRelativeURISource+'\uff5eｕｓｅｒ／',
		fullWidthRelativeURISource+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２',
		fullWidthRelativeURISource+'＃ｈａｓｈ'
	].join('\n').split('\n');

function extractDomainPart(aURI)
{
	var domain = aURI
			.replace(/^[^:：]+[:：](?:[\/／][\/／])?|[\/／].*$/g, '') // remove scheme and path
			.replace(/^[^@＠]+[@＠]/, ''); // remove inline username and password
	return /[\.．]/.test(domain) ? domain : '' ; // ignore not-domain strings (like "blank" extracted from "about:blank")
}
function assertURIMatch(aString, aURIString, aShouldMatchToURI)
{
	var message = aString +'\n => '+aURIString;
	var match = sv.matchURIRegExp(aString);
	if (aShouldMatchToURI) {
		assert.isNotNull(match, message);
		assert.equals(1, match.length, message);
		assert.equals(aURIString, match[0], message);
	}
	else {
		assert.isNull(match, message);
	}
}

var matchURIRegExpParameters = {
	halfWidth         : HALF_WIDTH,
	fullWidth         : FULL_WIDTH,
	IDN               : IDN,
	halfWidthRelative : HALF_WIDTH | RELATIVE,
	fullWidthRelative : FULL_WIDTH | RELATIVE
};
var matchURIRegExpSetUp = function(aFlags) {
	sv.multibyteEnabled = !!(aFlags & FULL_WIDTH);
	sv.relativePathEnabled = !!(aFlags & RELATIVE);
	sv.IDNEnabled = !!(aFlags & IDN);
};

test_matchURIRegExp_noURI.parameters = matchURIRegExpParameters;
test_matchURIRegExp_noURI.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_noURI(aFlags)
{
	assertURIMatch(noURI, null, false);
}

test_matchURIRegExp_halfWidthAbsoluteURIs.parameters = matchURIRegExpParameters;
test_matchURIRegExp_halfWidthAbsoluteURIs.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_halfWidthAbsoluteURIs(aFlags)
{
	halfWidthAbsoluteURIs.forEach(function(aURI) {
		assertURIMatch(aURI, aURI, true);
		assertURIMatch('test '+aURI+' text', aURI, true);
		assertURIMatch('日本語'+aURI+'日本語', aURI, true);
	});
}

test_matchURIRegExp_fullWidthAbsoluteURIs.parameters = matchURIRegExpParameters;
test_matchURIRegExp_fullWidthAbsoluteURIs.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_fullWidthAbsoluteURIs(aFlags)
{
	fullWidthAbsoluteURIs.forEach(function(aURI) {
		// fullwidth URIs can be recognized as IDN, so, we accept the domain part extracted from the fullwidth URI.
		var matched = !(aFlags & FULL_WIDTH) && aFlags & IDN ?
						extractDomainPart(aURI) : aURI ;
		assertURIMatch(aURI, matched || aURI, aFlags & FULL_WIDTH || (aFlags & IDN && matched));
		assertURIMatch('test '+aURI+' text', matched || aURI, aFlags & FULL_WIDTH || (aFlags & IDN && matched));
		assertURIMatch('日本語'+aURI+'日本語', matched || aURI, aFlags & FULL_WIDTH || (aFlags & IDN && matched));
	});
}

test_matchURIRegExp_IDNAbsoluteURIs.parameters = matchURIRegExpParameters;
test_matchURIRegExp_IDNAbsoluteURIs.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_IDNAbsoluteURIs(aFlags)
{
	IDNAbsoluteURIs.forEach(function(aURI) {
		assertURIMatch(aURI, aURI, aFlags & IDN);
		assertURIMatch('test '+aURI+' text', aURI, aFlags & IDN);
		assertURIMatch('日本語'+aURI+'日本語', aURI, aFlags & IDN);
	});
}

test_matchURIRegExp_halfWidthRelativeURIs.parameters = matchURIRegExpParameters;
test_matchURIRegExp_halfWidthRelativeURIs.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_halfWidthRelativeURIs(aFlags)
{
	halfWidthRelativeURIs.forEach(function(aURI) {
		assertURIMatch(aURI, aURI, aFlags & RELATIVE);
		assertURIMatch('test '+aURI+' text', aURI, aFlags & RELATIVE);
		assertURIMatch('日本語'+aURI+'日本語', aURI, aFlags & RELATIVE);
	});
}

test_matchURIRegExp_fullWidthRelativeURIs.parameters = matchURIRegExpParameters;
test_matchURIRegExp_fullWidthRelativeURIs.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_fullWidthRelativeURIs(aFlags)
{
	fullWidthRelativeURIs.forEach(function(aURI) {
		assertURIMatch(aURI, aURI, aFlags & RELATIVE && aFlags & FULL_WIDTH);
		assertURIMatch('test '+aURI+' text', aURI, aFlags & RELATIVE && aFlags & FULL_WIDTH);
		assertURIMatch('日本語'+aURI+'日本語', aURI, aFlags & RELATIVE && aFlags & FULL_WIDTH);
	});
}

test_matchURIRegExp_multiline.parameters = matchURIRegExpParameters;
test_matchURIRegExp_multiline.setUp = matchURIRegExpSetUp;
function test_matchURIRegExp_multiline(aFlags)
{
	var expected = halfWidthAbsoluteURIs;
	if (aFlags & FULL_WIDTH)
		expected = expected.concat(fullWidthAbsoluteURIs);
	// fullwidth URIs can be recognized as IDNs, so, we add array of domain parts extracted from fullwidth URIs.
	if (aFlags & IDN)
		expected = expected.concat(fullWidthAbsoluteURIs
									.map(extractDomainPart)
									.filter(function(aDomain) { return aDomain; }));
	if (aFlags & RELATIVE)
		expected = expected.concat(halfWidthRelativeURIs);
	if (aFlags & FULL_WIDTH && aFlags & RELATIVE)
		expected = expected.concat(fullWidthRelativeURIs);
	if (aFlags & IDN)
		expected = expected.concat(IDNAbsoluteURIs);

	var uris = halfWidthAbsoluteURIs
				.concat(fullWidthAbsoluteURIs)
				.concat(halfWidthRelativeURIs)
				.concat(fullWidthRelativeURIs)
				.concat(IDNAbsoluteURIs);

	function assertMatchURIs(aExpected, aInput)
	{
		var match = sv.matchURIRegExp(aInput);
		assert.isNotNull(match);
		assert.equals(aExpected, [...match]);
	}

	assertMatchURIs(
		expected,
		uris.map(function(aURI) { return '日本語'+aURI+'日本語'; })
			.join('\n')
	);
	assertMatchURIs(
		expected,
		uris.map(function(aURI) { return '"'+aURI+'"'; })
			.join('\n')
	);
}

test_makeURIComplete.parameters = [
	{ path     : 'page2',
	  base     : 'http://www.example.com/page',
	  resolved : 'http://www.example.com/page2' },
	{ path     : 'directory/page2',
	  base     : 'http://www.example.com/page/',
	  resolved : 'http://www.example.com/page/directory/page2' },
	{ path     : '../directory/page2',
	  base     : 'http://www.example.com/page/',
	  resolved : 'http://www.example.com/directory/page2' },
	{ path     : './directory/page2',
	  base     : 'http://www.example.com/page/',
	  resolved : 'http://www.example.com/page/directory/page2' },
	{ path     : 'page2?query',
	  base     : 'http://www.example.com/page',
	  resolved : 'http://www.example.com/page2?query' },
	{ path     : 'page2',
	  base     : 'http://日本語.jp/page',
	  resolved : 'http://日本語.jp/page2' },
	{ path     : 'directory/page2',
	  base     : 'http://日本語.jp/page/',
	  resolved : 'http://日本語.jp/page/directory/page2' },
	{ path     : '../directory/page2',
	  base     : 'http://日本語.jp/page/',
	  resolved : 'http://日本語.jp/directory/page2' },
	{ path     : './directory/page2',
	  base     : 'http://日本語.jp/page/',
	  resolved : 'http://日本語.jp/page/directory/page2' },
	{ path     : 'page2?query',
	  base     : 'http://日本語.jp/page',
	  resolved : 'http://日本語.jp/page2?query' },
];
function test_makeURIComplete(aParameter)
{
	assert.equals(aParameter.resolved, sv.makeURIComplete(aParameter.path, aParameter.base));
}

test_fixupScheme.parameters = [
	{ input    : 'http://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'ftp://www.example.com/',
	  expected : 'ftp://www.example.com/' },
	{ input    : 'svn://www.example.com/',
	  expected : 'svn://www.example.com/' },
	{ input    : 'ttp://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'tp://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'p://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'h++p://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'h**p://www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'www.example.com/',
	  expected : 'http://www.example.com/' },
	{ input    : 'www2.example.com/',
	  expected : 'http://www2.example.com/' },
	{ input    : 'ftp.example.com/',
	  expected : 'ftp://ftp.example.com/' },
	{ input    : 'sub.example.com/',
	  expected : 'http://sub.example.com/' },
	{ input    : 'domain',
	  expected : 'http://domain' },
	{ input    : 'http://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'ftp://日本語.jp/',
	  expected : 'ftp://日本語.jp/' },
	{ input    : 'svn://日本語.jp/',
	  expected : 'svn://日本語.jp/' },
	{ input    : 'ttp://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'tp://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'p://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'h++p://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'h**p://日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : '日本語.jp/',
	  expected : 'http://日本語.jp/' },
	{ input    : 'www2.日本語.jp/',
	  expected : 'http://www2.日本語.jp/' },
	{ input    : 'ftp.日本語.jp/',
	  expected : 'ftp://ftp.日本語.jp/' },
	{ input    : 'sub.日本語.jp/',
	  expected : 'http://sub.日本語.jp/' },
];
function test_fixupScheme(aParameter)
{
	assert.equals(aParameter.expected, sv.fixupScheme(aParameter.input));
}

test_sanitizeURIString.parameters = utils.readParametersFromTSV('uri.sanitizeURIString.patterns.tsv');
function test_sanitizeURIString(aParameter)
{
	sv.relativePathEnabled = aParameter.relative;
	assert.equals(aParameter.sanitized, sv.sanitizeURIString(aParameter.input));
}

var parens = [
  ['(', ')'],
  ['(', '）'],
  ['（', ')'],
  ['（', '）'],
  ['｢', '｣'],
  ['｢', '」'],
  ['「', '｣'],
  ['「', '」'],
  ['[', ']'],
  ['[', '］'],
  ['［', ']'],
  ['［', '］'],
  ['『', '』'],
  ['《', '》'],
  ['〔', '〕'],
  ['【', '】'],
  ['〈', '〉'],
  ['<', '>'],
  ['<', '＞'],
  ['＜', '>'],
  ['＜', '＞'],
  ['"', '"'],
  ['〝', '〟'],
  ['“', '”'],
  ['”', '”'],
  ['“', '“'],
  ["'", "'"],
  ["'", "’"],
  ["’", "'"],
  ["‘", "'"],
  ['’', '’'],
  ['‘', '’']
];
var parenPatterns = [];
[
	{ relative : false, base : 'www.example.com' },
	{ relative : false, base : 'www.example.com/directory' },
	{ relative : true,  base : 'www.example.com/directory' },
	{ relative : false, base : '日本語.jp' },
	{ relative : false, base : '日本語.jp/directory' },
].forEach(function(aPattern) {
	parens.forEach(function(aParen) {
		parenPatterns.push({ relative  : aPattern.relative,
		                     input     : aParen[0] + aPattern.base + aParen[1],
		                     sanitized : aPattern.base });
		parenPatterns.push({ relative  : aPattern.relative,
		                     input     : aParen[0] + 'http://' + aPattern.base + '/' + aParen[1],
		                     sanitized : 'http://' + aPattern.base + '/' });
		parenPatterns.push({ relative  : aPattern.relative,
		                     input     : aParen[0] + 'http://' + aPattern.base + '/index.html' + aParen[1],
		                     sanitized : 'http://' + aPattern.base + '/index.html' });
	});
});
test_sanitizeURIString_paren.parameters = parenPatterns;
function test_sanitizeURIString_paren(aParameter)
{
	sv.relativePathEnabled = aParameter.relative;
	assert.equals(aParameter.sanitized, sv.sanitizeURIString(aParameter.input));
}

test_fixupURI.parameters = [
	{ input : 'http://www.example.com/',
	  fixed : 'http://www.example.com/' },
	{ input : 'http://www.example.com/index',
	  fixed : 'http://www.example.com/index' },
	{ input : 'http://www.example.com/index?query1=value1&query2=value2',
	  fixed : 'http://www.example.com/index?query1=value1&query2=value2' },
	{ input : 'http://www.example.com/index#hash',
	  fixed : 'http://www.example.com/index#hash' },
	{ input : 'www.example.com',
	  fixed : 'http://www.example.com' },
	{ input : '(www.example.com)',
	  fixed : 'http://www.example.com' },
	{ input : 'svn://www.example.com/' },
	{ input : 'http://日本語.jp/',
	  fixed : 'http://日本語.jp/' },
	{ input : 'http://日本語.jp/index',
	  fixed : 'http://日本語.jp/index' },
	{ input : 'http://日本語.jp/index?query1=value1&query2=value2',
	  fixed : 'http://日本語.jp/index?query1=value1&query2=value2' },
	{ input : 'http://日本語.jp/index#hash',
	  fixed : 'http://日本語.jp/index#hash' },
	{ input : '日本語.jp',
	  fixed : 'http://日本語.jp' },
	{ input : '(日本語.jp)',
	  fixed : 'http://日本語.jp' },
	{ input : 'svn://日本語.jp/' },
];
function test_fixupURI(aParameter)
{
	if (aParameter.fixed)
		assert.equals(aParameter.fixed, sv.fixupURI(aParameter.input));
	else
		assert.isNull(sv.fixupURI(aParameter.input));
}

var schemeParameters = [
	{ input   : 'http://www.example.com/',
	  has     : true,
	  removed : '//www.example.com/' },
	{ input   : 'ttp://www.example.com/',
	  has     : true,
	  removed : '//www.example.com/' },
	{ input   : 'URL:http://www.example.com/',
	  has     : true,
	  removed : 'http://www.example.com/' },
	{ input   : 'www.example.com/',
	  has     : false,
	  removed : 'www.example.com/' },
	{ input   : 'www.example.com?URL=http://www.example.com/',
	  has     : false,
	  removed : 'www.example.com?URL=http://www.example.com/' },
	{ input   : 'http://日本語.jp/',
	  has     : true,
	  removed : '//日本語.jp/' },
	{ input   : 'ttp://日本語.jp/',
	  has     : true,
	  removed : '//日本語.jp/' },
	{ input   : 'URL:http://日本語.jp/',
	  has     : true,
	  removed : 'http://日本語.jp/' },
	{ input   : '日本語.jp/',
	  has     : false,
	  removed : '日本語.jp/' },
	{ input   : '日本語.jp?URL=http://日本語.jp/',
	  has     : false,
	  removed : '日本語.jp?URL=http://日本語.jp/' },
];

test_hasScheme.parameters = schemeParameters;
function test_hasScheme(aParameter)
{
	if (aParameter.has)
		assert.isTrue(sv.hasScheme(aParameter.input));
	else
		assert.isFalse(sv.hasScheme(aParameter.input));
}

test_removeScheme.parameters = schemeParameters;
function test_removeScheme(aParameter)
{
	assert.equals(aParameter.removed, sv.removeScheme(aParameter.input));
}

test_isHeadOfNewURI.parameters = {
	URI                 : { expected : true, string : 'http://www.example.com' },
	URIRoot             : { expected : true, string : 'http://www.example.com/' },
	URIPath             : { expected : true, string : 'http://www.example.com/path/to/file' },
	URIFullWidth        : { expected : true, string : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ' },
	URIRootFullWidth    : { expected : true, string : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／' },
	URIPathFullWidth    : { expected : true, string : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／ｐａｔｈ／ｔｏ／ｆｉｌｅ' },
	domain              : { expected : false, string : 'www.example.com' },
	domainRoot          : { expected : false, string : 'www.example.com/' },
	domainPath          : { expected : false, string : 'www.example.com/path/to/file' },
	domainFullWidth     : { expected : false, string : 'ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ' },
	domainRootFullWidth : { expected : false, string : 'ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／' },
	domainPathFullWidth : { expected : false, string : 'ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／ｐａｔｈ／ｔｏ／ｆｉｌｅ' },
	IRI                 : { expected : true, string : 'http://日本語.jp' },
	IRIRoot             : { expected : true, string : 'http://日本語.jp/' },
	IRIPath             : { expected : true, string : 'http://日本語.jp/path/to/file' },
	IRIFullWidth        : { expected : true, string : 'ｈｔｔｐ：／／日本語。jp' },
	IRIRootFullWidth    : { expected : true, string : 'ｈｔｔｐ：／／日本語。jp／' },
	IRIPathFullWidth    : { expected : true, string : 'ｈｔｔｐ：／／日本語。jp／ｐａｔｈ／ｔｏ／ｆｉｌｅ' },
	IDN                 : { expected : false, string : '日本語.jp' },
	IDNRoot             : { expected : false, string : '日本語.jp/' },
	IDNPath             : { expected : false, string : '日本語.jp/path/to/file' },
	IDNFullWidth        : { expected : false, string : '日本語。jp' },
	IDNRootFullWidth    : { expected : false, string : '日本語。jp／' },
	IDNPathFullWidth    : { expected : false, string : '日本語。jp／ｐａｔｈ／ｔｏ／ｆｉｌｅ' },
	invalidDomain       : { expected : false, string : 'www.example.c/' },
	path                : { expected : false, string : '/path/to/file/' }
};
function test_isHeadOfNewURI(aParameter)
{
	if (aParameter.expected)
		assert.isTrue(sv.isHeadOfNewURI(aParameter.string), aParameter.string);
	else
		assert.isFalse(sv.isHeadOfNewURI(aParameter.string), aParameter.string);
}

test_hasLoadableScheme.parameters = test_isHeadOfNewURI.parameters;
function test_hasLoadableScheme(aParameter)
{
	if (aParameter.expected)
		assert.isTrue(sv.hasLoadableScheme(aParameter.string), aParameter.string);
	else
		assert.isFalse(sv.hasLoadableScheme(aParameter.string), aParameter.string);
}
