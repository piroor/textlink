var TextLinkMessengerService = { 
	 
	get browser() 
	{
		return document.getElementById('content');
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;
		}
	},
 	
	init : function() 
	{
		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		this.addPrefListener(this);
		this.initPrefs();

		this.initBrowser(gBrowser);
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);

		this.removePrefListener(this);

		this.destroyBrowser(gBrowser);
	}
  
}; 

TextLinkMessengerService.__proto__ = TextLinkService;
 
