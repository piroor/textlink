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

	sv.schemeFixupTable = 'e:=>a:, f:=>a:, g:=>a:';
	assert.equals('a, b, c, d', sv.scheme);
	assert.equals(['a', 'b', 'c', 'd', 'e', 'f', 'g'], sv.schemes);
}

function test_IDNSchemes()
{
	sv.scheme = 'http, https, about, chrome';
	sv.IDNScheme = 'http, https';

	assert.equals('http, https', sv.IDNScheme);
	assert.equals([], sv.IDNSchemes);
	assert.equals(['about', 'chrome', 'http', 'https'], sv.nonIDNSchemes);

	sv.schemeFixupTable = 'ttp:=>http:, tp:=>http:, p:=>http:, bout:=>about:';
	assert.equals([], sv.IDNSchemes);
	assert.equals(['about', 'bout', 'chrome', 'http', 'https', 'p', 'tp', 'ttp'], sv.nonIDNSchemes);

	sv.IDNEnabled = true;
	sv.schemeFixupTable = '';

	assert.equals(['http', 'https'], sv.IDNSchemes);
	assert.equals(['about', 'chrome'], sv.nonIDNSchemes);

	sv.schemeFixupTable = 'ttp:=>http:, tp:=>http:, p:=>http:, bout:=>about:';
	assert.equals(['http', 'https', 'p', 'tp', 'ttp'], sv.IDNSchemes);
	assert.equals(['about', 'bout', 'chrome'], sv.nonIDNSchemes);
}

