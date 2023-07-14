import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Checkbox,
} from "@material-ui/core";
import { ExpandLess, ExpandMore, RestoreOutlined } from "@material-ui/icons";
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

export function ActivateMigratedDealListItem({
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
				<ListItemText primary={"Activate migrated deal"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<ActivateMigratedDealListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function ActivateMigratedDealListItemDetails({
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
	const [lpClaims, setLpClaims] = useState<string>("");
	const [trancheClaims, setTrancheClaims] = useState<string>("");

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

	const fetchInitialClaims = async () => {
		if (deal) {
			// const schedule = await deal.fetchRepaymentSchedule();
			const tranches = await deal.fetchTranches();

			// @ts-ignore
			if (Number(tranches?.tranches[1]?.size.amount) > 0) {
				console.log(tranches?.tranches[1].size.amount);
				setLpClaims(
					JSON.stringify([
						{
							investor: "REPLACE_WITH_INVESTOR_PUBKEY",
							baseAmountDeposit: tranches?.tranches[1].size.amount,
						},
					])
				);
			} else {
				setLpClaims(JSON.stringify([]));
			}

			// @ts-ignore
			const trancheClaims = [];
			tranches?.tranches.forEach((tranche) => {
				if (tranche.index !== 1 && Number(tranche.size.amount) > 0) {
					const trancheClaim = {
						investor: "REPLACE_WITH_INVESTOR_PUBKEY",
						baseAmountDeposit: tranche.size.amount,
						trancheIndex: tranche.index,
					};
					// @ts-ignore
					trancheClaims.push(trancheClaim);
				}
			});
			// @ts-ignore
			setTrancheClaims(JSON.stringify(trancheClaims));
		}
	};

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid Deal Public Key`, {
				variant: "error",
			});
			return;
		}
		console.log(e.target.value);
		const dealPubkey = new PublicKey(e.target.value);
		const dealForPubkey = await credixClient.fetchDealByPublicKey(dealPubkey);
		setDeal(dealForPubkey);
		await fetchInitialClaims();
	};

	const onChangeIndexToStart = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIndexToStart(Number(e.target.value));
	};

	const onChangeLpClaims = async (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setLpClaims(e.target.value);
	};

	const onChangeTrancheClaims = async (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setTrancheClaims(e.target.value);
	};

	// @ts-ignore
	const transformLpClaims = (parsedLpClaims) => {
		// @ts-ignore
		const transformedLpClaims = [];
		// @ts-ignore
		parsedLpClaims.forEach((claim) => {
			const transformedLpClaim = {};
			// @ts-ignore
			transformedLpClaim["investor"] = new PublicKey(claim.investor);
			// @ts-ignore
			transformedLpClaim["baseAmountDeposit"] = Number(claim.baseAmountDeposit);
			transformedLpClaims.push(transformedLpClaim);
		});
		// @ts-ignore
		return transformedLpClaims;
	};

	// @ts-ignore
	const transformTrancheClaims = (parsedTrancheClaims) => {
		// @ts-ignore
		const transformedTrancheClaims = [];
		// @ts-ignore
		parsedTrancheClaims.forEach((claim) => {
			const transformedTrancheClaim = {};
			// @ts-ignore
			transformedTrancheClaim["investor"] = new PublicKey(claim.investor);
			// @ts-ignore
			transformedTrancheClaim["baseAmountDeposit"] = Number(
				claim.baseAmountDeposit
			);
			// @ts-ignore
			transformedTrancheClaim["trancheIndex"] = claim.trancheIndex;
			transformedTrancheClaims.push(transformedTrancheClaim);
		});
		// @ts-ignore
		return transformedTrancheClaims;
	};

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		const parsedLpClaims = JSON.parse(lpClaims);
		console.log({ parsedLpClaims });
		const transformedLpClaims = transformLpClaims(parsedLpClaims);
		console.log({ transformedLpClaims });
		const parsedTrancheClaims = JSON.parse(trancheClaims);
		console.log({ parsedTrancheClaims });
		const transformedTrancheClaims =
			transformTrancheClaims(parsedTrancheClaims);
		console.log({ transformedTrancheClaims });

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);

		console.log({
			lpClaims: transformedLpClaims,
			trancheClaims: transformedTrancheClaims,
		});
		const activateMigratedDealIx = await deal?.activateMigratedIx(
			{
				lpClaims: transformedLpClaims,
				trancheClaims: transformedTrancheClaims,
			},
			multisigSigner
		);

		console.log("here2");

		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			activateMigratedDealIx.keys,
			// @ts-ignore
			Buffer.from(activateMigratedDealIx.data),
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
					lp claims
					<textarea
						rows={5}
						name="lpClaims"
						value={lpClaims}
						onChange={onChangeLpClaims}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					tranche claims
					<textarea
						rows={10}
						name="trancheClaims"
						value={trancheClaims}
						onChange={onChangeTrancheClaims}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<br />
				<input
					type="submit"
					value={"Activate migrated deal"}
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
