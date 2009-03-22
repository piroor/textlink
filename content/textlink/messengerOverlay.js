var TextLinkMessengerService = { 
	
	get browser() 
	{
		return document.getElementById('messagepane');
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
	},
 
	onContentLoad : function() 
	{
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
		var uriRanges = this.getURIRangesFromRange(range);
		uriRanges.reverse().forEach(function(aRange) {
			if (!this.getParentLink(aRange.range.startContainer)) {
				let text = aRange.range.toString();
				let link = doc.createElement('a');
				link.setAttribute('href', aRange.uri);
				link.appendChild(aRange.range.extractContents());
				aRange.range.insertNode(link);
			}
			aRange.range.detach();
		}, this);
		range.detach();
	},
	getParentLink : function(aNode)
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

		this.browser.addEventListener('load', this, true);
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.removePrefListener(this);

		this.browser.removeEventListener('load', this, true);
	}
  
}; 

TextLinkMessengerService.__proto__ = TextLinkService;
 
