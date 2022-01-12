import { Idl } from "@project-serum/anchor";
import { ConfirmOptions, PublicKey } from "@solana/web3.js";
import { ClusterConfig, Config } from "./types/config.types";
import { RPCEndpoint, SolanaCluster } from "./types/solana.types";
import IDL from "./credix.json";

/// PREFILLED CONFIGS
const localnetConfig: ClusterConfig = {
	name: SolanaCluster.LOCALNET,
	RPCEndpoint: RPCEndpoint.LOCALNET,
	programId: new PublicKey("DnKntCMeFpwFMpegCsbYdmLhQaKULPbAmcivfX917PNL"),
	gatewayProgramId: new PublicKey("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"),
};

const devnetConfig: ClusterConfig = {
	name: SolanaCluster.DEVNET,
	RPCEndpoint: RPCEndpoint.DEVNET,
	programId: new PublicKey("DnKntCMeFpwFMpegCsbYdmLhQaKULPbAmcivfX917PNL"),
	gatewayProgramId: new PublicKey("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"),
};

const mainnetConfig: ClusterConfig = {
	name: SolanaCluster.MAINNET,
	RPCEndpoint: RPCEndpoint.MAINNET,
	programId: new PublicKey("CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX"),
	gatewayProgramId: new PublicKey("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"),
};
///

const getTargetClusterFromEnv = (): SolanaCluster => {
	const targetCluster = process.env.REACT_APP_CLUSTER;

	if (targetCluster) {
		if (!Object.values(SolanaCluster).some((c) => c === targetCluster)) {
			throw new Error(`Invalid cluster targeted ${targetCluster}`);
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
		case SolanaCluster.MAINNET:
			return mainnetConfig;
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

const getGatewayProgramIdFromEnv = (): PublicKey | undefined => {
	const key = process.env.REACT_APP_GATEWAY_PROGRAM_ID;

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

	const gatewayProgramId = getGatewayProgramIdFromEnv() || baseClusterConfig.gatewayProgramId;

	if (!gatewayProgramId) {
		throw new Error("No gateway program id provided");
	}

	const clusterConfig: ClusterConfig = {
		...baseClusterConfig,
		RPCEndpoint: rpcEndpoint,
		programId,
		gatewayProgramId,
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
	const MANAGEMENT_KEYS = [
		"Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
		"Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
	];

	return {
		clusterConfig,
		idl: IDL as Idl,
		confirmOptions,
		managementKeys: MANAGEMENT_KEYS,
	};
})();
