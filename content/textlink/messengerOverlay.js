var TextLinkMessengerService = { 
	
	get browser() 
	{
		return document.getElementById('messagepane');
	},
 
	get isPlainTextMessage()
	{
		return this.getPref('mailnews.display.html_as') == 1 ||
				this.evaluateXPath(
					'/descendant::*[local-name()="BODY"]/child::*[@class="moz-text-plain"]',
					this.browser.contentDocument,
					XPathResult.BOOLEAN_TYPE
				).booleanValue;
	},
 
	get shouldRecognizeLineBreaksAsBoundaryPoints()
	{
		return !this.isPlainTextMessage;
	},
 
	_getFollowingPartRanges : function(aRange)
	{
		var ranges = [];
		return ranges;
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

		this.handleUserActionEvents(aEvent);
	},
 
	loadURI : function(aURI)
	{
		Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
			.getService(Components.interfaces.nsIExternalProtocolService)
			.loadUrl(this.makeURIFromSpec(aURI));
	},
 
	onContentLoad : function() 
	{
		if (
			!this.isPlainTextMessage ||
			!this.getPref('textlink.messenger.linkify')
			)
			return;

		this.unlinkifyAutoLinks();
		this.linkify();
	},
	
	unlinkifyAutoLinks : function() 
	{
		var doc = this.browser.contentDocument;
		var links = this.evaluateXPath(
				'/descendant::*[not('+(
					'addbook,imap,mailbox,mailto,news,nntp,pop,snews,feed'.split(',')
					.map(function(aSchemer) {
						return 'starts-with(@href, "'+aSchemer+':")';
					})
					.join(' or ')
				)+') and @href=text()]',
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
		var uriRanges = this.getURIRangesFromRange(
				range,
				this.FIND_ALL | this.ALLOW_SAME_URIS
			);
		uriRanges.reverse().forEach(function(aRange) {
			if (!this._getParentLink(aRange.range.startContainer)) {
				let link = doc.createElement('a');
				link.setAttribute('href', aRange.uri);
				link.appendChild(aRange.range.extractContents());
				aRange.range.insertNode(link);
				link.textContent = decodeURIComponent(link.textContent);
			}
			aRange.range.detach();
		}, this);
		range.detach();
	},
	_getParentLink : function(aNode)
	{
		return this.evaluateXPath(
				'ancestor-or-self::*[@href]',
				aNode,
				XPathResult.FIRST_ORDERED_NODE_TYPE
			).singleNodeValue;
	},
  
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.addPrefListener(this);
		this.initPrefs();

		this.browser.addEventListener('dblclick', this, true);
		this.browser.addEventListener('keypress', this, true);
		this.browser.addEventListener('load', this, true);
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.removePrefListener(this);

		this.browser.removeEventListener('dblclick', this, true);
		this.browser.removeEventListener('keypress', this, true);
		this.browser.removeEventListener('load', this, true);
	}
  
}; 

TextLinkMessengerService.__proto__ = TextLinkService;
 
