export enum SolanaCluster {
	LOCALNET = "localnet",
	DEVNET = "devnet",
	MAINNET = "mainnet-beta",
}

export enum RPCEndpoint {
	LOCALNET = "http://127.0.0.1:8899",
	DEVNET = "https://api.devnet.solana.com",
	MAINNET = "https://api.mainnet-beta.solana.com",
}

export type PdaSeeds = Array<Buffer | Uint8Array>;
