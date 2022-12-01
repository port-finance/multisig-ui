import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Button,
	Checkbox,
} from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { config } from "../../credix/config";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { serialAsync } from "../../credix/utils/async.utils";
import { SEEDS, TX_SIZE } from "../../credix/consts";
import { Market } from "@credix/credix-client";
import { getTokenAccount } from "@project-serum/common";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";

export function FreezeThawTokenAccountListItem({
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
				<ListItemText primary={"Freeze / Thaw Token Account"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<FreezeThawTokenAccountListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function FreezeThawTokenAccountListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [market, setMarket] = useState<Market | null>();
	const [frozen, setFrozen] = useState<string>();
	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
	const [tokenAccountPk, setTokenAccountPk] = useState<PublicKey>();
	const [multisigClient, credixClient] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const onBlurFrozenThawn = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setFrozen(e.target.value);
	};

	const onBlurGlobalMarketSeed = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const seed = e.target.value;
		const marketFromSeed: Market | null = await credixClient.fetchMarket(seed);
		setGlobalMarketSeed(seed);
		setMarket(marketFromSeed);
	};

	const onBlurTokenAccountPk = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const owner = new PublicKey(e.target.value);
		const mint = market?.lpMintPK;
		if (!mint) {
			throw Error("mint not found for market");
		}
		const associatedTokenAccount = await associatedAddress({
			mint: mint,
			owner: owner,
		});
		setTokenAccountPk(associatedTokenAccount);

		const tokenAccount = await getTokenAccount(
			multisigClient.provider,
			associatedTokenAccount
		);
		try {
			if (!tokenAccount) {
				throw Error("no valid token account");
			}
			// @ts-ignore
			if (tokenAccount?.isFrozen) {
				setFrozen("frozen");
			} else {
				setFrozen("thawn");
			}
		} catch (err) {
			enqueueSnackbar(`token account with ${e.target.value} does not exist`, {
				variant: "error",
			});
		}
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

		let freeze = true;
		if (frozen === "thawn") {
			freeze = false;
		}
		if (!tokenAccountPk) {
			throw Error("invalid token account pubkey");
		}

		let freezeThawIx = await market?.thawFreezeTokenAccountIx(
			freeze,
			market.lpMintPK,
			tokenAccountPk,
			multisigSigner
		);

		const transaction = new Account();
		// @ts-ignore
		const tx = await multisigClient.rpc.createTransaction(
			config.clusterConfig.programId,
			// @ts-ignore
			freezeThawIx.keys,
			// @ts-ignore
			Buffer.from(freezeThawIx.data),
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
						TX_SIZE + 500
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
		<div
			style={{
				background: "#f1f0f0",
				padding: "24px",
			}}
		>
			<form
				onSubmit={onSubmit}
				style={{
					display: "flex",
					flexDirection: "column",
				}}
			>
				<label>
					Global marketstate seed:
					<input
						name="globalMarketSeed"
						type="text"
						placeholder={globalMarketSeed}
						onBlur={onBlurGlobalMarketSeed}
						style={{ marginLeft: "10px", width: "500px" }}
					/>
				</label>
				<br />
				<label>
					Token account pubkey:
					<input
						name="tokenAccountPubkey"
						type="text"
						onBlur={onBlurTokenAccountPk}
						style={{ marginLeft: "10px", width: "500px" }}
					/>
				</label>
				<br />
				<label>
					Type desired state: "frozen" or "thawn"; current state will be filled
					<br />
					<input
						name="frozenThawn"
						type="text"
						placeholder={frozen}
						onBlur={onBlurFrozenThawn}
						style={{ marginLeft: "10px", width: "500px" }}
					/>
				</label>
				<br />
				{/* <br />
				<label>
					Frozen? Check to freeze, uncheck to thaw. If checked, token account is
					already frozen.
					<Checkbox name="frozen" checked={frozen} onChange={onChangeFrozen} />
				</label> */}
				<input
					type="submit"
					value="create transaction"
					style={{
						background: "white",
						cursor: "pointer",
						width: "200px",
						height: "30px",
					}}
				/>
			</form>
		</div>
	);
}
