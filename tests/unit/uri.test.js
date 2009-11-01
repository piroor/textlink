utils.include('common.inc.js');

function setUp()
{
	sv = getNewService();
}

function tearDown()
{
}

function test_matchURIRegExp()
{
	var noURI = 'テキスト';
	var halfWidth_absolute_URI = 'http://www.example.com/';
	var fullWidth_absolute_URI = 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／';
	var halfWidth_relative_URI = '../directory/file';
	var fullWidth_relative_URI = '．．／ｄｉｒｅｃｔｏｒｙ／ｆｉｌｅ';

	function assertURIMatch(aString, aURIString, aShouldMatch)
	{
		var match = sv.matchURIRegExp(aString);
		if (!aShouldMatch) {
			assert.isNull(match);
		}
		else {
			assert.isNotNull(match);
			assert.equals(1, match.length);
			assert.equals(aURIString, match[0]);
		}
	}

	function assert_matchURIRegExp(aFullWidth, aRelative)
	{
		sv.shouldParseMultibyteCharacters = aFullWidth;
		sv.shouldParseRelativePath = aRelative;

		assertURIMatch(noURI, null, false);
		assertURIMatch(halfWidth_absolute_URI, halfWidth_absolute_URI, true);
		assertURIMatch(fullWidth_absolute_URI, fullWidth_absolute_URI, aFullWidth);
		assertURIMatch('test '+halfWidth_absolute_URI+' text', halfWidth_absolute_URI, true);
		assertURIMatch('test '+fullWidth_absolute_URI+' text', fullWidth_absolute_URI, aFullWidth);
		assertURIMatch('日本語'+halfWidth_absolute_URI+'日本語', halfWidth_absolute_URI, true);
		assertURIMatch('日本語'+fullWidth_absolute_URI+'日本語', fullWidth_absolute_URI, aFullWidth);

		assertURIMatch(halfWidth_relative_URI, halfWidth_relative_URI, aRelative);
		assertURIMatch(fullWidth_relative_URI, fullWidth_relative_URI, aRelative && aFullWidth);
		assertURIMatch('test '+halfWidth_relative_URI+' text', halfWidth_relative_URI, aRelative);
		assertURIMatch('test '+fullWidth_relative_URI+' text', fullWidth_relative_URI, aRelative && aFullWidth);
		assertURIMatch('日本語'+halfWidth_relative_URI+'日本語', halfWidth_relative_URI, aRelative);
		assertURIMatch('日本語'+fullWidth_relative_URI+'日本語', fullWidth_relative_URI, aRelative && aFullWidth);

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
				fullWidth_relative_URI+'＃ｈａｓｈ'
			];

		var expected = [uris[0], uris[1], uris[2], uris[3]];
		if (aFullWidth) expected = expected.concat([uris[4], uris[5], uris[6], uris[7], uris[8]]);
		if (aRelative) expected = expected.concat([uris[9], uris[10], uris[11], uris[12]]);
		if (aFullWidth && aRelative) expected = expected.concat([uris[13], uris[14], uris[15], uris[16], uris[17]]);

		function assertMatchURIs(aExpected, aInput)
		{
			var match = sv.matchURIRegExp(aInput);
			assert.isNotNull(match);
			assert.equals(aExpected.length, match.length);
			for (var i = 0, maxi = match.length; i < maxi; i++)
			{
				assert.equals(aExpected[i], match[i]);
			}
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

	assert_matchURIRegExp(false, false);
	assert_matchURIRegExp(true, false);
	assert_matchURIRegExp(false, true);
	assert_matchURIRegExp(true, true);
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
	  resolved : 'http://www.example.com/page2?query' }
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
];
function test_fixupSchemer(aParameter)
{
	assert.equals(aParameter.expected, sv.fixupSchemer(aParameter.input));
}

test_sanitizeURIString.parameters = utils.readParametersFromTSV('uri.sanitizeURIString.patterns.tsv');
function test_sanitizeURIString(aParameter)
{
	sv.shouldParseRelativePath = aParameter.relative;
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
	{ relative : true,  base : 'www.example.com/directory' }
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
	sv.shouldParseRelativePath = aParameter.relative;
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
	{ input : 'svn://www.example.com/' }
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
