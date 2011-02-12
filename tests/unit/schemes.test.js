utils.include('common.inc.js');

function setUp()
{
	sv = getNewUtils();
	sv.invalidatePatterns();
	sv.schemeFixupTable = '';
	sv.IDNEnabled = false;
}

function tearDown()
{
	sv.destroy();
}

function test_schemeFixupTable()
{
	sv.schemeFixupTable = 'e:=>a:, f:=>a:, g:=>a:';
	assert.equals(['e:', 'f:', 'g:'], sv._fixupTargets);
	assert.equals({'e:':'a:','f:':'a:','g:':'a:'}, sv._fixupTargetsHash);
	assert.equals(['e', 'f', 'g'], sv._fixupSchemes);
	assert.equals('e:|f:|g:', sv._fixupTargetsPattern);
	assert.equals(/^(e:|f:|g:)/, sv._fixupTargetsRegExp);
}

function test_schemes()
{
	sv.scheme = 'a, b, c, d';

	assert.equals('a, b, c, d', sv.scheme);
	assert.equals(['a', 'b', 'c', 'd'], sv.schemes);

	sv.schemeFixupTable = 'e=>a, f=>a, g=>a';
	assert.equals('a, b, c, d', sv.scheme);
	assert.equals(['a', 'b', 'c', 'd', 'e', 'f', 'g'], sv.schemes);
}

function test_IDNSchemes()
{
	sv.scheme = 'a, b, c, d';
	sv.IDNScheme = 'c, d';

	assert.equals('c, d', sv.IDNScheme);
	assert.equals([], sv.IDNSchemes);
	assert.equals(['a', 'b', 'c', 'd'], sv.nonIDNSchemes);

	sv.schemeFixupTable = 'e:=>a:, f:=>c:, g:=>d:';
	assert.equals([], sv.IDNSchemes);
	assert.equals(['a', 'b', 'c', 'd', 'e', 'f', 'g'], sv.nonIDNSchemes);

	sv.IDNEnabled = true;
	sv.schemeFixupTable = '';

	assert.equals(['c', 'd'], sv.IDNSchemes);
	assert.equals(['a', 'b'], sv.nonIDNSchemes);

	sv.schemeFixupTable = 'e:=>a:, f:=>c:, g:=>d:';
	assert.equals(['c', 'd', 'f', 'g'], sv.IDNSchemes);
	assert.equals(['a', 'b', 'e'], sv.nonIDNSchemes);
}

