TextLinkService.overrideExtensions = function() {

	// popIn
	if ('PopIn' in window &&
		'jQuery' in window && 'event' in jQuery &&
		'fix' in jQuery.event && 'handle' in jQuery.event) {
		eval('jQuery.event.fix = '+jQuery.event.fix.toSource().replace(
			'{',
			<![CDATA[$&
				var now = function() { return new Date(); };
				var expando = 'jQuery'+now();
			]]>
		).replace(
			'originalEvent.stopPropagation();',
			'if (TextLinkService.getActionsForEvent(originalEvent).length) $&'
		));

		jQuery.event.__textlink__handle = jQuery.event.handle;
		jQuery.event.handle = function(aEvent) {
			var original = TextLinkService.browser;
			if (original.localName == 'tabbrowser')
				original = original.selectedTab.linkedBrowser;
			window.setTimeout(function(aSelf) {
				var current = TextLinkService.browser;
				if (current.localName == 'tabbrowser')
					current = current.selectedTab.linkedBrowser;
				if (current == original)
					jQuery.event.__textlink__handle.call(aSelf, aEvent);
			}, 0, this);
		};
	}

};
