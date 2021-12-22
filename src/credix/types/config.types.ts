import { Idl } from "@project-serum/anchor";
import { ConfirmOptions, PublicKey } from "@solana/web3.js";
import { RPCEndpoint, SolanaCluster } from "./solana.types";

export interface ClusterConfig {
	name: SolanaCluster;
	RPCEndpoint: RPCEndpoint;
	programId: PublicKey;
}

export interface Config {
	clusterConfig: ClusterConfig;
	idl: Idl;
	confirmOptions: ConfirmOptions;
}
