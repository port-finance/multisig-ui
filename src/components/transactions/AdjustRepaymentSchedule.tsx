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
	RepaymentPeriodConfig,
} from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";

export function AdjustRepaymentScheduleListItem({
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
				<ListItemText primary={"Adjust repayment schedule"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<AdjustRepaymentScheduleListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function AdjustRepaymentScheduleListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [deal, setDeal] = useState<Deal | null>();
	const [indexToStart, setIndexToStart] = useState<number>(0);
	const [repaymentSchedulePrincipal, setRepaymentSchedulePrincipal] =
		useState<string>("");
	const [repaymentScheduleInterest, setRepaymentScheduleInterest] =
		useState<string>("");

	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const decimals = 1000000;
	const { enqueueSnackbar } = useSnackbar();

	const isValidPublicKey = (publicKey: string) => {
		try {
			new PublicKey(publicKey);
			return true;
		} catch (e) {
			return false;
		}
	};

	const fetchRepaymentSchedule = async () => {
		let lastRepaidIndex = 0;
		// @ts-ignore
		const principals = [];
		// @ts-ignore
		const interests = [];
		if (deal) {
			const schedule = await deal.fetchRepaymentSchedule();
			// @ts-ignore
			schedule.periods.forEach((p) => {
				principals.push(Number(p.principal.amount) / decimals);
				interests.push(Number(p.interest.amount) / decimals);
				if (Number(p.interestRepaid.amount) > 0) {
					lastRepaidIndex += 1;
				}
			});
			setIndexToStart(lastRepaidIndex);
		}
		// @ts-ignore
		const principalString = principals.join(",");
		// @ts-ignore
		const interestString = interests.join(",");

		setRepaymentSchedulePrincipal(principalString);
		setRepaymentScheduleInterest(interestString);
	};

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid Deal Public Key`, {
				variant: "error",
			});
			return;
		}
		const dealPubkey = new PublicKey(e.target.value);
		const dealForPubkey = await credixClient.fetchDealByPublicKey(dealPubkey);
		setDeal(dealForPubkey);
		await fetchRepaymentSchedule();
	};

	const onChangeIndexToStart = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIndexToStart(Number(e.target.value));
	};

	const onChangeRepaymentSchedulePrincipal = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setRepaymentSchedulePrincipal(e.target.value);
	};

	const onChangeRepaymentScheduleInterest = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setRepaymentScheduleInterest(e.target.value);
	};

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		let newPrincipalSchedule = repaymentSchedulePrincipal
			.split(",")
			.map((e) => Math.round(Number(e) * decimals));
		newPrincipalSchedule = newPrincipalSchedule.splice(
			indexToStart,
			newPrincipalSchedule.length - 1
		);

		let newInterestSchedule = repaymentScheduleInterest
			.split(",")
			.map((e) => Math.round(Number(e) * decimals));
		newInterestSchedule = newInterestSchedule.splice(
			indexToStart,
			newInterestSchedule.length - 1
		);

		console.log("newPrincipalSchedule", newPrincipalSchedule);
		console.log("newInterestSchedule", newInterestSchedule);

		const periods: RepaymentPeriodConfig[] = [];
		newPrincipalSchedule.forEach((principal, idx) => {
			const interest = newInterestSchedule[idx];
			periods.push({ principal: principal, interest: interest });
		});

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);

		const adjustRepaymentScheduleConfig = {
			changeFrom: indexToStart,
			periods: periods,
		};

		const adjustRepaymentScheduleIx = await deal?.adjustRepaymentScheduleIx(
			adjustRepaymentScheduleConfig,
			multisigSigner
		);

		console.log(adjustRepaymentScheduleIx);

		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			adjustRepaymentScheduleIx[0].keys,
			// @ts-ignore
			Buffer.from(adjustRepaymentScheduleIx[0].data),
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
					repaymentSchedule Principal:
					<input
						type="text"
						name="repaymentSchedulePrincipal"
						value={repaymentSchedulePrincipal}
						onChange={onChangeRepaymentSchedulePrincipal}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					repaymentSchedule Interest:
					<input
						type="text"
						name="repaymentScheduleInterest"
						value={repaymentScheduleInterest}
						onChange={onChangeRepaymentScheduleInterest}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				{/* <label>
					<input
						type="number"
						name="serviceFeesRepaid"
						value={indexToStart}
						onChange={onChangeIndexToStart}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label> */}
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
