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
import { Fraction, MarketConfig } from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";

export function InitializeMarketListItem({
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
				<ListItemText primary={"Initialize Market"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<InitializeMarketListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function InitializeMarketListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [name, setName] = useState<string>("test name");
	const [performanceFee, setPerformanceFee] = useState<string>("10/100");
	const [serviceFeePercentage, setServiceFeePercentage] =
		useState<string>("1/100");
	const [withdrawalFee, setWithdrawalFee] = useState<string>("5/1000");
	const [baseMint, setBaseMint] = useState<string>(
		"Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
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

	const onChangePerformanceFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPerformanceFee(e.target.value);
	};

	const onChangeServiceFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setServiceFeePercentage(e.target.value);
	};

	const onChangeWithdrawalFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		setWithdrawalFee(e.target.value);
	};

	const onChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setName(e.target.value);
	};

	const onChangeBaseMint = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBaseMint(e.target.value);
	};

	const marketConfigDevnet: MarketConfig = {
		name: name,
		performanceFee: stringToFraction(performanceFee),
		withdrawalFee: stringToFraction(withdrawalFee),
		credixPerformanceFeePercentage: new Fraction(1, 1),
		credixServiceFeePercentage: new Fraction(1, 1),
		serviceFeePercentage: stringToFraction(serviceFeePercentage),
		fixedLateFeePercentage: new Fraction(0, 1),
		variableLateFeePercentage: new Fraction(0, 1),
		gracePeriod: 3,
		baseMint: new PublicKey(baseMint),
		treasury: new PublicKey("12LUx5wYA18PGSG6mvJg1rdue6dpYWbTcpVrSE82sTVN"),
		lpTokenName: "new token D",
		lpTokenSymbol: "CRDX - NT",
		managers: [
			new PublicKey("Du6efvMcXXLGyEea4SrTnVGHgBZmu4xU7SM9vDfRDqrp"),
			new PublicKey("Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL"),
			new PublicKey("G9YLiuAzH9VFHrT266gJoTVYwC3uGmrQ5ig67zwJvWth"),
			new PublicKey("5m2LVHgW8dxLw8YGCTckWXskbHnGfekbgpRBAwKTaqc8"),
			new PublicKey("BJxCTq8CYodN5DErEQpdnmc5mAgwGheZRV9WLV2t6VBp"),
			new PublicKey("CLVtyEX1mBzx2wRFHb7URY9k2GtUNLXpoYEDr8vGKVpw"),
			new PublicKey("DGqXoguiJnAy8ExJe9NuZpWrnQMCV14SdEdiMEdCfpmB"),
		],
		passIssuers: [
			new PublicKey("Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL"),
		],
	};

	const marketConfigMainnet: MarketConfig = {
		name: name,
		performanceFee: stringToFraction(performanceFee),
		withdrawalFee: stringToFraction(withdrawalFee),
		credixPerformanceFeePercentage: new Fraction(1, 1),
		credixServiceFeePercentage: new Fraction(1, 1),
		serviceFeePercentage: stringToFraction(serviceFeePercentage),
		fixedLateFeePercentage: new Fraction(0, 1),
		variableLateFeePercentage: new Fraction(0, 1),
		gracePeriod: 3,
		baseMint: new PublicKey(baseMint),
		treasury: new PublicKey("6JXkX9HtwtjvAxpaatb18xF4m8ZWcy7mbYphSFq6J4S9"),
		lpTokenName: "new token M",
		lpTokenSymbol: "CRDX - NT",
		managers: [
			new PublicKey("9GKiJfzjUUpWxKm1owKwAA2QWMQc7UXg4btXPF1BEbLV"),
			new PublicKey("G9YLiuAzH9VFHrT266gJoTVYwC3uGmrQ5ig67zwJvWth"),
			new PublicKey("5m2LVHgW8dxLw8YGCTckWXskbHnGfekbgpRBAwKTaqc8"),
			new PublicKey("BJxCTq8CYodN5DErEQpdnmc5mAgwGheZRV9WLV2t6VBp"),
			new PublicKey("passo5poC1rMuxVtV7tty2xVDDmSp3y5wsagLkmCwZM"),
		],
		passIssuers: [
			new PublicKey("9GKiJfzjUUpWxKm1owKwAA2QWMQc7UXg4btXPF1BEbLV"),
			new PublicKey("G9YLiuAzH9VFHrT266gJoTVYwC3uGmrQ5ig67zwJvWth"),
			new PublicKey("5m2LVHgW8dxLw8YGCTckWXskbHnGfekbgpRBAwKTaqc8"),
			new PublicKey("BJxCTq8CYodN5DErEQpdnmc5mAgwGheZRV9WLV2t6VBp"),
			new PublicKey("passo5poC1rMuxVtV7tty2xVDDmSp3y5wsagLkmCwZM"),
		],
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

		const initializeMarketIx = await credixClient.initializeMarketIx(
			marketConfigDevnet,
			multisigSigner
		);

		let marketConfig;

		if (
			multisigClient.provider.connection.rpcEndpoint ===
			"https://api.devnet.solana.com"
		) {
			marketConfig = marketConfigDevnet;
		} else {
			marketConfig = marketConfigMainnet;
		}

		console.log({ marketConfig });

		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			initializeMarketIx.keys,
			// @ts-ignore
			Buffer.from(initializeMarketIx.data),
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
					Name:
					<input
						type="text"
						name="name"
						value={name}
						onChange={onChangeName}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
				<br />
				<label>
					Base mint:
					<input
						type="text"
						name="baseMint"
						value={baseMint}
						onChange={onChangeBaseMint}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
						}}
					/>
				</label>
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
