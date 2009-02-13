var namespace = {
		window : {
			addEventListener : function() {},
			get gBrowser() {
				return utils.gBrowser;
			}
		},
		get gBrowser() {
			return utils.gBrowser;
		}
	};
utils.include('../../content/textlink/prefs.js', namespace, 'Shift_JIS');
utils.include('../../content/textlink/globalOverlay.js', namespace, 'Shift_JIS');

var sv;

function getNewService()
{
	var obj = {};
	obj.__proto__ = namespace.TextLinkService;

	obj.schemer = 'http https ftp news nntp telnet irc mms ed2k about file urn';
	obj.schemerFixupTable = 'www=>http:\/\/www ftp.=>ftp:\/\/ftp. irc.=>irc:irc. h??p=>http h???s=>https ttp=>http tp=>http p=>http ttps=>https tps=>https ps=>https';
	obj.schemerFixupDefault = 'http';

	return obj;
}

function $(aId)
{
	return content.document.getElementById(aId);
}
