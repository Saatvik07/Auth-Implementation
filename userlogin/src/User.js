import React, { useEffect, useContext, useState } from "react";
import { UserContext } from "./UserContext";
import { withRouter, useHistory, useLocation } from "react-router-dom";
function useQuery() {
	return new URLSearchParams(useLocation().search);
}
function User() {
	const { access, setAccess, sessionID } = useContext(UserContext);
	const [userName, setUserName] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const history = useHistory();
	const query = useQuery();
	let obj = {};
	let info = (
		<div>
			<h2>Name: {email}</h2>
			<h2>Email: {userName}</h2>
		</div>
	);
	useEffect(() => {
		if (query.get("code")) {
			const code = query.get("code");
			const fetchOptions = {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ code: code }),
			};
			fetch("http://localhost:8080/new_google_login", fetchOptions).then(async (response) => {
				if (response.ok) {
					let access_token = await response.json();
					sessionStorage.setItem("sessionID", access_token.sessionID);
					access_token = access_token.access_token;
					setAccess(access_token);
				}
			});
		}
		if (access) {
			let fetchOptions = {
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					authorization: `Bearer ${access}`,
					sessionID: sessionStorage.getItem("sessionID"),
				},
			};
			fetch("http://localhost:8080/user", fetchOptions)
				.then(async (response) => {
					if (response.ok) {
						obj = await response.json();
						setAccess(obj.access_token);
						setUserName(obj.username);
						setEmail(obj.email);
						setLoading(false);
					} else {
						console.log("Response not okay");
					}
				})
				.catch((err) => {
					console.log(err);
				});
		}
	}, [access]);
	return (
		<div>
			<div>
				<h3>{loading ? "loading...." : info}</h3>
				<button
					onClick={() => {
						let fetchOptions = {
							method: "POST",
							credentials: "include",
							headers: {
								"Content-Type": "application/json",
								authorization: `Bearer ${access}`,
							},
							body: JSON.stringify({ sessionID: sessionStorage.getItem("sessionID") }),
						};
						fetch("http://localhost:8080/logout", fetchOptions).then(async (response) => {
							if (response.ok) {
								const message = await response.json();
								if (message.message === "logged out") {
									sessionStorage.clear();
									history.push("/login");
								}
							}
						});
					}}
				>
					Logout
				</button>
			</div>
		</div>
	);
}

export default withRouter(User);
