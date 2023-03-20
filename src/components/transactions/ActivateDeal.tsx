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
import { Market, Deal, DealStatus } from "@credix/credix-client";

export function ActivateDealListItem({
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
				<ListItemText primary={"Activate Deal"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<ActivateDealListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function ActivateDealListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [deal, setDeal] = useState<Deal | null>();
	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
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

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid PassHolder Public Key`, {
				variant: "error",
			});
			return;
		}
		const dealPubkey = new PublicKey(e.target.value);
		const dealForPubkey = await credixClient?.fetchDealByPublicKey(dealPubkey);
		setDeal(dealForPubkey);
		constructDealRows();
	};

	const createTransactionAccount = async (deal: Deal) => {
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);
		const activateIx = await deal.activateIx(multisigSigner);
		console.log(activateIx);
		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			activateIx.keys,
			Buffer.from(activateIx.data),
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
						TX_SIZE + 1000
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
	};

	const constructDealRows = () => {
		if (deal) {
			let dealRowsNew = (
				<div
					key={deal.borrower.toString()}
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
					<p style={{ width: "500px" }}>{deal.borrower.toString()}</p>
					<p style={{ width: "200px" }}>{deal.name}</p>
					{/* <p style={{width: "200px"}}> {deal.principal.toNumber()/1000000} USDC</p> */}
					<Button
						style={{ width: "100px" }}
						onClick={() => createTransactionAccount(deal)}
					>
						Activate
					</Button>
				</div>
			);
			setDealRows([dealRowsNew]);
		}
	};

	return (
		<div
			style={{
				background: "#f1f0f0",
				padding: "24px",
			}}
		>
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
				<p style={{ width: "500px" }}>Borrower Public Key</p>
				<p style={{ width: "200px" }}>Deal name</p>
				{/* <p style={{width: "200px"}}>Amount</p> */}
				<p style={{ width: "100px" }}></p>
			</div>
			{dealRows}
		</div>
	);
}
