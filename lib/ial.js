// internal address list helpers/managers.
ial = {
	Add: function (channel, nick, address) { 
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		globals.channels[channel].users[nick] = { nick: nick, address: address, user: nick+"!"+address };
	},
	Remove: function (channel, nick) {
		if (!nick) delete globals.channels[channel];
		else {
			if (globals.channels[channel].users[nick]) {
				delete globals.channels[channel].users[nick];
			}
		}
	},
	Channels: function (nick) {
		// if nick is supplied, returns a list of channels we share with them
		// otherwise returns a list of all channels we're in.
		var keys = Object.keys(globals.channels),
			channels = [];
		if (keys.length > 0) {
			if (nick) {
				keys.forEach(function (item) {
					if (globals.channels[item].users[nick]) channels.push(item);
				});
			} else {
				keys.forEach(function (item) { channels.push(item); });
			}
		}
		if (channels.length > 0) return channels;
		return [];
	},
	Nicks: function (channel) {
		// shorthand for Object.keys(globals.channels[channel].users);
		if (channel && globals.channels[channel]) {
			return Object.keys(globals.channels[channel].users);
		}
		return [];
	},
	Channel: function (channel) {
		// shorthand for globals.channels[channel]
		if (globals.channels[channel]) {
			return globals.channels[channel];
		}
		return {};
	},
	maskSearch: function (mask) {
		// returns a list of nicks that match the mask
		var matches = [];
		if (mask) {
			var mask = mask.replace(/\*/g, "[^ ]+").replace(/\?/g, "."),
				chans = Object.keys(globals.channels);
			for (var i = 0; i <= chans.length-1; i++) {
				var nicks = Object.keys(globals.channels[chans[i]].users);
				nicks.forEach(function (nick) {
					if (globals.channels[chans[i]].users[nick].user.match(mask)) {
						// make sure it's not in the list already
						for (var k = 0; k <= matches.length; k++) {
							if (matches[k] === nick) var done = 1;
						}
						if (!done) matches.push(nick);
					}
				});
			}
			return matches;
		}
	},
	ison: function (channel, nick) {
		if (channel && nick && globals.channels && globals.channels[channel].users[nick]) return true;
		return false;
	},
	matchMask: function (user, mask) {
		// mask = Nick*!*user@*.host.org
		// user = Nick!user@host.org
		var reg = mask.replace(/\*/g,"[^ ]+").replace(/\?/g, ".");
		if (user.match(reg)) return true;
		return false;
	}
};
