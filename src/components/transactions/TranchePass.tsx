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
} from "@credix/credix-client";

export function TranchePassListItem({
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
				<ListItemText primary={"Issue/Update tranche pass"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<TranchePassListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function TranchePassListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [deal, setDeal] = useState<Deal | null>();
	const [tranches, setTranches] = useState<Tranches>();
	const [investorPublicKey, setInvestorPublicKey] = useState<PublicKey>();
	const [dealRows, setDealRows] = useState([<p>"no pending deals"</p>]);
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const isValidPublicKey = (publicKey: string) => {
		try {
			new PublicKey(publicKey);
			return true;
		} catch (e) {
			return false;
		}
	};

	const onBlurInvestorPublicKey = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid PassHolder Public Key`, {
				variant: "error",
			});
			return;
		}
		const pubKey = new PublicKey(e.target.value);
		setInvestorPublicKey(pubKey);
	};

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid PassHolder Public Key`, {
				variant: "error",
			});
			return;
		}
		const dealPubkey = new PublicKey(e.target.value);
		const dealForPubkey = await credixClient?.fetchDealByPublicKey(dealPubkey);
		const tranchesForDeal = await dealForPubkey?.fetchTranches();
		setDeal(dealForPubkey);

		// @ts-ignore
		setTranches(tranchesForDeal);
		constructDealRows();
	};

	const createTransactionAccount = async (tranche: Tranche) => {
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);
		if (investorPublicKey) {
			const issueTranchePassIx = await tranche.issuePassIx(
				investorPublicKey,
				multisigSigner
			);
			console.log(issueTranchePassIx);
			// const openDealIx = await openDeal(dealPk, borrowerPk, multisigSigner, multisigClient.provider, globalMarketSeed);
			const transaction = new Account();
			const tx = await multisigClient.rpc.createTransaction(
				config.clusterConfig.programId,
				issueTranchePassIx.keys,
				Buffer.from(issueTranchePassIx.data),
				{
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
	};

	const constructDealRows = () => {
		let tranchesElements: JSX.Element[] = [];
		console.log(tranches);
		if (tranches) {
			tranches.tranches.forEach((tranche, index) => {
				// @ts-ignore
				if (tranche.index !== 1 && tranche.size.uiAmount > 0) {
					let name = "";
					if (tranche.index === 0) {
						name = "super senior";
					}
					if (tranche.index === 2) {
						name = "mezzanine";
					}
					if (tranche.index === 3) {
						name = "junior";
					}
					let trancheRowNew = (
						<div
							key={tranche.deal.borrower.toString()}
							style={{
								display: "flex",
								justifyContent: "space-between",
								width: "100%",
								background: "white",
								paddingLeft: "20px",
								paddingRight: "20px",
								borderBottom: "1px solid grey",
							}}
						>
							<p style={{ width: "200px" }}>{tranche.deal.name}</p>
							<p style={{ width: "200px" }}>{name}</p>
							<Button
								style={{ width: "100px" }}
								onClick={() => createTransactionAccount(tranche)}
							>
								Issue pass
							</Button>
						</div>
					);
					tranchesElements.push(trancheRowNew);
				}
			});
			setDealRows(tranchesElements);
		}
	};

	return (
		<div
			style={{
				background: "#f1f0f0",
				padding: "24px",
			}}
		>
			<label>
				Investor public key:
				<input
					name="investorPublicKey"
					type="text"
					placeholder={investorPublicKey?.toString()}
					onBlur={onBlurInvestorPublicKey}
					style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
				/>
			</label>
			<Checkbox checked={!(investorPublicKey === undefined)} />
			<div></div>
			<br />
			<label>
				Deal Pubkey:
				<input
					name="dealPubkey"
					type="text"
					onBlur={onBlurDeal}
					style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
				/>
			</label>
			<Checkbox checked={!(deal === undefined)} />
			<br />
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					width: "100%",
					background: "white",
					paddingLeft: "20px",
					paddingRight: "20px",
					borderBottom: "1px solid grey",
				}}
			>
				<p style={{ width: "200px" }}>Deal name</p>
				<p style={{ width: "200px" }}>Tranche</p>
				<p style={{ width: "100px" }}></p>
			</div>
			{dealRows}
		</div>
	);
}
