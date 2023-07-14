import { useLocalStorageState } from "../utils/utils";
import { Keypair, clusterApiUrl, Connection } from "@solana/web3.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { setProgramIds } from "../utils/ids";
import { ENV as ChainID } from "@solana/spl-token-registry";

export type ENV = "mainnet-beta" | "localnet" | "devnet";

export const ENDPOINTS = [
	{
		name: "mainnet-beta" as ENV,
		endpoint:
			"https://solana-api.syndica.io/access-token/E5KeCHVwoa6mIusXi3xbMD7SASJZaPMK4K09zzubNlyNkoc2GOZRZBxDpBvxhXfb/rpc",
		chainID: ChainID.MainnetBeta,
	},
	{
		name: "localnet" as ENV,
		endpoint: "http://127.0.0.1:8899",
		chainID: ChainID.Devnet,
	},
	{
		name: "devnet" as ENV,
		endpoint: clusterApiUrl("devnet"),
		chainID: ChainID.Devnet,
	},
];

const DEFAULT = ENDPOINTS[0].endpoint;

interface ConnectionConfig {
	connection: Connection;
	sendConnection: Connection;
	endpoint: string;
	env: ENV;
	setEndpoint: (val: string) => void;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
	endpoint: DEFAULT,
	setEndpoint: () => {},
	connection: new Connection(DEFAULT, "recent"),
	sendConnection: new Connection(DEFAULT, "recent"),
	env: ENDPOINTS[0].name,
});

export function ConnectionProvider({ children = undefined as any }) {
	const [endpoint, setEndpoint] = useState(ENDPOINTS[0].endpoint);
	const connection = useMemo(
		() => new Connection(endpoint, "recent"),
		[endpoint]
	);
	const sendConnection = useMemo(
		() => new Connection(endpoint, "recent"),
		[endpoint]
	);

	const chain =
		ENDPOINTS.find((end) => end.endpoint === endpoint) || ENDPOINTS[0];
	const env = chain.name;

	setProgramIds(env);

	// The websocket library solana/web3.js uses closes its websocket connection when the subscription list
	// is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
	// This is a hack to prevent the list from every getting empty
	useEffect(() => {
		const id = connection.onAccountChange(new Keypair().publicKey, () => {});
		return () => {
			connection.removeAccountChangeListener(id);
		};
	}, [connection]);

	useEffect(() => {
		const id = connection.onSlotChange(() => null);
		return () => {
			connection.removeSlotChangeListener(id);
		};
	}, [connection]);

	useEffect(() => {
		const id = sendConnection.onAccountChange(
			new Keypair().publicKey,
			() => {}
		);
		return () => {
			sendConnection.removeAccountChangeListener(id);
		};
	}, [sendConnection]);

	useEffect(() => {
		const id = sendConnection.onSlotChange(() => null);
		return () => {
			sendConnection.removeSlotChangeListener(id);
		};
	}, [sendConnection]);

	return (
		<ConnectionContext.Provider
			value={{
				endpoint,
				setEndpoint,
				connection,
				sendConnection,
				env,
			}}
		>
			{children}
		</ConnectionContext.Provider>
	);
}

export function useConnection() {
	return useContext(ConnectionContext).connection as Connection;
}

export function useSendConnection() {
	return useContext(ConnectionContext)?.sendConnection;
}

export function useConnectionConfig() {
	const context = useContext(ConnectionContext);
	return {
		endpoint: context.endpoint,
		setEndpoint: context.setEndpoint,
		env: context.env,
	};
}
