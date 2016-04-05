function SelectionInField(aElement)
{
	this._element = aElement;
}
SelectionInField.prototype = {
	toString : function()
	{
		return this._element.value.substring(
			this._element.selectionStart,
			this._element.selectionEnd
		) || '';
	},

	get rangeCount()
	{
		if (this.toString() !== '')
			return 1;
		return 0;
	},

	getRangeAt : function(aIndex)
	{
		if (aIndex > this.rangeCount)
			throw new IndexSizeError('too larget index');

		return new RangeInField(this._element, this.toString());
	}
};

function RangeInField(aElement, aText)
{
	this._element = aElement;
	this._text = aText;
}

RangeInField.prototype = {
	toString : function()
	{
		return this._text;
	}
};
