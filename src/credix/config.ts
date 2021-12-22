import { Idl } from "@project-serum/anchor";
import { ConfirmOptions, PublicKey } from "@solana/web3.js";
import { ClusterConfig, Config } from "./types/config.types";
import { RPCEndpoint, SolanaCluster } from "./types/solana.types";
import idl from "./credix.json";

/// PREFILLED CONFIGS
const localnetConfig: ClusterConfig = {
	name: SolanaCluster.LOCALNET,
	RPCEndpoint: RPCEndpoint.LOCALNET,
	programId: new PublicKey("B7PiFKNiBvQPMVtsJt8bM86U69a1ivev4VvnkLViMiUZ"),
};

const devnetConfig: ClusterConfig = {
	name: SolanaCluster.DEVNET,
	RPCEndpoint: RPCEndpoint.DEVNET,
	programId: new PublicKey("B7PiFKNiBvQPMVtsJt8bM86U69a1ivev4VvnkLViMiUZ"),
};
///

const getTargetClusterFromEnv = (): SolanaCluster => {
	const targetCluster = process.env.REACT_APP_CLUSTER;

	if (targetCluster) {
		if (!Object.values(SolanaCluster).some((c) => c === targetCluster)) {
			throw new Error(`Invalid cluster targetted ${targetCluster}`);
		}

		return targetCluster as SolanaCluster;
	}

	return SolanaCluster.LOCALNET;
};

const getBaseClusterConfig = (): ClusterConfig => {
	const targetCluster = getTargetClusterFromEnv();

	switch (targetCluster) {
		case SolanaCluster.DEVNET:
			return devnetConfig;
		default:
			return localnetConfig;
	}
};

const getRPCEndpointFromEnv = (): RPCEndpoint | undefined => {
	const endpoint = process.env.REACT_APP_RPC_ENDPOINT;

	if (endpoint) {
		if (!Object.values(RPCEndpoint).some((e) => e === endpoint)) {
			throw new Error(`Invalid rpc endpoint ${endpoint}`);
		}

		return endpoint as RPCEndpoint;
	}
};

const getProgramIdFromEnv = (): PublicKey | undefined => {
	const key = process.env.REACT_APP_PROGRAM_ID;

	if (key) {
		return new PublicKey(key);
	}
};

const getClusterConfig = (): ClusterConfig => {
	const baseClusterConfig = getBaseClusterConfig();

	const rpcEndpoint = getRPCEndpointFromEnv() || baseClusterConfig.RPCEndpoint;

	if (!rpcEndpoint) {
		throw new Error("No RPC endpoint provided");
	}

	const programId = getProgramIdFromEnv() || baseClusterConfig.programId;

	if (!programId) {
		throw new Error("No program id provided");
	}

	const clusterConfig: ClusterConfig = {
		...baseClusterConfig,
		RPCEndpoint: rpcEndpoint,
		programId,
	};

	return clusterConfig;
};

export const config: Config = ((): Config => {
	const clusterConfig = getClusterConfig();
	// TODO: see what these options should be
	// TODO: make these configurable with environment variables
	const confirmOptions: ConfirmOptions = {
		commitment: "processed",
		preflightCommitment: "processed",
	};

	return {
		clusterConfig,
		idl: idl as Idl,
		confirmOptions,
	};
})();
