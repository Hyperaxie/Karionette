﻿// Returns first Google search result
var ent = require("./lib/entities.js");
listen({
	plugin: "google",
	handle: "google",
	regex: regexFactory.startsWith(["google", "g"]),
	command: {
		root: "google",
		options: "{String to search}",
		help: "Google search. Gets the first result."
	},
	callback: function (input, match) {
		var result,
			uri = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=' + match[1];
		web.get(uri, function (error, response, body) {
			var result = JSON.parse(body).responseData.results[0];
			if (result.titleNoFormatting) {
				irc.say(input.context, ent.decode(result.titleNoFormatting) + ' ~ ' + result.unescapedUrl, false);
			} else {
				irc.say(input.context, "P-P-PANTSU!");
			}
		});
	}
});
