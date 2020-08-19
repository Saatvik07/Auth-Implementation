import React, { useState } from "react";
import { useHistory } from "react-router-dom";

function Register() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [registered, setRegistered] = useState(0);
	const history = useHistory();
	let registeredPrompt;
	if (registered === 1) {
		registeredPrompt = (
			<h2 style={{ backgroundColor: "green", opacity: 0.7 }}>
				Thank you for signing up <br /> An email an been sent to {email}
			</h2>
		);
	} else if (registered === 2) {
		registeredPrompt = (
			<h2 style={{ backgroundColor: "red", opacity: 0.7 }}>Email ID is already in use</h2>
		);
	}
	const registerClickHandler = () => {
		const fetchOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: email, password: password, username: username }),
		};
		fetch("http://localhost:8080/users/create", fetchOptions).then((response) => {
			if (response.status === 201) {
				setRegistered(1);
				setTimeout(() => {
					window.close();
				}, 2000);
			} else if (response.status === 403) {
				setRegistered(2);
			}
		});
	};
	return (
		<div>
			<label>Email Id</label>
			<input
				type='email'
				value={email}
				onChange={(event) => {
					setEmail(event.target.value);
				}}
			></input>
			<label>Username</label>
			<input
				value={username}
				onChange={(event) => {
					setUsername(event.target.value);
				}}
			></input>
			<label>Password</label>
			<input
				type='password'
				value={password}
				onChange={(event) => {
					setPassword(event.target.value);
				}}
			></input>

			<button onClick={registerClickHandler}>Register</button>
			{registeredPrompt}
		</div>
	);
}

export default Register;
