function log(...aArgs)
{
	if (!configs || !configs.debug)
		return;

	var logString = '[textlink] '+ aArgs.map(objectToLogString).join('');
	console.log(logString);
}

function logWithStackTrace(aModule, ...aArgs)
{
	var stack = (new Error()).stack.replace(/^/gm, '  ');
	aArgs.push(stack);
	return log(aModule, ...aArgs);
}

function objectToLogString(aObject)
{
	if (!aObject)
		return JSON.stringify(aObject);

	if (/^(string|number|boolean)$/.test(typeof aObject))
		return aObject;

	return objectToString(aObject);
}

function objectToString(aObject)
{
	try {
		if (!aObject ||
			/^(string|number|boolean)$/.test(typeof aObject))
			return JSON.stringify(aObject);

		if (Array.isArray(aObject))
			return '['+aObject.map(objectToString).join(', ')+']';

		var constructor = String(aObject.constructor).match(/^function ([^\(]+)/);
		if (constructor) {
			constructor = constructor[1];
			switch (constructor)
			{
				case 'String':
				case 'Number':
				case 'Boolean':
					return JSON.stringify(aObject);

				case 'Object':
					return '{' + Object.keys(aObject).map(function(aKey) {
						return '"' + aKey + '":' + objectToString(aObject[aKey]);
					}, this).join(', ') + '}';

				default:
					break;
			}

			if (/Element$/.test(constructor)) {
				let id = '';
				if (aObject.hasAttribute('id'))
					id = '#' + aObject.getAttribute('id');

				let classes = '';
				if (aObject.className)
					classes = '.' + aObject.className.replace(/\s+/g, '.');

				return '<' + aObject.localName + id + classes + '>';
			}

			return '<object '+constructor+'>';
		}

		return String(aObject);
	}
	catch(e) {
		return String(e);
	}
}

