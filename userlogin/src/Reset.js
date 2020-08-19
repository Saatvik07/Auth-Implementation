import React, { useState } from "react";
import { useParams, useHistory, withRouter } from "react-router-dom";

function Reset() {
	const { token } = useParams();
	const [newPass, setNewPass] = useState("");
	const [changed, setChanged] = useState(0);
	const history = useHistory();
	let changedPrompt;
	if (changed === 1) {
		changedPrompt = (
			<h2>
				Changed the password <br /> Redirecting.....
			</h2>
		);
	} else if (changed === 2) {
		changedPrompt = <h2>The token is invalid</h2>;
	}
	const clickHandler = () => {
		const fetchOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ newPassword: newPass }),
		};
		fetch("http://localhost:8080/reset_password", fetchOptions).then(async (response) => {
			if (response.ok) {
				const message = await response.json();
				if (message.message === "changed successfully") {
					setChanged(1);
					setTimeout(() => {
						history.push("/login");
					}, 2000);
				}
			} else if (response.status === 401 || response.status === 404) {
				setChanged(2);
			}
		});
	};
	return (
		<div>
			<label>Enter the new password</label>
			<input
				type='password'
				value={newPass}
				onChange={(event) => {
					setNewPass(event.target.value);
				}}
			/>
			<button onClick={clickHandler}>Change Password</button>
			{changedPrompt}
		</div>
	);
}

export default withRouter(Reset);
