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
	const [market, setMarket] = useState<Market | null>();
	const [deal, setDeal] = useState<Deal | null>();
	const [serviceFeePercentage, setServiceFeePercentage] = useState<string>();
	const [serviceFees, setServiceFees] = useState<number>();
	const [serviceFeesRepaid, setServiceFeesRepaid] = useState<number>();
	const [
		yearLatestServiceFeesCharged,
		setYearLatestServiceFeesCharged,
	] = useState<number>();
	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
	const [multisigClient, credixClient] = useMultisigProgram();
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
			setServiceFeePercentage(fractionToString(deal.serviceFeePercentage));
			setServiceFees(Number(deal.serviceFees.amount) / 1000000);
			setServiceFeesRepaid(Number(deal.serviceFeesRepaid.amount) / 1000000);
			setYearLatestServiceFeesCharged(
				Number(deal.yearLatestServiceFeesCharged)
			);
		}
	};

	const onBlurGlobalMarketSeed = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setGlobalMarketSeed(e.target.value);
		const market: Market | null = await credixClient.fetchMarket(
			globalMarketSeed
		);
		setMarket(market);
	};

	const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isValidPublicKey(e.target.value)) {
			enqueueSnackbar(`Non valid PassHolder Public Key`, {
				variant: "error",
			});
			return;
		}
		const dealPubkey = new PublicKey(e.target.value);
		console.log("market name", market?.name);
		const dealForPubkey = await market?.fetchDealByPublicKey(dealPubkey);
		setDeal(dealForPubkey);

		await fetchDealConfig();
	};

	const onChangeServiceFeePercentage = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setServiceFeePercentage(e.target.value);
	};

	const onChangeServiceFees = (e: React.ChangeEvent<HTMLInputElement>) => {
		setServiceFees(Number(e.target.value));
	};

	const onChangeServiceFeesRepaid = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setServiceFeesRepaid(Number(e.target.value));
	};

	const onChangeYearLatestServiceFeesCharged = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setYearLatestServiceFeesCharged(Number(e.target.value));
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

		const dealConfig: UpdateDealConfig = {
			// @ts-ignore
			serviceFeePercentage: stringToFraction(serviceFeePercentage),
			// @ts-ignore
			serviceFees: serviceFees * 1000000,
			// @ts-ignore
			serviceFeesRepaid: serviceFeesRepaid * 1000000,
			// @ts-ignore
			yearLatestServiceFeesCharged: yearLatestServiceFeesCharged,
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
				accounts: {
					multisig,
					transaction: transaction.publicKey,
					proposer: multisigClient.provider.wallet.publicKey,
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
				<label>
					Global marketstate seed:
					<input
						name="globalMarketSeed"
						type="text"
						placeholder={globalMarketSeed}
						onBlur={onBlurGlobalMarketSeed}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<Checkbox checked={!(market === undefined)} />
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
					serviceFeePercentage:
					<input
						type="text"
						name="serviceFeePercentage"
						value={serviceFeePercentage}
						onChange={onChangeServiceFeePercentage}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					serviceFees:
					<input
						type="number"
						name="serviceFees"
						value={serviceFees}
						onChange={onChangeServiceFees}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					serviceFeesRepaid:
					<input
						type="number"
						name="serviceFeesRepaid"
						value={serviceFeesRepaid}
						onChange={onChangeServiceFeesRepaid}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					yearLatestServiceFeesCharged:
					<input
						type="number"
						name="yearLatestServiceFeesCharged"
						value={yearLatestServiceFeesCharged}
						onChange={onChangeYearLatestServiceFeesCharged}
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
