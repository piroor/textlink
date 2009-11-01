utils.include('common.inc.js');

var uris, positions;

function setUp()
{
	yield Do(commonSetUp('../fixtures/testcase.txt'));

	positions = [];
	uris = [
			'http://www.netscape.com/',
			'ｔｐ：／／ｗｗｗ９８．ｓａｋｕｒａ．ｎｅ．ｊｐ／〜ｐｉｒｏ／ｅｎｔｒａｎｃｅ／',
			'http://www.google.co.jp/search?q=Firefox&ie=utf-8&oe=utf-8'
		];

	var container = content.document.getElementsByTagName('pre')[0];
	assert.equals(1, container.childNodes.length);

	uris.forEach(function(aURI, aIndex) {
		var text = container.firstChild;
		var position = text.textContent.indexOf(aURI);
		assert.notEquals(-1, position, aURI+'\n'+text.textContent);
		var range = content.document.createRange();
		range.setStart(text, position);
		range.setEnd(text, position + aURI.length, aURI);
		assert.equals(aURI, range.toString());

		var span = content.document.createElement('span');
		span.appendChild(range.extractContents());
		range.insertNode(span);
		container.normalize();
		assert.equals(3, container.childNodes.length, aURI);
		var box = utils.getBoxObjectFor(span);
		positions.push({ x : box.screenX, y : box.screenY });

		range.selectNodeContents(span);
		var uriNode = range.extractContents();
		range.selectNode(span);
		range.deleteContents();
		range.insertNode(uriNode);
		container.normalize();
		assert.equals(1, container.childNodes.length, aURI);
	});
}

function tearDown()
{
	yield Do(commonTearDown());
}

function testPlainText()
{
	var selection = content.getSelection();
	for (var i = 0, maxi = uris.length; i < maxi; i++)
	{
		gBrowser.removeAllTabsBut(tabs[0]);
		action.dblclickAt(positions[i].x, positions[i].y);
		yield 100;
		assert.equals(2, tabs.length, uris[i]);
		assert.equals(tabs[1], gBrowser.selectedTab, uris[i]);
		assert.equals(uris[i], selection.toString(), uris[i]);
	}
}

