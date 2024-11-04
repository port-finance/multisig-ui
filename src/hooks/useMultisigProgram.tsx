import { Program, AnchorProvider, Wallet } from "@project-serum/anchor";
import { CredixClient, CredixClientConfig } from "@credix/credix-client";
import { ConfirmOptions, Keypair, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import MultisigIdl from "../idl";
import { getMultisigProgramIdByUrl } from "../utils/ids";
import { useConnection } from "../context/connection";
import { Transaction } from "@solana/web3.js";

class MyWallet implements Wallet {
	constructor(readonly payer: Keypair) {
		this.payer = payer;
	}

	async signTransaction(tx: Transaction): Promise<Transaction> {
		tx.partialSign(this.payer);
		return tx;
	}

	async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
		return txs.map((t) => {
			t.partialSign(this.payer);
			return t;
		});
	}

	get publicKey(): PublicKey {
		return this.payer.publicKey;
	}
}

export function useMultisigProgram(): [Program, CredixClient, AnchorProvider] {
	const wallet = useAnchorWallet();
	const connection = useConnection();

	return useMemo(() => {
		console.log("here");
		const opts: ConfirmOptions = {
			preflightCommitment: "finalized",
			commitment: "finalized",
		};
		const currentNetwork = (connection as any)._rpcEndpoint;
		const currentMultisigProgramId = getMultisigProgramIdByUrl(currentNetwork);

		const programId = new PublicKey(
			"CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX"
		);
		console.log("here 2");
		const config: CredixClientConfig = {
			programId: programId,
			secondaryMarketProgramId: programId,
			scowProgramId: programId,
			variableRatesProgramId: programId,
			confirmOptions: opts,
		};
		let provider = new AnchorProvider(
			connection,
			wallet ?? new MyWallet(Keypair.generate()),
			opts
		);
		console.log("here 3");
		let newProgram = new Program(
			MultisigIdl,
			currentMultisigProgramId,
			provider
		);
		console.log("here 4");
		let newCredixClient = new CredixClient(
			connection,
			wallet as MyWallet,
			config
		);
		console.log("here 5");
		return [newProgram, newCredixClient, provider];
	}, [wallet, connection]);
}
