import React, { useEffect, useState, useContext } from "react";
import { withRouter, useParams, useHistory } from "react-router-dom";
import { setAccessToken, getAccessToken } from "./accessToken";
import { UserContext } from "./UserContext";
function Verification() {
	const { token } = useParams();
	const history = useHistory();
	let ans = "";
	const [loading, setLoading] = useState(true);
	const [verified, setVerified] = useState(false);
	const { access, setAccess } = useContext(UserContext);
	useEffect(() => {
		let fetchOptions = {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				authorization: `Bearer ${token}`,
			},
		};
		fetch(`http://localhost:8080/verify`, fetchOptions).then(async (response) => {
			if (response.ok) {
				const jsonResponse = await response.json();
				setAccess(jsonResponse.access_token);
				sessionStorage.setItem("sessionID", jsonResponse.sessionID);
				setLoading(false);
				setVerified(true);
				setTimeout(() => {
					history.push("/user");
				}, 2000);
			} else {
				setLoading(false);
				setVerified(false);
			}
		});
	}, []);
	return (
		<div>
			<div>{loading ? <h3>Loading...</h3> : null}</div>
			<div>
				{!loading && verified ? (
					<h1>Thank you for verifying your email</h1>
				) : (
					<h1>Sorry we couldn't verify your email</h1>
				)}
			</div>
			{/* <div>{ans}</div> */}
		</div>
	);
}

export default withRouter(Verification);
