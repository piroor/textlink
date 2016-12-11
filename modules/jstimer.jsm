/*
 JavaScript Timer Library

 Usage:
   var namespace = {};
   Components.utils.import('resource://foo-modules/jstimer.jsm', namespace);

   var callback = function(aMessage) { alert(aMessage); };
   var timeout = namespace.setTimeout(callback, 1000, 'OK');
   namespace.clearTimeout(timeout);
   var interval = namespace.setInterval(callback, 1000, 'OK');
   namespace.clearInterval(interval);

 license: The MIT License, Copyright (c) 2010-2016 YUKI "Piro" Hiroshi
 original:
   http://github.com/piroor/fxaddonlib-jstimer
*/

var Cc = Components.classes;
var Ci = Components.interfaces;

var EXPORTED_SYMBOLS = [
		'setTimeout',
		'clearTimeout',
		'setInterval',
		'clearInterval',
		'clearAllTimers'
	];

function setTimeout(aCallback, aTimeout, ...aArgs)
{
	if (typeof aCallback != 'function' && !('call' in aCallback))
		throw new Error('String type callback is obsolete.');

	var source = aCallback;
	aCallback = function() { source.apply(getGlobal(), aArgs); };
	aCallback.source = source;
	return (new Timer(
		aCallback,
		aTimeout,
		Ci.nsITimer.TYPE_ONE_SHOT,
		getOwnerWindowFromCaller(arguments.callee.caller)
	)).id;
}

function clearTimeout(aId)
{
	Timer.cancel(aId);
}

function setInterval(aCallbackaCallback, aInterval, ...aArgs)
{
	if (typeof aCallback != 'function' && !('call' in aCallback))
		throw new Error('String type callback is obsolete.');

	var source = aCallback;
	aCallback = function() { source.apply(getGlobal(), aArgs); };
	aCallback.source = source;
	return (new Timer(
		aCallback,
		aInterval,
		Ci.nsITimer.TYPE_REPEATING_SLACK,
		getOwnerWindowFromCaller(arguments.callee.caller)
	)).id;
}

function clearInterval(aId)
{
	Timer.cancel(aId);
}


function clearAllTimers()
{
	Timer.cancelAll();
}

/** Alias, as a handler for bootstrap.js */
var shutdown = clearAllTimers;


function Timer(aCallback, aTime, aType, aOwner) {
	this.finished = false;
	this.callback = aCallback;
	this.type = aType;
	this.owner = aOwner;
	this.init(aTime);

	Timer.instances[this.id] = this;
}
Timer.prototype = {
	init : function(aTime, aType)
	{
		this.id = parseInt(Math.random() * 65000)
		this.timer = Cc['@mozilla.org/timer;1']
						.createInstance(Ci.nsITimer);
		this.timer.init(this, aTime, this.type);
	},
	cancel : function()
	{
		if (!this.timer) return;

		this.timer.cancel();
		delete this.timer;
		delete this.callback;
		this.finished = true;

		delete Timer.instances[this.id];
	},
	observe : function(aSubject, aTopic, aData)
	{
		if (aTopic != 'timer-callback') return;
		this.notify(aSubject);
	},
	notify : function(aTimer)
	{
		if (this.owner && this.owner.closed) {
			dump('jstimer.jsm:'+
				'  timer is stopped because the owner window was closed.\n'+
				'  type: '+(this.type == Ci.nsITimer.TYPE_ONE_SHOT ? 'TYPE_ONE_SHOT' : 'TYPE_REPEATING_SLACK' )+'\n'+
				'  callback: '+(this.callback.source || this.callback)+'\n');
			this.cancel();
			return;
		}

		this.callback();

		if (this.type == Ci.nsITimer.TYPE_ONE_SHOT)
			this.cancel();
	}
};
Timer.instances = {};
Timer.cancel = function(aId) {
	var timer = this.getInstanceById(aId);
	if (timer)
		timer.cancel();
};
Timer.cancelAll = function(aId) {
	for (var i in this.instances)
	{
		let timer = this.instances[i];
		if (timer)
			timer.cancel();
	}
	this.instances = {};
};
Timer.getInstanceById = function(aId) {
	return this.instances[aId] || null ;
};

function getGlobal()
{
	return (function() { return this; })();
}

function getOwnerWindowFromCaller(aCaller)
{
	try {
		var global = aCaller.valueOf.call(null);
		if (global &&
			typeof global.Window == 'function' &&
			global instanceof global.Window)
			return global;
	}
	catch(e) {
	}
	return null;
}
