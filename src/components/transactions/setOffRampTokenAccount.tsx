import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Button,
	Checkbox,
} from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { ProgramAccount } from "@project-serum/anchor";
import { useSnackbar } from "notistack";
import { useState, useEffect, useCallback } from "react";
import { config } from "../../credix/config";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";

import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { SEEDS, TX_SIZE } from "../../credix/consts";
import {
	Market,
	Deal,
	DealStatus,
	Tranches,
	Tranche,
	Fraction,
	UpdateGlobalMarketConfig,
	UpdateProgramStateConfig,
} from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";
import { ProgramState } from "@credix/credix-client/dist/idl/idl.types";

export function SetOffRampTokenAccountListItem({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<ListItem button onClick={() => setOpen((open) => !open)}>
				<ListItemIcon>
					<img
						src="/credix.svg"
						alt="Credix Logo"
						style={{ width: "20px", marginLeft: "3px" }}
					/>
				</ListItemIcon>
				<ListItemText primary={"Set off ramp token account"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<SetOffRampTokenAccountListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function SetOffRampTokenAccountListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [offRampTokenAccount, setOffRampTokenAccount] = useState<string>();
	const [collectionAccount, setCollectionAccount] = useState<string>();
	const [arrangementFeeCollectionAccount, setArrangementFeeCollectionAccount] =
		useState<string>();
	const [deal, setDeal] = useState<string>();
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const onBlurOffRampTokenAccount = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setOffRampTokenAccount(e.target.value);
	};

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setDeal(e.target.value);
		const dealPk = new PublicKey(e.target.value);
		const dealAcc = await credixClient.fetchDealByPublicKey(dealPk);
		const collectionTA = dealAcc?.collectionTokenAccount;
		setCollectionAccount(collectionTA?.toString());
		const arrangementFeeCollectionTA =
			dealAcc?.arrangementFeeCollectionTokenAccount;
		setArrangementFeeCollectionAccount(arrangementFeeCollectionTA?.toString());
		const offRampTA = dealAcc?.offRampTokenAccount;
		setOffRampTokenAccount(offRampTA?.toString());
	};

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		if (deal && offRampTokenAccount) {
			const dealAcc = await credixClient.fetchDealByPublicKey(
				new PublicKey(deal)
			);

			const [multisigSigner] = await PublicKey.findProgramAddress(
				[multisig.toBuffer()],
				multisigClient.programId
			);

			const offRampTokenAccountPk = new PublicKey(offRampTokenAccount);
			console.log(dealAcc);
			console.log(offRampTokenAccountPk);
			console.log("multisig", multisigSigner.toString());
			const setCollectionAndOffRampTokenAccountsIx =
				await dealAcc?.setCollectionAndOffRampTokenAccountsIx(
					offRampTokenAccountPk,
					multisigSigner
				);
			console.log(setCollectionAndOffRampTokenAccountsIx);
			const transaction = new Account();
			const tx = await multisigClient.rpc.createTransaction(
				config.clusterConfig.programId,
				// @ts-ignore
				setCollectionAndOffRampTokenAccountsIx.keys,
				// @ts-ignore
				Buffer.from(setCollectionAndOffRampTokenAccountsIx.data),
				{
					// @ts-ignore
					accounts: {
						multisig,
						transaction: transaction.publicKey,
						proposer: multisigClient.provider.publicKey as PublicKey,
						rent: SYSVAR_RENT_PUBKEY,
					},
					signers: [transaction],
					instructions: [
						await multisigClient.account.transaction.createInstruction(
							transaction,
							// @ts-ignore
							TX_SIZE + 500
						),
					],
				}
			);
			enqueueSnackbar("Transaction created", {
				variant: "success",
				action: <ViewTransactionOnExplorerButton signature={tx} />,
			});
			didAddTransaction(transaction.publicKey);
			onClose();
		}
	});

	return (
		<form onSubmit={onSubmit}>
			<div
				style={{
					background: "#f1f0f0",
					padding: "24px",
				}}
			>
				<label>
					Deal
					<input
						name="deal"
						type="text"
						placeholder={deal}
						onBlur={onBlurDeal}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<label>
					OffRampTokenAccount
					<input
						name="offRampTokenAccount"
						type="text"
						placeholder={offRampTokenAccount}
						onBlur={onBlurOffRampTokenAccount}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<label>
					CollectionTokenAccount
					<input
						name="collectionTokenAccount"
						type="text"
						value={collectionAccount}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<label>
					ArrangementFeeCollectionTokenAccount
					<input
						name="arrangementFeeCollectionTokenAccount"
						type="text"
						value={arrangementFeeCollectionAccount}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<input
					type="submit"
					value={"update program state multisig"}
					style={{
						background: "white",
						cursor: "pointer",
						width: "200px",
						height: "30px",
					}}
				/>
			</div>
		</form>
	);
}
