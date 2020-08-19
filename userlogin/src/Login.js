import React, { useState, useContext } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { UserContext } from "./UserContext";
function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [wrongCred, setWrongCred] = useState({ wrongEmail: false, wrongPassword: false });
	const { access, setAccess } = useContext(UserContext);
	const history = useHistory();
	let prompt;
	if (wrongCred.wrongEmail) {
		prompt = <h3 style={{ backgroundColor: "orange", opacity: 0.7 }}>Incorrect email</h3>;
	} else if (wrongCred.wrongPassword) {
		prompt = <h3 style={{ backgroundColor: "red", opacity: 0.7 }}>Incorrect password</h3>;
	}
	const googleSignInHandler = () => {
		fetch("http://localhost:8080/generate_url").then(async (response) => {
			if (response.ok) {
				let url = await response.json();
				url = url.authURL;
				window.location.href = url;
			}
		});
	};
	return (
		<div>
			<div>
				<label for='email'>Email</label>
				<input
					type='email'
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
					id='email'
				/>
			</div>
			<div>
				<label for='pass'>Password</label>
				<input
					type='password'
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
					}}
					id='pass'
				/>
			</div>
			<div>
				<button
					onClick={() => {
						const fetchOptions = {
							method: "POST",
							headers: {
								"Content-type": "application/json",
							},

							body: JSON.stringify({ email: email, pass: password }),
							credentials: "include",
						};
						fetch("http://localhost:8080/login", fetchOptions).then(async (response) => {
							if (response.ok) {
								const resObj = await response.json();
								setAccess(resObj.access_token);
								sessionStorage.setItem("sessionID", resObj.sessionID);
								history.push("/user");
							} else if (response.status === 404) {
								setWrongCred({
									wrongPassword: false,
									wrongEmail: true,
								});
							} else if (response.status === 401) {
								setWrongCred({
									wrongEmail: false,
									wrongPassword: true,
								});
							}
						});
					}}
				>
					Login
				</button>
				<button onClick={googleSignInHandler}>Sign in with Google</button>
				<button
					onClick={() => {
						history.push("/forgot_password");
					}}
				>
					Forgot Password
				</button>
				{prompt}
			</div>
		</div>
	);
}

export default withRouter(Login);
