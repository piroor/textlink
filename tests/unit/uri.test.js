utils.include('common.inc.js');

function setUp()
{
	sv = getNewUtils();
}

function tearDown()
{
	sv.destroy();
}

const HALF_WIDTH = (1 << 0);
const FULL_WIDTH = (1 << 1);
const IDN        = (1 << 2);
const RELATIVE   = (1 << 3);
test_matchURIRegExp.parameters = {
	halfWidth         : HALF_WIDTH,
	fullWidth         : FULL_WIDTH,
	IDN               : IDN,
	halfWidthRelative : HALF_WIDTH | RELATIVE,
	fullWidthRelative : FULL_WIDTH | RELATIVE
};
function test_matchURIRegExp(aFlags)
{

	var noURI                  = 'テキスト';
	var halfWidth_absolute_URI = 'http://www.example.com/';
	var fullWidth_absolute_URI = 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／';
	var IDN_absolute_URI       = 'http://日本語.jp/';
	var halfWidth_relative_URI = '../directory/file';
	var fullWidth_relative_URI = '．．／ｄｉｒｅｃｔｏｒｙ／ｆｉｌｅ';

	function assertURIMatch(aString, aURIString, aShouldMatch)
	{
		var message = aString +'\n => '+aURIString;
		var match = sv.matchURIRegExp(aString);
		if (!aShouldMatch) {
			assert.isNull(match, message);
		}
		else {
			assert.isNotNull(match, message);
			assert.equals(1, match.length, message);
			assert.equals(aURIString, match[0], message);
		}
	}

	sv.multibyteEnabled = !!(aFlags & FULL_WIDTH);
	sv.relativePathEnabled = !!(aFlags & RELATIVE);
	sv.IDNEnabled = !!(aFlags & IDN);

	assertURIMatch(noURI, null, false);
	assertURIMatch(halfWidth_absolute_URI, halfWidth_absolute_URI, true);
	assertURIMatch(fullWidth_absolute_URI, fullWidth_absolute_URI, aFlags & FULL_WIDTH);
	assertURIMatch(IDN_absolute_URI, IDN_absolute_URI, aFlags & IDN);
	assertURIMatch('test '+halfWidth_absolute_URI+' text', halfWidth_absolute_URI, true);
	assertURIMatch('test '+fullWidth_absolute_URI+' text', fullWidth_absolute_URI, aFlags & FULL_WIDTH);
	assertURIMatch('test '+IDN_absolute_URI+' text', IDN_absolute_URI, aFlags & IDN);
	assertURIMatch('日本語'+halfWidth_absolute_URI+'日本語', halfWidth_absolute_URI, true);
	assertURIMatch('日本語'+fullWidth_absolute_URI+'日本語', fullWidth_absolute_URI, aFlags & FULL_WIDTH);
	assertURIMatch('日本語'+IDN_absolute_URI+'日本語', IDN_absolute_URI, aFlags & IDN);

	assertURIMatch(halfWidth_relative_URI, halfWidth_relative_URI, aFlags & RELATIVE);
	assertURIMatch(fullWidth_relative_URI, fullWidth_relative_URI, aFlags & RELATIVE && aFlags & FULL_WIDTH);
	assertURIMatch('test '+halfWidth_relative_URI+' text', halfWidth_relative_URI, aFlags & RELATIVE);
	assertURIMatch('test '+fullWidth_relative_URI+' text', fullWidth_relative_URI, aFlags & RELATIVE && aFlags & FULL_WIDTH);
	assertURIMatch('日本語'+halfWidth_relative_URI+'日本語', halfWidth_relative_URI, aFlags & RELATIVE);
	assertURIMatch('日本語'+fullWidth_relative_URI+'日本語', fullWidth_relative_URI, aFlags & RELATIVE && aFlags & FULL_WIDTH);

	var uris = [
			halfWidth_absolute_URI,
			halfWidth_absolute_URI+'~user/',
			halfWidth_absolute_URI+'?query1=value1&query2=value2',
			halfWidth_absolute_URI+'#hash',
			fullWidth_absolute_URI,
			fullWidth_absolute_URI+'\u301cｕｓｅｒ／',
			fullWidth_absolute_URI+'\uff5eｕｓｅｒ／',
			fullWidth_absolute_URI+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２',
			fullWidth_absolute_URI+'＃ｈａｓｈ',
			halfWidth_relative_URI,
			halfWidth_relative_URI+'~user/',
			halfWidth_relative_URI+'?query1=value1&query2=value2',
			halfWidth_relative_URI+'#hash',
			fullWidth_relative_URI,
			fullWidth_relative_URI+'\u301cｕｓｅｒ／',
			fullWidth_relative_URI+'\uff5eｕｓｅｒ／',
			fullWidth_relative_URI+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２',
			fullWidth_relative_URI+'＃ｈａｓｈ',
			IDN_absolute_URI,
			IDN_absolute_URI+'~user/',
			IDN_absolute_URI+'?query1=value1&query2=value2',
			IDN_absolute_URI+'#hash'
		];

	var expected = uris.slice(0, 4);
	if (aFlags & FULL_WIDTH)
		expected = expected.concat(uris.slice(4, 9));
	if (aFlags & RELATIVE)
		expected = expected.concat(uris.slice(9, 13));
	if (aFlags & FULL_WIDTH && aFlags & RELATIVE)
		expected = expected.concat(uris.slice(13, 18));
	if (aFlags & IDN)
		expected = expected.concat(uris.slice(18, 23));

	function assertMatchURIs(aExpected, aInput)
	{
		var match = sv.matchURIRegExp(aInput);
		assert.isNotNull(match);
		assert.equals(aExpected, Array.slice(match));
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

test_fixupSchemer.parameters = [
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
function test_fixupSchemer(aParameter)
{
	assert.equals(aParameter.expected, sv.fixupSchemer(aParameter.input));
}

test_sanitizeURIString.parameters = utils.readParametersFromTSV('uri.sanitizeURIString.patterns.tsv');
function test_sanitizeURIString(aParameter)
{
	sv.relativePathEnabled = aParameter.relative;
	assert.equals(aParameter.sanitized, sv.sanitizeURIString(aParameter.input));
}

var parens = <![CDATA[
(	)
(	）
（	)
（	）
｢	｣
｢	」
「	｣
「	」
[	]
[	］
［	]
［	］
『	』
《	》
〔	〕
【	】
〈	〉
<	>
<	＞
＜	>
＜	＞
"	"
〝	〟
“	”
”	”
“	“
'	'
'	’
’	'
‘	'
’	’
‘	’
]]>.toString()
	.replace(/^\s+|\s+$/g, '')
	.split('\n')
	.map(function(aLine) {
		return aLine.split('\t');
	});
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

var schemerParameters = [
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

test_hasSchemer.parameters = schemerParameters;
function test_hasSchemer(aParameter)
{
	if (aParameter.has)
		assert.isTrue(sv.hasSchemer(aParameter.input));
	else
		assert.isFalse(sv.hasSchemer(aParameter.input));
}

test_removeSchemer.parameters = schemerParameters;
function test_removeSchemer(aParameter)
{
	assert.equals(aParameter.removed, sv.removeSchemer(aParameter.input));
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

test_hasLoadableSchemer.parameters = test_isHeadOfNewURI.parameters;
function test_hasLoadableSchemer(aParameter)
{
	if (aParameter.expected)
		assert.isTrue(sv.hasLoadableSchemer(aParameter.string), aParameter.string);
	else
		assert.isFalse(sv.hasLoadableSchemer(aParameter.string), aParameter.string);
}
