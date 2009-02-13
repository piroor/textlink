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
}
