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
	var range = content.document.createRange();
	var node = $('first').firstChild;
	range.setStart(node, 7);
	range.setEnd(node, 32);
	var rangeText = range.toString();
	assert.equals('(http://www.mozilla.org/)', rangeText);

	var findRange = sv.getFindRange(range);
	var findRangeText = findRange.toString();
	assert.compare(findRangeText.length, '>=', rangeText.length);
	assert.contains(range, findRange);

	range.detach();
	findRange.detach();
}

function test_shrinkURIRange()
{
	var range = content.document.createRange();
	var node = $('first').firstChild;

	range.setStart(node, 7);
	range.setEnd(node, 32);
	assert.equals('(http://www.mozilla.org/)', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());

	range.setStart(node, 8);
	range.setEnd(node, 31);
	assert.equals('http://www.mozilla.org/', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('http://www.mozilla.org/', range.toString());

	range.setStart(node, 6);
	range.setEnd(node, 33);
	assert.equals('a(http://www.mozilla.org/)は', range.toString());
	range = sv.shrinkURIRange(range);
	assert.equals('a(http://www.mozilla.org/)は', range.toString());

	range.detach();
}
