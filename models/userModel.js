const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
	},
	password: {
		type: String,
	},
	refreshTokens: {
		type: Array,
	},
});
const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
