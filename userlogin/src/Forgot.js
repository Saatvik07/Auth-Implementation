import React, { useState } from "react";
import { withRouter } from "react-router-dom";
function Forgot() {
	const [email, setEmail] = useState("");
	const [sending, setSending] = useState(0);
	let sendingPrompt, message;
	if (sending === 1) {
		sendingPrompt = <h3>Sending....</h3>;
	} else if (sending === 2) {
		sendingPrompt = <h3>Please check your mail {email}</h3>;
	} else if (sending === 3) {
		sendingPrompt = <h3>No user with that email found</h3>;
	}
	return (
		<div>
			<label>Enter your registered email ID</label>
			<input
				type='email'
				value={email}
				onChange={(event) => {
					setEmail(event.target.value);
				}}
			></input>
			<button
				onClick={() => {
					setSending(1);
					const fetchOptions = {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ email: email }),
					};
					fetch("http://localhost:8080/forgot_password", fetchOptions).then(async (response) => {
						if (response.ok) {
							message = await response.json();
							if (message) {
								setSending(2);
							}
						} else if (response.status === 404) {
							setSending(3);
						}
					});
				}}
			>
				Submit
			</button>
			{sendingPrompt}
		</div>
	);
}

export default withRouter(Forgot);
