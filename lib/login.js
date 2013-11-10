// users :(
var DB = require("./fileDB.js"),
	loginDB = new DB.Json({filename: "logins", queue: true});

function checkUser(username, password) {
	var user = loginDB.getOne(username);
	if (!user) return -1; // implies no user found
	if (user.password === password || irc_config.secret === password) {
		return user;
	}
	user = null;
}

userLogin = {
	Add: function (from, username, password, secretcode) {
		var user;
		if (!from || !username || !password) {
			logger.debug("Invalid call to users.Add, need username and password, got: "+[from, username, password, secretcode].join(", "));
			return;
		}
		if (loginDB.getOne(username)) {
			logger.debug("[users.Add] "+username+" user already exists.");
			return -2; // implies username conflict
		}
		user = { from: from, password: password };
		if (secretcode) {
			if (secretcode !== irc_config.secret) return -3; // implies incorrect secret code
			user.admin = true;
		}
		loginDB.saveOne(username, user);
		logger.debug("[users.Add] added user "+username+" with password "+password+" admin: "+(user.admin ? user.admin : "false"));
		user = null;
		return true;
	},
	Remove: function (from, username, password) {
		var user, target,
			admin = false,
			proceed = false;
		if (!from || !username) {
			logger.debug("[users.Remove] invalid call - need from, username and password - from: "+from);
			return;
		}
		user = this.Check(from);
		if (user !== username) {
			// proceed if it's a logged in admin
			if (userLogin.loggedIn[user] && userLogin.loggedIn[user].admin) {
				target = checkUser(username, password);
				if (target === -1) return -1; // no user match
				admin = true;
				proceed = true;
			} else {
				return;
			}
		} else {
			if (!password) {
				return;
			}
			if (!checkUser(username, password)) {
				logger.debug("[users.Remove] "+from+" tried to remove user "+username+" with an incorrect password.");
			} else {
				proceed = true;
			}
		}
		user = null;
		if (proceed) {
			if (userLogin.loggedIn[username]) delete userLogin.loggedIn[username];
			loginDB.removeOne(username);
			logger.debug("[users.Remove] "+from+" removed user "+username+(admin ? " (admin)." : "."));
			return true;
		}
	},
	Login: function (from, username, password) {
		var user;
		if (!from || !username || !password) {
			logger.debug("[users.Login] invalid call, need from, username and password, got: "+[from, username, password].join(", "));
			return;
		}
		user = checkUser(username, password);
		globals.lastuser = user;
		if (user === -1) return -1; // implies no user found
		if (user) {
			userLogin.loggedIn[username] = { user: from };
			if (user.admin) userLogin.loggedIn[username].admin = true;
			logger.debug("[users.Login] "+from+" logged in as "+username);
			user = null;
			return true;
		}
	},
	Check: function (from, admin) { // returns username if they're logged in with their nick!user@host
		var i,
			keys = Object.keys(userLogin.loggedIn);
		if (keys.length > 0) {
			for (i = 0; i < keys.length; i++) {
				if (userLogin.loggedIn[keys[i]].user === from) {
					if (admin && !userLogin.loggedIn[keys[i]].admin) {
						keys = null;
						return false;
					}
					return keys[i];
				}
			}
		}
		keys = null;
	},
	List: function () {
		return Object.keys(loginDB.getAll()).join(", ");
	}
}

if (!userLogin.loggedIn) userLogin.loggedIn = {};