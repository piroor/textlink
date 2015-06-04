utils.include('common.inc.js');

function setUp()
{
	sv = getNewUtils();
}

function tearDown()
{
}

test_convertFullWidthToHalfWidth.parameters = [
	{ input    : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／',
	  expected : 'http://www.example.com/' },
	{ input    : 'http:／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／',
	  expected : 'http://www.example.com/' },
	{ input    : 'http：／／www．example．com／',
	  expected : 'http://www.example.com/' },
	{ input    : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\u301cｄａｓｈ／',
	  expected : 'http://www.example.com/~dash/' },
	{ input    : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\uff5eｄａｓｈ／',
	  expected : 'http://www.example.com/~dash/' }
];
function test_convertFullWidthToHalfWidth(aParameter)
{
	assert.equals(aParameter.expected, sv.convertFullWidthToHalfWidth(aParameter.input));
}

test_convertHalfWidthToFullWidth.parameters = [
	{ input    : 'http://www.example.com/',
	  expected : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／' },
	{ input    : 'http:／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／',
	  expected : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／' },
	{ input    : 'http：／／www．example．com／',
	  expected : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／' },
	{ input    : 'http://www.example.com/~dash/',
	  expected : 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\uff5eｄａｓｈ／' },
];
function test_convertHalfWidthToFullWidth(aParameter)
{
	assert.equals(aParameter.expected, sv.convertHalfWidthToFullWidth(aParameter.input));
}

test_expandWildcardsToRegExp.parameters = [
	{ input    : 'h??p:',
	  expected : 'h..p:' },
	{ input    : 'h*p:',
	  expected : 'h.+p:' },
	{ input    : 'h++p:',
	  expected : 'h\\+\\+p:' },
	{ input    : 'www.example.com',
	  expected : 'www\\.example\\.com' },
	{ input    : 'http:(){}',
	  expected : 'http:\\(\\)\\{\\}' },
];
function test_expandWildcardsToRegExp(aParameter)
{
	assert.equals(aParameter.expected, sv.expandWildcardsToRegExp(aParameter.input));
}

test_niceSplit.parameters = [
	{ input    : 'a b c d',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : 'a   b   c   d',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : 'a	b	c	d',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : 'a,b,c,d',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : 'a, b, c, d',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : 'a\nb\nc\nd',
	  expected : 'a,b,c,d'.split(',') },
	{ input    : '',
	  expected : [] },
];
function test_niceSplit(aParameter)
{
	assert.equals(aParameter.expected, sv.niceSplit(aParameter.input));
}
