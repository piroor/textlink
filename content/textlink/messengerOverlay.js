(function() {
var namespace = {};
Components.utils.import('resource://textlink-modules/inherit.jsm', namespace);

var TextLinkMessengerService = window.TextLinkMessengerService = namespace.inherit(TextLinkService, { 
 
	get contextMenu() 
	{
		return document.getElementById('messagePaneContext') || document.getElementById('mailContext');
	},
	
	get isPlainTextMessage()
	{
		return this.utils.prefs.getPref('mailnews.display.html_as') == 1 ||
				this.utils.evaluateXPath(
					'/descendant::*[local-name()="BODY" or local-name()="body"]/child::*[@class="moz-text-plain"]',
					this.browser.contentDocument,
					XPathResult.BOOLEAN_TYPE
				).booleanValue;
	},
 
	get multilineURIEnabled()
	{
		return this.utils.prefs.getPref('textlink.multiline.enabled') &&
			this.isPlainTextMessage;
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				if (aEvent.currentTarget == this.browser) {
					this.onContentLoad();
				}
				else {
					this.init();
				}
				return;

			case 'unload':
				this.destroy();
				return;
		}

		this.handleUserActionEvent(aEvent);
	},
 
	loadURI : function(aURI)
	{
		Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
			.getService(Components.interfaces.nsIExternalProtocolService)
			.loadUrl(this.utils.makeURIFromSpec(aURI));
	},
 
	onContentLoad : function() 
	{
		if (
			!this.isPlainTextMessage ||
			!this.utils.prefs.getPref('textlink.messenger.linkify')
			)
			return;

		this.unlinkifyAutoLinks();
		this.linkify();
	},
	
	unlinkifyAutoLinks : function() 
	{
		var doc = this.browser.contentDocument;
		var links = this.utils.evaluateXPath(
				'/descendant::*[local-name()="A" or local-name()="a"][not('+(
					'addbook,imap,mailbox,mailto,pop'.split(',')
					.map(function(aScheme) {
						return 'starts-with(@href, "'+aScheme+':")';
					})
					.join(' or ')
				)+') and (contains(text(), @href) or contains(@href, text()))]',
				doc
			);
		var range = doc.createRange();
		for (let i = links.snapshotLength-1; i > -1; i--)
		{
			let link = links.snapshotItem(i);
			range.selectNodeContents(link);
			let contents = range.extractContents();
			range.selectNode(link);
			range.deleteContents();
			range.insertNode(contents);
		}
		range.detach();
	},
 
	linkify : function() 
	{
		var doc = this.browser.contentDocument;
		var range = doc.createRange();
		range.selectNodeContents(doc.body);
		var self = this;
		this.rangeUtils.getURIRangesFromRange(
			range,
			this.rangeUtils.FIND_ALL | this.rangeUtils.ALLOW_SAME_URIS
		).next(function(aRanges) {
			aRanges.reverse().forEach(function(aRange) {
				if (!self._getParentLink(aRange.range.startContainer)) {
					let link = doc.createElement('a');
					if (aRange.range.toString().length < aRange.uri.length) {
						link.setAttribute('class', 'moz-txt-link-abbreviated');
					}
					else {
						link.setAttribute('class', 'moz-txt-link-freetext');
					}
					link.setAttribute('href', aRange.uri);
					link.appendChild(aRange.range.extractContents());
					aRange.range.insertNode(link);
					link.textContent = link.textContent;
				}
				aRange.range.detach();
			});
			range.detach();
		});
	},
	_getParentLink : function(aNode)
	{
		return this.utils.evaluateXPath(
				'ancestor-or-self::*[local-name()="A" or local-name()="a"][@href]',
				aNode,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
  
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.contextMenu.addEventListener('popupshowing', this, false);

		this.browser.addEventListener('dblclick', this, true);
		this.browser.addEventListener('keypress', this, true);
		this.browser.addEventListener('load', this, true);
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.contextMenu.removeEventListener('popupshowing', this, false);

		this.browser.removeEventListener('dblclick', this, true);
		this.browser.removeEventListener('keypress', this, true);
		this.browser.removeEventListener('load', this, true);
	}
  
}); 

})();
 
