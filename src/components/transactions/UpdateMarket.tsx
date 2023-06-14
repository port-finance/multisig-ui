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
	const [credixFeePercentage, setCredixFeePercentage] = useState<string>();
	const [withdrawalFee, setWithdrawalFee] = useState<string>();
	const [hasWithdrawEpochs, setHasWithdrawEpochs] = useState<boolean>(false);
	const [poolSizeLimitPercentage, setPoolSizeLimitPercentage] =
		useState<string>();
	const [treasuryPoolTokenAccount, setTreasuryPoolTokenAccount] =
		useState<string>();

	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
	const [withdrawEpochsRequestSeconds, setWithdrawEpochsRequestSeconds] =
		useState<number>();
	const [withdrawEpochsRedeemSeconds, setWithdrawEpochsRedeemSeconds] =
		useState<number>();
	const [
		withdrawEpochsAvailableLiquiditySeconds,
		setWithdrawEpochsAvailableLiquiditySeconds,
	] = useState<number>();
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
			try {
				setPoolSizeLimitPercentage(
					fractionToString(market.poolSizeLimitPercentage)
				);
			} catch (err) {
				setPoolSizeLimitPercentage(fractionToString(Fraction.max()));
			}
			setTreasuryPoolTokenAccount(market.treasury.toString());
			setCredixFeePercentage(fractionToString(market.credixFeePercentage));
			setWithdrawalFee(fractionToString(market.withdrawFee));
			setHasWithdrawEpochs(market.hasWithdrawEpochs);
			setWithdrawEpochsRequestSeconds(market.withdrawEpochRequestSeconds);
			setWithdrawEpochsRedeemSeconds(market.withdrawEpochRedeemSeconds);
			setWithdrawEpochsAvailableLiquiditySeconds(
				market.withdrawEpochAvailableLiquiditySeconds
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
		console.log("globalmarket", market?.address.toString());
		setMarket(market);
		await fetchMarketConfig();
	};

	const onChangeCredixFeePercentage = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setCredixFeePercentage(e.target.value);
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

	const onChangeHasWithdrawEpochs = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		e.target.value === "true"
			? setHasWithdrawEpochs(true)
			: setHasWithdrawEpochs(false);
	};

	const onChangeWithdrawEpochsRequestSeconds = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setWithdrawEpochsRequestSeconds(Number(e.target.value));
	};

	const onChangeWithdrawEpochsRedeemSeconds = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setWithdrawEpochsRedeemSeconds(Number(e.target.value));
	};

	const onChangeWithdrawEpochsAvailableLiquiditySeconds = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setWithdrawEpochsAvailableLiquiditySeconds(Number(e.target.value));
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
			credixFeePercentage: stringToFraction(credixFeePercentage),
			//@ts-ignore
			withdrawalFee: stringToFraction(withdrawalFee),
			//@ts-ignore
			treasuryPoolTokenAccount: new PublicKey(treasuryPoolTokenAccount),
			hasWithdrawEpochs: hasWithdrawEpochs,
			withdrawEpochRequestSeconds: withdrawEpochsRequestSeconds,
			withdrawEpochRedeemSeconds: withdrawEpochsRedeemSeconds,
			withdrawEpochAvailableLiquiditySeconds:
				withdrawEpochsAvailableLiquiditySeconds,
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
					credixFeePercentage:
					<input
						type="text"
						name="serviceFee"
						value={credixFeePercentage}
						onChange={onChangeCredixFeePercentage}
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
				<label>
					Withdraw epochs enabled
					<select
						name="withdrawEpochsEnabled"
						onChange={onChangeHasWithdrawEpochs}
						style={{ marginLeft: "10px", width: "100px", margin: "10px" }}
					>
						<option selected={hasWithdrawEpochs} value="true">
							True
						</option>
						<option selected={!hasWithdrawEpochs} value="false">
							False
						</option>
					</select>
				</label>
				<br />
				<label>
					withdraw epochs request seconds:
					<input
						type="number"
						name="withdrawEpochsRequestSeconds"
						value={withdrawEpochsRequestSeconds}
						onChange={onChangeWithdrawEpochsRequestSeconds}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					withdraw epochs redeem seconds:
					<input
						type="number"
						name="withdrawEpochsRedeemSeconds"
						value={withdrawEpochsRedeemSeconds}
						onChange={onChangeWithdrawEpochsRedeemSeconds}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					withdraw epochs available liquidity seconds:
					<input
						type="number"
						name="withdrawEpochsAvailableLiquiditySeconds"
						value={withdrawEpochsAvailableLiquiditySeconds}
						onChange={onChangeWithdrawEpochsAvailableLiquiditySeconds}
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
