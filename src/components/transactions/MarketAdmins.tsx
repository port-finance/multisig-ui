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
import { serialAsync } from "../../credix/utils/async.utils";

export function MarketAdminsListItem({
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
				<ListItemText primary={"Update market admins account"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<MarketAdminsListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function MarketAdminsListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [market, setMarket] = useState<Market | null>();
	const [multisigKey, setMultisigKey] = useState<string>("");
	const [managers, setManagers] = useState<string>("");
	const [passIssuers, setPassIssuers] = useState<string>("");
	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
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

	const fetchMarketAdmins = async () => {
		const marketAdmins = await market?.fetchMarketAdmins();
		let multisigString = "";
		let managersString = "";
		let passIssuersString = "";
		if (marketAdmins?.multisig) {
			multisigString = marketAdmins?.multisig.toString();
			setMultisigKey(multisigString);
		}
		if (marketAdmins?.managers) {
			marketAdmins?.managers.forEach((m) => {
				managersString = managersString.concat(m.toString()).concat("\n");
			});
			setManagers(managersString.replace(/\n$/, ""));
		}
		if (marketAdmins?.passIssuers) {
			marketAdmins?.passIssuers.forEach((m) => {
				passIssuersString = passIssuersString.concat(m.toString()).concat("\n");
			});
			setPassIssuers(passIssuersString.replace(/\n$/, ""));
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
		await fetchMarketAdmins();
	};

	const onChangeMultisigKey = (e: React.ChangeEvent<HTMLInputElement>) => {
		setMultisigKey(e.target.value);
	};

	const onChangeManagers = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setManagers(e.target.value);
	};

	const onChangePassIssuers = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setPassIssuers(e.target.value);
	};

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		let configMultisig: PublicKey;
		let configManagers: PublicKey[];
		let configPassIssuers: PublicKey[];

		configMultisig = new PublicKey(multisigKey);
		configManagers = managers
			.split("\n")
			.map((pubkey) => new PublicKey(pubkey));
		configPassIssuers = passIssuers
			.split("\n")
			.map((pubkey) => new PublicKey(pubkey));

		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);

		const updateMarketAdminsIx = await market?.updateMarketAdminsIx(
			{
				multisig: configMultisig,
				managers: configManagers,
				passIssuers: configPassIssuers,
			},
			multisigSigner
		);

		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			updateMarketAdminsIx.keys,
			// @ts-ignore
			Buffer.from(updateMarketAdminsIx.data),
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
					Multisig:
					<input
						name="multisig"
						type="text"
						value={multisigKey}
						onChange={onChangeMultisigKey}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<label>
					Managers:
					<textarea
						name="managers"
						value={managers}
						onChange={onChangeManagers}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
							height: "150px",
						}}
					/>
				</label>
				<br />
				<label>
					Pass Issuers:
					<textarea
						name="passIssuers"
						value={passIssuers}
						onChange={onChangePassIssuers}
						style={{
							marginLeft: "10px",
							width: "500px",
							margin: "10px",
							height: "150px",
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
