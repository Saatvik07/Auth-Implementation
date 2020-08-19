require("dotenv").config();
const { google } = require("googleapis");
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const mongoose = require("mongoose");
const errorHandler = require("errorhandler");
const cors = require("cors");
const userModel = require("./models/userModel");
const tempUserModel = require("./models/tempUserModel");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const PORT = process.env.PORT || 8080;
let transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASSWORD,
	},
});
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookieParser());

app.use(express.json());
app.use(morgan("dev"));
mongoose.connect(
	`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@reviewerdb.n4mee.mongodb.net/USERS?retryWrites=true&w=majority`,
	{ useUnifiedTopology: true, useNewUrlParser: true },
	(error) => {
		if (error) {
			console.log("Trouble Connecting to USERS DB", error);
		} else {
			console.log("Connected to USERS DB");
		}
	},
);
const verifyRefreshToken = (req, res, next) => {
	const access_token = req.headers.authorization.split(" ")[1];
	if (access_token) {
		jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, id) => {
			if (err && err.name === "TokenExpiredError") {
				const sessionID = req.headers.sessionID;
				const refresh_token = req.cookies[`refresh_token${sessionID}`];
				if (refresh_token) {
					jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, id) => {
						if (err) {
							res.status(401).send("refresh token not verified");
						} else {
							userModel.findById(id.sub, (err, doc) => {
								if (err) {
									res.status(404).send("Cannot find user");
								} else {
									if (doc && doc.refreshTokens.includes(refresh_token)) {
										const new_access_token = jwt.sign(
											{ sub: doc._id },
											process.env.ACCESS_TOKEN_SECRET,
											{
												expiresIn: "10m",
											},
										);
										req.headers.authorization = `Bearer ${new_access_token}`;
										console.log("Created new access token");
										next();
									} else {
										res.status(401).send("Refresh token doesn't match");
									}
								}
							});
						}
					});
				} else {
					res.sendStatus(401);
				}
			} else {
				next();
			}
		});
	} else {
		res.send(401);
	}
};
app.post("/users/create", async (req, res, next) => {
	try {
		userModel.find({ email: req.body.email }, async (err, doc) => {
			if (err) {
				res.sendStatus(500);
			} else if (doc[0]) {
				res.sendStatus(403);
			} else {
				const encryptedPassword = await bcrypt.hash(req.body.password, 10);
				const newUser = {
					username: req.body.username,
					email: req.body.email,
					password: encryptedPassword,
				};
				let newTempUser = tempUserModel(newUser);
				newTempUser.save((error, doc) => {
					if (error) {
						console.log("Cannot add temp user to db", error);
					} else {
						console.log("Successfully added user");
						newTempUser = doc;
					}
				});
				const access_token = jwt.sign({ sub: newTempUser._id }, process.env.ACCESS_TOKEN_SECRET, {
					expiresIn: "12h",
				});
				const url = `http://localhost:3000/verify/${access_token}`;
				const mailOptions = {
					to: `${req.body.email}`,
					from: process.env.EMAIL,
					subject: "Email Verification Link",
					html: `<div style='background:linear-gradient(90deg, rgba(9,9,121,1) 35%, rgba(0,212,255,1) 100%);;width:60%;margin:20px auto;padding:50px;'><h1 style="display:block;color:white; margin:20px;font-family:sans-serif">Hi,<h1><h3 style="display:block;margin:20px;font-family:sans-serif;color:white">This is just an email verification mail for ${req.body.username}<h3><br><br><a href=${url}><button style="display:block;padding:20px 30px;background-color:white;color:#090979;font-size:16px;font-weight:bold;border:none;border-radius:10px;margin:0px 20px;">Click Here</button></a></div>`,
				};
				transporter.sendMail(mailOptions, (err) => {
					if (err) {
						console.log("Error occurred ", err);
					} else {
						console.log(`Sent email to ${req.body.email}`);
					}
				});
				res.sendStatus(201);
			}
		});
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});
app.get("/login_successful/:token", (res, req, next) => {
	const tokens = fetch(`http://localhost:8080/verify/${req.params.token}`).then((response) => {
		if (response.ok) {
			return response;
		} else {
			res.sendStatus(403);
		}
	});
	if (tokens) {
		res.status(200).send(tokens).redirect();
	}
});
app.post("/refresh_token", (req, res, next) => {
	const sessionID = req.body.sessionID;
	const refresh_token = req.cookies[`refresh_token${sessionID}`];
	if (refresh_token) {
		jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, id) => {
			if (err) {
				res.status(401).send("refresh token not verified");
			} else {
				userModel.findById(id.sub, (err, doc) => {
					if (err) {
						res.status(404).send("Cannot find user");
					} else {
						if (doc && doc.refreshTokens.includes(refresh_token)) {
							const new_access_token = jwt.sign({ sub: doc._id }, process.env.ACCESS_TOKEN_SECRET, {
								expiresIn: "15m",
							});
							res.json(new_access_token);
						} else {
							res.status(401).send("Refresh token doesn't match");
						}
					}
				});
			}
		});
	} else {
		res.status(401).send("No refresh_token");
	}
});
app.post("/login", async (req, res, next) => {
	userModel.find({ email: req.body.email }, async (err, doc) => {
		if (err) {
			res.sendStatus(404);
		} else {
			if (doc[0]) {
				const userId = doc[0]._id;
				const userPassword = doc[0].password;
				const refresh_token_array = doc[0].refreshTokens;
				try {
					const result = await bcrypt.compare(req.body.pass, userPassword);
					if (result) {
						const refresh_token = jwt.sign({ sub: userId }, process.env.REFRESH_TOKEN_SECRET);
						refresh_token_array.push(refresh_token);
						userModel.findByIdAndUpdate(
							userId,
							{ refreshTokens: refresh_token_array },
							{ new: true },
							(err, result) => {
								if (err) {
									console.log("Cannot update refresh token");
									res.sendStatus(401);
								} else {
									const access_token = jwt.sign({ sub: userId }, process.env.ACCESS_TOKEN_SECRET);
									const sessionID = crypto.randomBytes(32).toString("hex");
									res.cookie(`refresh_token${sessionID}`, refresh_token, { httpOnly: true });
									res.status(200).send({
										password: "Success",
										access_token: access_token,
										sessionID: sessionID,
									});
								}
							},
						);
					} else {
						res.sendStatus(401);
					}
				} catch {
					console.log(doc);
					res.sendStatus(500);
				}
			} else {
				res.sendStatus(404);
			}
		}
	});
});
app.post("/verify", (req, res, next) => {
	const access_token = req.headers.authorization.split(" ")[1];
	if (!access_token) {
		res.status(401).send("No access token");
	}
	jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, doc) => {
		if (err) {
			res.status(401).send("access token not verified");
		} else {
			const id = doc.sub;
			tempUserModel.findById(id, (err, doc) => {
				if (err) {
					res.status(401).send("not found in temp user model");
				} else {
					const tempUserId = doc._id;
					const obj = {
						username: doc.username,
						email: doc.email,
						password: doc.password,
					};
					const newUser = userModel(obj);
					newUser.save((error, user) => {
						if (error) {
							console.log("Cannot add permanent user", error);
						} else {
							const userId = { sub: user._id };
							const access_token = jwt.sign(userId, process.env.ACCESS_TOKEN_SECRET, {
								expiresIn: "15m",
							});
							const refresh_token = jwt.sign(userId, process.env.REFRESH_TOKEN_SECRET);
							const refresh_token_array = [refresh_token];
							userModel.findByIdAndUpdate(
								user._id,
								{ refreshTokens: refresh_token_array },
								{ new: true },
								(error, result) => {
									if (error) {
										console.log("Cannot save the refresh token");
									} else {
										tempUserModel.findByIdAndDelete(tempUserId, (err, doc) => {
											if (err) {
												console.log("Cannot delete Temporary User");
												res.sendStatus(500);
											}
										});
										const sessionID = crypto.randomBytes(32).toString("hex");
										res.cookie(`refresh_token${sessionID}`, refresh_token, { httpOnly: true });
										return res
											.status(201)
											.send({ access_token: access_token, sessionID: sessionID });
									}
								},
							);
						}
					});
				}
			});
		}
	});
});

app.get("/user", verifyRefreshToken, (req, res, next) => {
	const access_token = req.headers.authorization.split(" ")[1];
	const id = jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, result) => {
		if (err) {
			console.log("Couldn't verify access token ");
			res.sendStatus(403);
		} else {
			return result.sub;
		}
	});
	userModel.findById(id, (err, doc) => {
		if (err) {
			console.log("Cannot find user with the given ID", err);
			res.sendStatus(404);
		} else {
			res
				.status(200)
				.send({ username: doc.username, email: doc.email, access_token: access_token });
		}
	});
});
app.post("/logout", (req, res, next) => {
	const access_token = req.headers.authorization.split(" ")[1];
	const sessionID = req.body.sessionID;
	const current_refresh_token = req.cookies[`refresh_token${sessionID}`];
	jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, id) => {
		if (err) {
			console.log(err);
			res.sendStatus(401);
		} else {
			const userId = id["sub"];
			userModel.findById(userId, (err, doc) => {
				if (err) {
					res.sendStatus(404);
				} else {
					const refresh_token_array = doc.refreshTokens.filter((token) => {
						return current_refresh_token != token;
					});
					userModel.findByIdAndUpdate(userId, { refreshTokens: refresh_token_array }, (err) => {
						if (err) {
							console.log("Did not log out successfully");
							res.sendStatus(401);
						} else {
							console.log("Logged Out successfully");
							res.clearCookie(`refresh_token${sessionID}`);
							res.status(200).send({ message: "logged out" });
						}
					});
				}
			});
		}
	});
});
app.post("/forgot_password", (req, res, next) => {
	const email = req.body.email;
	userModel.find({ email: email }, (err, doc) => {
		if (err) {
			res.sendStatus(404);
		} else {
			if (doc[0]) {
				const id = doc[0]._id;
				const access_token = jwt.sign({ sub: id }, process.env.ACCESS_TOKEN_SECRET, {
					expiresIn: "30m",
				});
				const url = `http://localhost:3000/reset_password/${access_token}`;
				const mailOptions = {
					to: `${email}`,
					from: process.env.EMAIL,
					subject: "Password Change Request",
					html: `<div style='background-color: #FBAB7E;background-image: linear-gradient(62deg, #FBAB7E 0%, #F7CE68 100%);width:60%;margin:20px auto;padding:50px;'><h1 style="display:block;color:white; margin:20px;font-family:sans-serif">Hi,<h1><h3 style="display:block;margin:20px;font-family:sans-serif;color:white">This is a password reset request for ${doc[0].username}<h3><br><br><a href=${url}><button style="display:block;padding:20px 30px;background-color:white;color:#090979;font-size:16px;font-weight:bold;border:none;border-radius:10px;margin:0px 20px;">Click Here</button></a></div>`,
				};
				transporter.sendMail(mailOptions, (err) => {
					if (err) {
						console.log("Cannot send the mail");
					} else {
						console.log(`Sent the email to ${email}`);
						res.status(200).send({ message: `Sent the password change email to ${email}` });
					}
				});
			} else {
				res.sendStatus(404);
			}
		}
	});
});
app.post("/reset_password", async (req, res, next) => {
	const access_token = req.headers.authorization.split(" ")[1];
	jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, async (err, result) => {
		if (err) {
			console.log(err);
			res.sendStatus(401);
		} else {
			const id = result["sub"];
			const encryptedPassword = await bcrypt.hash(req.body.newPassword, 10);
			console.log("User ID", id);
			userModel.findByIdAndUpdate(id, { password: encryptedPassword }, { new: true }, (err) => {
				if (err) {
					res.sendStatus(404);
				} else {
					res.status(200).send({ message: "changed successfully" });
				}
			});
		}
	});
});
const googleConfig = {
	clientId: process.env.GOOGLE_CLIENT_ID, // e.g. asdfghjkljhgfdsghjk.apps.googleusercontent.com
	clientSecret: process.env.GOOGLE_CLIENT_SECRET, // e.g. _ASDFA%DFASDFASDFASD#FAD-
	redirect: process.env.GOOGLE_REDIRECT_URL, // this must match your google api settings
};
const defaultScope = [
	"https://www.googleapis.com/auth/userinfo.email",
	"https://www.googleapis.com/auth/userinfo.profile",
];
const oauth2client = new google.auth.OAuth2(
	googleConfig.clientId,
	googleConfig.clientSecret,
	googleConfig.redirect,
);
app.get("/generate_url", async (req, res, next) => {
	const url = await oauth2client.generateAuthUrl({
		access_type: "offline",
		prompt: "consent",
		scope: defaultScope,
	});
	res.status(200).send({ authURL: url });
});
app.post("/new_google_login", async (req, res, next) => {
	const code = req.body.code;
	const { tokens } = oauth2client.getToken(code);
	const payload = await jwt.decode(tokens.id_token);
	const username = payload.name;
	const email = payload.email;
	userModel.find({ email: email }, (err, doc) => {
		if (err) {
			res.sendStatus(403);
		} else if (doc[0]) {
			const userID = doc[0]._id;
			const refresh_token_array = doc[0].refreshTokens;
			const refresh_token = jwt.sign({ sub: userID }, process.env.REFRESH_TOKEN_SECRET);
			refresh_token_array.push(refresh_token);
			console.log("Sign-in user ", refresh_token_array);
			userModel.findByIdAndUpdate(
				userID,
				{ refreshTokens: refresh_token_array },
				{ new: true },
				(err, result) => {
					if (err) {
						console.log("Cannot update refresh tokens", err);
					} else {
						console.log("new Document", result);
					}
				},
			);
			const sessionID = crypto.randomBytes(32).toString("hex");
			res.cookie(`refresh_token${sessionID}`, refresh_token, { httpOnly: true });
			const access_token = jwt.sign({ sub: userID }, process.env.ACCESS_TOKEN_SECRET);
			res.status(200).send({ access_token: access_token, sessionID: sessionID });
		} else {
			const newUser = userModel({ email: email, username: username });
			newUser.save((err, doc) => {
				if (err) {
					console.log("Cannot save in DB");
					res.send(500);
				} else {
					console.log("Saved in user DB");
					const userID = doc._id;
					const refresh_token = jwt.sign({ sub: userID }, process.env.REFRESH_TOKEN_SECRET);
					const access_token = jwt.sign({ sub: userID }, process.env.ACCESS_TOKEN_SECRET, {
						expiresIn: "15m",
					});
					const refresh_token_array = [refresh_token];
					const sessionID = crypto.randomBytes(32).toString("hex");
					res.cookie(`refresh_token${sessionID}`, refresh_token, { httpOnly: true });
					userModel.findByIdAndUpdate(userID, { refreshTokens: refresh_token_array }, (err) => {
						if (err) {
							console.log("Cannot save the refresh token in DB");
							res.send(500);
						}
					});
					res.status(201).send({ access_token: access_token, sessionID: sessionID });
				}
			});
		}
	});
});
app.use(errorHandler());
app.listen(PORT, () => {
	console.log(`Listening at port ${PORT}`);
});
