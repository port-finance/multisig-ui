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
} from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";

export function UpdateMarketListItem({
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
				<ListItemText primary={"Update market config"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<UpdateMarketListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function UpdateMarketListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [market, setMarket] = useState<Market | null>();
	const [performanceFee, setPerformanceFee] = useState<string>();
	const [serviceFeePercentage, setServiceFeePercentage] = useState<string>();
	const [withdrawalFee, setWithdrawalFee] = useState<string>();
	const [poolSizeLimitPercentage, setPoolSizeLimitPercentage] =
		useState<string>();
	const [treasuryPoolTokenAccount, setTreasuryPoolTokenAccount] =
		useState<string>();

	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const fractionToString = (inputFraction: Fraction) => {
		const num = inputFraction.numerator.toString();
		const den = inputFraction.denominator.toString();
		return num + "/" + den;
	};

	const stringToFraction = (inputString: string) => {
		const numDen = inputString.split("/");
		return new Fraction(Number(numDen[0]), Number(numDen[1]));
	};

	const fetchMarketConfig = async () => {
		if (market) {
			console.log(market);
			setPerformanceFee(fractionToString(market.defaultPerformanceFee));
			try {
				setPoolSizeLimitPercentage(
					fractionToString(market.poolSizeLimitPercentage)
				);
			} catch (err) {
				setPoolSizeLimitPercentage(fractionToString(Fraction.max()));
			}
			setTreasuryPoolTokenAccount(market.treasury.toString());
			setServiceFeePercentage(fractionToString(market.serviceFeePercentage));
			setWithdrawalFee(fractionToString(market.withdrawFee));
		}
	};

	const onBlurGlobalMarketSeed = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setGlobalMarketSeed(e.target.value);
		const market: Market | null = await credixClient.fetchMarket(
			globalMarketSeed
		);
		console.log("globalmarket", market?.address.toString());
		setMarket(market);
		await fetchMarketConfig();
	};

	const onChangePerformanceFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPerformanceFee(e.target.value);
	};

	const onChangeServiceFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setServiceFeePercentage(e.target.value);
	};

	const onChangeWithdrawalFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setWithdrawalFee(e.target.value);
	};

	const onChangePoolSizeLimitPercentage = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setPoolSizeLimitPercentage(e.target.value);
	};

	const onChangeTreasuryPoolTokenAccount = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setTreasuryPoolTokenAccount(e.target.value);
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

		const marketConfig: UpdateGlobalMarketConfig = {
			//@ts-ignore
			performanceFee: stringToFraction(performanceFee),
			//@ts-ignore
			poolSizeLimitPercentage: stringToFraction(poolSizeLimitPercentage),
			//@ts-ignore
			serviceFeePercentage: stringToFraction(serviceFeePercentage),
			//@ts-ignore
			withdrawalFee: stringToFraction(withdrawalFee),
			//@ts-ignore
			treasuryPoolTokenAccount: new PublicKey(treasuryPoolTokenAccount),
		};

		const updateMarketConfigIx = await market?.updateConfigIx(
			marketConfig,
			multisigSigner
		);

		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			updateMarketConfigIx.keys,
			// @ts-ignore
			Buffer.from(updateMarketConfigIx.data),
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
					performanceFee:
					<input
						type="text"
						name="performanceFee"
						value={performanceFee}
						onChange={onChangePerformanceFee}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					serviceFee:
					<input
						type="text"
						name="serviceFee"
						value={serviceFeePercentage}
						onChange={onChangeServiceFee}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					withdrawalFee:
					<input
						type="text"
						name="withdrawalFee"
						value={withdrawalFee}
						onChange={onChangeWithdrawalFee}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					poolSizeLimit, max = 4294967295/1
					<input
						type="text"
						name="poolSizeLimit"
						value={poolSizeLimitPercentage}
						onChange={onChangePoolSizeLimitPercentage}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					treasuryPoolTokenAccount:
					<input
						type="text"
						name="treasuryPoolTokenAccount"
						value={treasuryPoolTokenAccount}
						onChange={onChangeTreasuryPoolTokenAccount}
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
					value={"update market admins account"}
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
