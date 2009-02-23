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
		assert.equals(3, container.childNodes.length, aURI);
		var box = content.document.getBoxObjectFor(span);
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
	uris.forEach(function(aURI, aIndex) {
		gBrowser.removeAllTabsBut(tabs[0]);
		action.fireMouseEvent(
			content,
			{ type : 'dblclick',
			  button : 0,
			  screenX : positions[aIndex].x,
			  screenY : positions[aIndex].y }
		);
		yield 100;
		assert.equals(2, tabs.length, aURI);
		assert.equals(tabs[1], gBrowser.selectedTab, aURI);
		assert.equals(aURI, selection.toString(), aURI);
	});
}

