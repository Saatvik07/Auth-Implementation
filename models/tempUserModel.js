const mongoose = require("mongoose");
const tempUserSchema = new mongoose.Schema({
	expires_at: {
		type: Date,
		default: Date.now,
		expires: 43200,
	},
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
		required: true,
	},
});

const tempUserModel = mongoose.model("Temp", tempUserSchema);
module.exports = tempUserModel;
