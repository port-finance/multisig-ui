import { useSnackbar } from "notistack";
import {
	Button,
	Collapse,
	ListItem,
	ListItemIcon,
	ListItemText,
	TextField,
} from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import GavelIcon from "@material-ui/icons/Gavel";
import BN from "bn.js";

import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { TX_SIZE } from "../../credix/consts";

export function ChangeThresholdListItem({
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
					<GavelIcon />
				</ListItemIcon>
				<ListItemText primary={"Change threshold"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<ChangeThresholdListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

export function ChangeThresholdListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [threshold, setThreshold] = useState(2);
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	// @ts-ignore
	const { enqueueSnackbar } = useSnackbar();
	const changeThreshold = async () => {
		enqueueSnackbar("Creating change threshold transaction", {
			variant: "info",
		});
		const data = changeThresholdData(multisigClient, threshold);
		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);
		const accounts = [
			{
				pubkey: multisig,
				isWritable: true,
				isSigner: false,
			},
			{
				pubkey: multisigSigner,
				isWritable: false,
				isSigner: true,
			},
		];
		const transaction = new Account();
		const txSize = TX_SIZE + 100; // todo
		const tx = await multisigClient.rpc.createTransaction(
			multisigClient.programId,
			accounts,
			data,
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
						txSize
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
	return (
		<div
			style={{
				background: "#f1f0f0",
				paddingLeft: "24px",
				paddingRight: "24px",
			}}
		>
			<TextField
				fullWidth
				style={{ marginTop: "16px" }}
				label="Threshold"
				value={threshold}
				type="number"
				onChange={(e) => {
					// @ts-ignore
					setThreshold(e.target.value);
				}}
			/>
			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<Button onClick={() => changeThreshold()}>Change Threshold</Button>
			</div>
		</div>
	);
}

// @ts-ignore
function changeThresholdData(multisigClient, threshold) {
	return multisigClient.coder.instruction.encode("change_threshold", {
		threshold: new BN(threshold),
	});
}
