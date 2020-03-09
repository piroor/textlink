/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

// XPath utilities

function hasClass(className) {
  return `contains(concat(" ", normalize-space(@class), " "), " ${className} ")`;
}

function toLowerCase(target) {
  return `translate(${target}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')`;
}

var NSResolver = {
  lookupNamespaceURI : function(prefix) {
    switch (prefix)
    {
      case 'html':
      case 'xhtml':
        return 'http://www.w3.org/1999/xhtml';
      case 'xlink':
        return 'http://www.w3.org/1999/xlink';
      default:
        return '';
    }
  }
};

function evaluateXPath(expression, context, type) {
  if (!type)
    type = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
  let result;
  try {
    result = (context.ownerDocument || context).evaluate(
      expression,
      (context || document),
      NSResolver,
      type,
      null
    );
  }
  catch(e) {
    return {
      singleNodeValue: null,
      snapshotLength:  0,
      snapshotItem:    function() {
        return null
      }
    };
  }
  return result;
}

function getArrayFromXPathResult(xathResult) {
  const max   = xathResult.snapshotLength;
  const array = new Array(max);
  if (!max)
    return array;

  for (let i = 0; i < max; i++) {
    array[i] = xathResult.snapshotItem(i);
  }
  return array;
}
