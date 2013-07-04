var DB = require("./fileDB.js"),
	permsDB = new DB.Json({ filename: "permissions" });

permissions = {
	Syntax: "[Help] Syntax: permissions <allow/deny/owner> <add/remove/list> <function/variable/alias> <name> <mask>",
	Example: "Example: permissions deny add variable anime_list mitch*!*@*",
	Check: function (type, item, user) {
		if (type.match(/function|alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
			logger.debug("permissions.Check(" + [ type, item, user ].join(", ") + ") called.");
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = permsDB.getOne(type.toLowerCase());
			if (entry && entry[item]) {
				if (entry[item]["owner"] && entry[item]["owner"].length > 0) {
					var owner = false;
					entry[item]["owner"].some(function (element) {
						if (ial.maskMatch(user, element)) owner = true;
					});
					if (owner) return owner;
				}
				if (entry[item]["deny"] && entry[item]["deny"].length > 0) {
					var blacklist = true;
					entry[item]["deny"].some(function (element) { 
						if (ial.maskMatch(user, element)) blacklist = false;
					});
					return blacklist;
				}
				if (entry[item]["allow"] && entry[item]["allow"].length > 0) {
					var whitelist = false;
					entry[item]["allow"].some(function (element) {
						if (ial.maskMatch(user, element)) whitelist = true;
					});
					return whitelist;
				} // need to adapt this to allow having a deny with exceptions (which are in the allow list)
			}
			return true;
		}
		logger.warn("permissions.Check() called improperly.");
		return false;
	},
	Search: function (item) {
		// returns a list of matching entries - user is optional
		var perms = permsDB.getAll(),
			keys = Object.keys(perms),
			tmpkeys = [],
			ret = [];
		keys.forEach(function (type) {
			Object.keys(perms[type]).forEach(function (entry) {
				if (entry == item) {
					ret.push([ type, entry ]);
				}
			});
		});
		if (ret) return ret;
	},
	isOwner: function (type, item, user) {
		if (type.match(/function|alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = permsDB.getOne(type),
				owner = false;
			if (!entry || !entry[item] || !entry[item]["owner"] && type.match(/alias|variable/i)) {
				return true; // unclaimed non-function, let 'em at it.
			}
			entry[item]["owner"].some(function (element) {
				if (ial.maskMatch(user, element)) owner = true;
			});
			return owner;
		} else {
			logger.warn("permissions.isOwner() called improperly.");
			return false;
		}
	},
	Delete: function (type, item, user) {
		// removes all permissions
		if (type.match(/alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = permsDB.getOne(type);
			if (!entry || !entry[item]) return;
			delete entry[item];
		} else {
			logger.warn("permissions.Delete() called improperly.");
		}
	},
	Modify: function (type, item, permission, action, mask) {
		if (type.match(/function|alias|variable/i) && item && permission.match(/allow|deny|owner/i) && action.match(/add|remove/i) && mask.match(/\?|\*/)) {
			logger.debug("permissions.Modify(" + [ type, item, permission, action, mask ].join(", ") + ") called");
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				permission = permission.toLowerCase(),
				action = action.toLowerCase(),
				entry = permsDB.getOne(type.toLowerCase()) || {},
				other = (permission === "deny") ? "allow" : "deny";
			if ((!entry || !entry[item] || !entry[item][permission] || entry[item][permission].length === 0) && action === "remove") {
				return "The "+item+" "+type+" has no permissions set.";
			}
			if (!entry[item]) entry[item] = {};
			if (!entry[item][permission]) entry[item][permission] = [];
			if (entry[item][permission].some(function (item) { return (item === mask); })) {
				if (action === "remove") {
					entry[item][permission] = entry[item][permission].filter(function (elem) { return (elem !== mask); });
					permsDB.saveOne(type, entry);
					return mask+" has been removed from the "+permission+" list for the "+item+" "+type+".";
				} else {
					return mask+" is already in the "+permission+" list for the "+item+" "+type+".";
				}
			} else if (action === "remove") return mask+" is not in the "+permission+" list for the "+item+" "+type+".";
			// remove from the opposite list if they're in it and we're adding an allow/deny
			if (permission !== "owner" && action === "add" && (entry[item][other] && entry[item][other].length > 0)) {
				entry[item][other] = entry[item][other].filter(function (elem) { return (elem !== mask); });
			}
			entry[item][permission].push(mask);
			permsDB.saveOne(type, entry);
			return mask+" has been added to the "+permission+" list for the "+item+" "+type+".";
		} else {
			logger.warn("permissions.Modify("+ [ type, item, permission, action, mask ].join(", ") +") called incorrectly.");
			return this.Syntax + " - " + this.Example;
		}
	},
	List: function (type, item, permission) {
		if (type.match(/function|alias|variable/i) && item && permission.match(/allow|deny|owner/i)) {
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = permsDB.getOne(type);
			if (!entry || !entry[item] || !entry[item][permission] || entry[item][permission].length === 0) return;
			return entry[item][permission];
		} else {
			logger.warn("permissions.List() called improperly.");
			return;
		}
	},
	Allow: {
		Add: function (type, item, mask) {
			return permissions.Modify(type, item, "allow", "add", mask);
		},
		Remove: function (type, item, mask) {
			return permissions.Modify(type, item, "allow", "remove", mask);
		},
		List: function (type, item) {
			if (type.match(/function|alias|variable/i) && item) {
				var list = permissions.List(type, item, "allow");
				if (list) return item+" "+type+" -> Allow: "+list.join(", ");
				return "The "+item+" "+type+" has no allow permissions set, if it exists.";
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		}
	},
	Deny: {
		Add: function (type, item, mask) {
			return permissions.Modify(type, item, "deny", "add", mask);
		},
		Remove: function (type, item, mask) {
			return permissions.Modify(type, item, "deny", "remove", mask);
		},
		List: function (type, item) {
			if (type.match(/function|alias|variable/i) && item) {
				var list = permissions.List(type, item, "deny");
				if (list) return item+" "+type+" -> Deny: "+list.join(", ");
				return "The "+item+" "+type+" has no deny permissions set, if it exists.";
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		}
	},
	Owner: {
		Add: function (user, type, item, mask) {
			if (type.match(/function|alias|variable/i) && item && mask.match(/\?|\*/) && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, user)) {
					return permissions.Modify(type, item, "owner", "add", mask);
				} else {
					return "You need to be the owner to add others.";
				}
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		},
		Remove: function (user, type, item, mask) {
			if (type.match(/function|alias|variable/i) && item && mask.match(/\?|\*/) && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, user)) {
					return permissions.Modify(type, item, "owner", "remove", mask);
				} else {
					return "You need to be the owner to remove others.";
				}
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		},
		List: function (user, type, item) {
			if (type.match(/function|alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, user)) {
					var list = permissions.List(type, item, "owner");
					if (list) return item+" "+type+" -> Owner: "+list.join(", ");
					return "The "+item+" "+type+" has no owners set, if it exists.";
				} else {
					return "You need to be an owner to list others.";
				}
			}
		}
	}
};
