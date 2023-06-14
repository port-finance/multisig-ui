import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Checkbox,
} from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import React, { useState } from "react";
import { config } from "../../credix/config";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";

import { Account, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { SEEDS, TX_SIZE } from "../../credix/consts";
import {
	Market,
	Deal,
	Fraction,
	UpdateDealConfig,
	MarketAdmins,
	UpdateArrangementFeeConfig,
} from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";

export function UpdateDealListItem({
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
				<ListItemText primary={"Update deal config"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<UpdateDealListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function UpdateDealListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [deal, setDeal] = useState<Deal | null>();
	const [arrangementFeePercentage, setarrangementFeePercentage] =
		useState<string>();
	const [arrangementFees, setarrangementFees] = useState<number>();
	const [arrangementFeesRepaid, setarrangementFeesRepaid] = useState<number>();
	const [
		timeLatestArrangementFeesCharged,
		settimeLatestArrangementFeesCharged,
	] = useState<number>();
	const [openedAt, setOpenedAt] = useState<number>();
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

	const fractionToString = (inputFraction: Fraction) => {
		const num = inputFraction.numerator.toString();
		const den = inputFraction.denominator.toString();
		return num + "/" + den;
	};

	const stringToFraction = (inputString: string) => {
		const numDen = inputString.split("/");
		return new Fraction(Number(numDen[0]), Number(numDen[1]));
	};

	const fetchDealConfig = async () => {
		if (deal) {
			setarrangementFeePercentage(
				fractionToString(deal.arrangementFeePercentage)
			);
			setarrangementFees(Number(deal.arrangementFees.amount) / 1000000);
			setarrangementFeesRepaid(
				Number(deal.arrangementFeesRepaid.amount) / 1000000
			);
			settimeLatestArrangementFeesCharged(
				Number(deal.timeLatestArrangementFeesCharged)
			);
			setOpenedAt(Number(deal.openedAt));
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

		await fetchDealConfig();
	};

	const onChangearrangementFeePercentage = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setarrangementFeePercentage(e.target.value);
	};

	const onChangearrangementFees = (e: React.ChangeEvent<HTMLInputElement>) => {
		setarrangementFees(Number(e.target.value));
	};

	const onChangearrangementFeesRepaid = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setarrangementFeesRepaid(Number(e.target.value));
	};

	const onChangetimeLatestArrangementFeesCharged = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		settimeLatestArrangementFeesCharged(Number(e.target.value));
	};

	const onChangeOpenedAt = (e: React.ChangeEvent<HTMLInputElement>) => {
		setOpenedAt(Number(e.target.value));
	};

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);

		const dealConfig: UpdateArrangementFeeConfig = {
			// @ts-ignore
			arrangementFeePercentage: stringToFraction(arrangementFeePercentage),
			// @ts-ignore
			arrangementFees: arrangementFees * 1000000,
			// @ts-ignore
			arrangementFeesRepaid: arrangementFeesRepaid * 1000000,
			// @ts-ignore
			timeLatestArrangementFeesCharged: timeLatestArrangementFeesCharged,
		};

		const updateDealConfigIx = await deal?.updateIx(dealConfig, multisigSigner);
		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			updateDealConfigIx.keys,
			// @ts-ignore
			Buffer.from(updateDealConfigIx.data),
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
						TX_SIZE + 800
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
	});

	return (
		<form onSubmit={onSubmit}>
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
				<br />
				<label>
					arrangementFeePercentage:
					<input
						type="text"
						name="arrangementFeePercentage"
						value={arrangementFeePercentage}
						onChange={onChangearrangementFeePercentage}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					arrangementFees:
					<input
						type="number"
						name="arrangementFees"
						value={arrangementFees}
						onChange={onChangearrangementFees}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					arrangementFeesRepaid:
					<input
						type="number"
						name="arrangementFeesRepaid"
						value={arrangementFeesRepaid}
						onChange={onChangearrangementFeesRepaid}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					timeLatestArrangementFeesCharged:
					<input
						type="number"
						name="timeLatestArrangementFeesCharged"
						value={timeLatestArrangementFeesCharged}
						onChange={onChangetimeLatestArrangementFeesCharged}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<input
					type="submit"
					value={"update deal account"}
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
