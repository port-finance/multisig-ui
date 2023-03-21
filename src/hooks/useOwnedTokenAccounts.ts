import { Provider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
// import { acc } from "@solana/spl-token";
import { getOwnedTokenAccounts } from "../components/Multisig";

export function useMultiSigOwnedTokenAccounts(
	provider: Provider,
	multiSig: PublicKey,
	programId: PublicKey
): any[] {
	const [results, setResults] = useState<any[]>([]);

	useEffect(() => {
		const connection = provider.connection;

		const onLoad = async () => {
			const [signer, nounce] = await PublicKey.findProgramAddressSync(
				[multiSig.toBuffer()],
				programId
			);
			const ownedTokenAccounts = await getOwnedTokenAccounts(
				connection,
				signer
			);
			const ownedTokenAccountsResolved = await Promise.all(ownedTokenAccounts);
			console.log({ ownedTokenAccountsResolved });
			setResults(ownedTokenAccountsResolved);
			return ownedTokenAccountsResolved;
		};
		onLoad().then((results) => {
			console.log(
				`Fetched ${results.length} accounts for multisig ${multiSig}.`
			);
		});
		// .catch(() => {
		// 	console.error(
		// 		"Connection Failed",
		// 		`Failed to fetch token accounts owned by ${multiSig}`
		// 	);
		// });

		return () => {
			setResults([]);
		};
	}, [provider]);

	return results;
}
