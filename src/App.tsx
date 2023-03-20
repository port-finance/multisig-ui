import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { HashRouter, Route } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { MuiThemeProvider } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { unstable_createMuiStrictModeTheme as createMuiTheme } from "@material-ui/core/styles";
import { PublicKey } from "@solana/web3.js";
import Layout from "./components/Layout";
import Multisig from "./components/Multisig";
import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { ConnectionProvider } from "./context/connection";
import "./App.css";
import { AccountProvider } from "./context/AccountContext";

function App() {
	const theme = createMuiTheme({
		palette: {
			background: {
				default: "rgb(255,255,255)",
			},
		},
		typography: {
			fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
		},
		overrides: {},
	});
	const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

	return (
		<MuiThemeProvider theme={theme}>
			<CssBaseline />
			<SnackbarProvider maxSnack={5} autoHideDuration={8000}>
				<ConnectionProvider>
					<WalletProvider wallets={wallets} autoConnect>
						<WalletDialogProvider>
							<AccountProvider>
								<HashRouter basename={"/"}>
									<Layout>
										<Route path="/" element={<MultisigPage />} />
										<Route
											path="/:address"
											element={<MultisigInstancePage />}
										/>
									</Layout>
								</HashRouter>
							</AccountProvider>
						</WalletDialogProvider>
					</WalletProvider>
				</ConnectionProvider>
			</SnackbarProvider>
		</MuiThemeProvider>
	);
}

function MultisigPage() {
	const multisig = new PublicKey(
		"AM194gsNqRnmu8CZKi5GBPRGMC4Bq4Egkj2GQ4Yz4JZ4"
	);
	return <Multisig multisig={multisig} />;
}

export function MultisigInstancePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const path = location.pathname.split("/");
	if (path.length !== 2) {
		navigate(`/multisig`);
		return <></>;
	} else {
		const multisig = new PublicKey(path[1]);
		return <Multisig multisig={multisig} />;
	}
}

export default App;
