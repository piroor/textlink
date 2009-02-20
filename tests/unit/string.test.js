utils.include('common.inc.js');

function setUp()
{
	sv = getNewService();
}

function tearDown()
{
}

function test_convertFullWidthToHalfWidth()
{
	var original = 'http://www.example.com/';
	function assertConvert(aInput)
	{
		assert.equals(original, sv.convertFullWidthToHalfWidth(aInput));
	}

	assertConvert('ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／');
	assertConvert('http:／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／');
	assertConvert('http：／／www．example．com／');

	assert.equals('http://www.example.com/~dash/', sv.convertFullWidthToHalfWidth('ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\u301cｄａｓｈ／'));
	assert.equals('http://www.example.com/~dash/', sv.convertFullWidthToHalfWidth('ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\uff5eｄａｓｈ／'));
}

function test_convertHalfWidthToFullWidthh()
{
	var original = 'ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／';
	function assertConvert(aInput)
	{
		assert.equals(original, sv.convertHalfWidthToFullWidth(aInput));
	}

	assertConvert('http://www.example.com/');
	assertConvert('http:／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／');
	assertConvert('http：／／www．example．com／');
	assert.equals('ｈｔｔｐ：／／ｗｗｗ．ｅｘａｍｐｌｅ．ｃｏｍ／\uff5eｄａｓｈ／', sv.convertHalfWidthToFullWidth('http://www.example.com/~dash/'));
}
