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
	var halfWidth_absolute_URI = 'http://www.example.com/page';
	var fullWidth_absolute_URI = 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／ｐａｇｅ';
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
				halfWidth_absolute_URI+'?query1=value1&query2=value2',
				halfWidth_absolute_URI+'#hash',
				fullWidth_absolute_URI,
				fullWidth_absolute_URI+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２',
				fullWidth_absolute_URI+'＃ｈａｓｈ',
				halfWidth_relative_URI,
				halfWidth_relative_URI+'?query1=value1&query2=value2',
				halfWidth_relative_URI+'#hash',
				fullWidth_relative_URI,
				fullWidth_relative_URI+'？ｑｕｅｒｙ１＝ｖａｌｕｅ１＆ｑｕｅｒｙ２＝ｖａｌｕｅ２',
				fullWidth_relative_URI+'＃ｈａｓｈ'
			];

		var expected = [uris[0], uris[1], uris[2]];
		if (aFullWidth) expected = expected.concat([uris[3], uris[4], uris[5]]);
		if (aRelative) expected = expected.concat([uris[6], uris[7], uris[8]]);
		if (aFullWidth && aRelative) expected = expected.concat([uris[9], uris[10], uris[11]]);

		var match = sv.matchURIRegExp(
				uris.map(function(aURI) { return '日本語'+aURI+'日本語'; })
					.join('\n')
			);
		assert.isNotNull(match);
		assert.equals(expected.length, match.length);
		for (var i = 0, maxi = match.length; i < maxi; i++)
		{
			assert.equals(expected[i], match[i]);
		}
	}

	assert_matchURIRegExp(false, false);
	assert_matchURIRegExp(true, false);
	assert_matchURIRegExp(false, true);
	assert_matchURIRegExp(true, true);
}

function test_makeURIComplete()
{
	function assert_makeURIComplete(aString, aBase, aExpected)
	{
		assert.equals(aExpected, sv.makeURIComplete(aString, aBase));
	}

	assert_makeURIComplete(
		'page2',
		'http://www.example.com/page',
		'http://www.example.com/page2'
	);
	assert_makeURIComplete(
		'directory/page2',
		'http://www.example.com/page/',
		'http://www.example.com/page/directory/page2'
	);
	assert_makeURIComplete(
		'../directory/page2',
		'http://www.example.com/page/',
		'http://www.example.com/directory/page2'
	);
	assert_makeURIComplete(
		'./directory/page2',
		'http://www.example.com/page/',
		'http://www.example.com/page/directory/page2'
	);
	assert_makeURIComplete(
		'page2?query',
		'http://www.example.com/page',
		'http://www.example.com/page2?query'
	);
}

function test_fixupSchemer()
{
	function assert_fixupSchemer(aExpected, aInput)
	{
		assert.equals(aExpected, sv.fixupSchemer(aInput));
	}

	assert_fixupSchemer('http://www.example.com/', 'http://www.example.com/');
	assert_fixupSchemer('ftp://www.example.com/', 'ftp://www.example.com/');
	assert_fixupSchemer('svn://www.example.com/', 'svn://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'ttp://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'tp://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'p://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'h++p://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'h**p://www.example.com/');
	assert_fixupSchemer('http://www.example.com/', 'www.example.com/');
	assert_fixupSchemer('http://www2.example.com/', 'www2.example.com/');
	assert_fixupSchemer('ftp://ftp.example.com/', 'ftp.example.com/');
	assert_fixupSchemer('http://sub.example.com/', 'sub.example.com/');
	assert_fixupSchemer('http://domain', 'domain');
}

function test_sanitizeURIString()
{
	function assert_sanitizeURIString(aExpected, aInput)
	{
		assert.equals(aExpected, sv.sanitizeURIString(aInput));
	}

	function assert_sanitizeURIString_paren(aBase, aOpen, aClose)
	{
		assert_sanitizeURIString(aBase, aOpen+aBase+aClose);
		assert_sanitizeURIString('http://'+aBase+'/', aOpen+'http://'+aBase+'/'+aClose);
		assert_sanitizeURIString('http://'+aBase+'/index.html', aOpen+'http://'+aBase+'/index.html'+aClose);
	}

	function assert_sanitizeURIString_parens(aBase)
	{
		assert_sanitizeURIString_paren(aBase, '(', ')');
		assert_sanitizeURIString_paren(aBase, '(', '）');
		assert_sanitizeURIString_paren(aBase, '（', ')');
		assert_sanitizeURIString_paren(aBase, '（', '）');

		assert_sanitizeURIString_paren(aBase, '｢', '｣');
		assert_sanitizeURIString_paren(aBase, '｢', '」');
		assert_sanitizeURIString_paren(aBase, '「', '｣');
		assert_sanitizeURIString_paren(aBase, '「', '」');
		assert_sanitizeURIString_paren(aBase, '[', ']');
		assert_sanitizeURIString_paren(aBase, '[', '］');
		assert_sanitizeURIString_paren(aBase, '［', ']');
		assert_sanitizeURIString_paren(aBase, '［', '］');
		assert_sanitizeURIString_paren(aBase, '『', '』');
		assert_sanitizeURIString_paren(aBase, '《', '》');
		assert_sanitizeURIString_paren(aBase, '〔', '〕');
		assert_sanitizeURIString_paren(aBase, '【', '】');
		assert_sanitizeURIString_paren(aBase, '〈', '〉');

		assert_sanitizeURIString_paren(aBase, '<', '>');
		assert_sanitizeURIString_paren(aBase, '<', '＞');
		assert_sanitizeURIString_paren(aBase, '＜', '>');
		assert_sanitizeURIString_paren(aBase, '＜', '＞');

		assert_sanitizeURIString_paren(aBase, '"', '"');
		assert_sanitizeURIString_paren(aBase, '〝', '〟');
		assert_sanitizeURIString_paren(aBase, '“', '”');
		assert_sanitizeURIString_paren(aBase, '”', '”');
		assert_sanitizeURIString_paren(aBase, '“', '“');

		assert_sanitizeURIString_paren(aBase, "'", "'");
		assert_sanitizeURIString_paren(aBase, "'", "’");
		assert_sanitizeURIString_paren(aBase, "’", "'");
		assert_sanitizeURIString_paren(aBase, "‘", "'");
		assert_sanitizeURIString_paren(aBase, "’", "’");
		assert_sanitizeURIString_paren(aBase, "‘", "’");
	}

	sv.shouldParseRelativePath = false;

	assert_sanitizeURIString('http://www.example.com/', 'http://www.example.com/');
	assert_sanitizeURIString('http://www.example.com/index', 'http://www.example.com/index');
	assert_sanitizeURIString(
		'http://www.example.com/index?query1=value1&query2=value2',
		'http://www.example.com/index?query1=value1&query2=value2'
	);
	assert_sanitizeURIString(
		'http://www.example.com/index#hash',
		'http://www.example.com/index#hash'
	);
	assert_sanitizeURIString('www.example.com', 'www.example.com');
	assert_sanitizeURIString('www.example.jp', 'www.example.jp');
	assert_sanitizeURIString_parens('www.example.com');
	assert_sanitizeURIString_parens('www.example.com/directory');
	assert_sanitizeURIString('MyClass.property.value', 'MyClass.property.value');


	sv.shouldParseRelativePath = true;

	assert_sanitizeURIString('http://www.example.com/', 'http://www.example.com/');
	assert_sanitizeURIString('http://www.example.com/index', 'http://www.example.com/index');
	assert_sanitizeURIString(
		'http://www.example.com/index?query1=value1&query2=value2',
		'http://www.example.com/index?query1=value1&query2=value2'
	);
	assert_sanitizeURIString(
		'http://www.example.com/index#hash',
		'http://www.example.com/index#hash'
	);
	assert_sanitizeURIString('www.example.com', 'www.example.com');
	assert_sanitizeURIString('www.example.jp', 'www.example.jp');
	assert_sanitizeURIString_parens('www.example.com/directory');
	assert_sanitizeURIString('', 'MyClass.property.value');

	assert_sanitizeURIString('', 'function MyFunc()');
	assert_sanitizeURIString('', 'function MyFunc(aArg1, aArg2)');
}

function test_fixupURI()
{
	function assertFixupInput(aExpected, aInput)
	{
		assert.equals(aExpected, sv.fixupURI(aInput));
	}

	function assertInvalidInput(aInput)
	{
		assert.isNull(sv.fixupURI(aInput));
	}

	assertFixupInput('http://www.example.com/', 'http://www.example.com/');
	assertFixupInput('http://www.example.com/index', 'http://www.example.com/index');
	assertFixupInput(
		'http://www.example.com/index?query1=value1&query2=value2',
		'http://www.example.com/index?query1=value1&query2=value2'
	);
	assertFixupInput(
		'http://www.example.com/index#hash',
		'http://www.example.com/index#hash'
	);
	assertFixupInput('http://www.example.com', 'www.example.com');
	assertFixupInput('http://www.example.com', '(www.example.com)');

	assertInvalidInput('svn://www.example.com/');
}
