utils.include('common.inc.js');

function setUp()
{
	sv = getNewService();
	yield Do(utils.loadURI('../fixtures/testcase.html'));
}

function tearDown()
{
}

function $(aId)
{
	return content.document.getElementById(aId);
}

function test_getSelectionURIRanges()
{
}

function test_getURIRangesFromRange()
{
}

function test_getFindRange()
{
}

function test_shrinkURIRange()
{
	var range = content.document.createRange();
	var node = $('first').firstChild;
	range.setStart(node, 8);
	range.setEnd(node, 33);
	assert.equals('(http://www.mozilla.org/)', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());
}
