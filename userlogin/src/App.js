import React, { useContext, useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Route, Switch, Link } from "react-router-dom";
import Verification from "./Verfication";
import User from "./User";
import Login from "./Login";
import Reset from "./Reset";
import { UserContext } from "./UserContext";
import Forgot from "./Forgot";
import Register from "./Register";
function App() {
	const [access, setAccess] = useState(undefined);
	useEffect(() => {
		fetch("http://localhost:8080/refresh_token", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ sessionID: sessionStorage.getItem("sessionID") }),
		}).then(async (response) => {
			if (response.ok) {
				console.log("Page Refreshed, refresh_token generated");
				const new_access_token = await response.json();
				setAccess(new_access_token);
			} else {
				console.log("Cannot refresh the token");
			}
		});
	}, []);
	return (
		<BrowserRouter>
			<Switch>
				<UserContext.Provider value={{ access, setAccess }}>
					<Route path='/verify/:token' component={Verification} />
					<Route path='/user' component={User} />
					<Route path='/login' component={Login} />
					<Route path='/forgot_password' component={Forgot} />
					<Route path='/reset_password/:token' component={Reset} />
					<Route path='/register' component={Register} />
				</UserContext.Provider>
			</Switch>
		</BrowserRouter>
	);
}

export default App;
