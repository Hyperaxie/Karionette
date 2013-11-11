// Commie airtimes
cmdListen({
	command: "airtime",
	help: "Hopefully shows airtimes of Commie things.",
	syntax: config.command_prefix+"airtime <show name>",
	callback: function(input) {
		web.get("http://c.milkteafuzz.com/api/1/search.json?q="+input.data, function (error, resp, body) {
			body = JSON.parse(body);
			if (body[0] && body[0]._id["$oid"]) {
				web.get("https://c.milkteafuzz.com/api/1/shows/"+body[0]._id["$oid"]+".json", function (error, resp, body) {
					var status = "",
						title = "",
						airtime = "",
						date, now,
						eps = "";
					body = JSON.parse(body);
					if (body.status_code) {
						irc.say(input.context, "Couldn't find it. :<");
						return;
					}
					if (body.status) status = " - "+body.status+" - ";
					if (body.airtime) {
						date = new Date(body.airtime["$date"]).valueOf();
						now = new Date().valueOf();
						if (date > now) airtime = "- The next episode airs in "+lib.duration(now, date)+".";
						else airtime = "- Last aired: "+new Date(body.airtime["$date"]);
					}
					if (body.episodes) eps = body.episodes.current+" episodes ("+body.episodes.total+" total) ";
					if (body.titles) {
						if (body.titles.english) title = body.titles.english;
						if (body.titles.japanese) title = (title ? "["+title+" / "+body.titles.japanese.trim()+"]" : body.titles.japanese);
					}
					irc.say(input.context, title+status+eps+airtime, false);
				});
			} else {
				irc.say(input.context, "Couldn't find it. :<");
			}
		});
	}
});