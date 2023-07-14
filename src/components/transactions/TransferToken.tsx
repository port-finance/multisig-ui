import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Button,
} from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { getTokenAccount, getMintInfo, Provider } from "@project-serum/common";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	getAccount,
	getAssociatedTokenAddress,
	createTransferInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { useMultiSigOwnedTokenAccounts } from "../../hooks/useOwnedTokenAccounts";
import { ViewTransactionOnExplorerButton } from "../Notification";
import { TX_SIZE } from "../../credix/consts";
import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { u64 } from "@project-serum/borsh";

export function TransferTokenListItem({
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
					<MoneyRounded />
				</ListItemIcon>
				<ListItemText primary={"Transfer Token"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<TransferTokenListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function TransferTokenListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [source, setSource] = useState<null | string>(null);
	const [destination, setDestination] = useState<null | string>(null);
	const [amount, setAmount] = useState<null | BN>(null);

	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const tokenAccounts = useMultiSigOwnedTokenAccounts(
		provider,
		multisig,
		multisigClient.programId
	);

	const getAssociatedTokenAddressPK = async (
		ownerPk: PublicKey,
		mintPk: PublicKey
	) => {
		return await getAssociatedTokenAddress(mintPk, ownerPk);
	};

	const createTransactionAccount = async () => {
		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});
		const sourceAddr = new PublicKey(source as string);
		const destinationAccAddr = new PublicKey(destination as string);
		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);

		const sourceTokenAccount = await getAccount(
			provider.connection,
			sourceAddr
		);
		const destinationTokenAccAddr = destinationAccAddr;
		// UNCOMMENT THE BELOW IF YOU WANT TO PASS A WALLET ADDRESS AND DERIVE THE TOKEN ADDRESS
		// const destinationTokenAccAddr = await getAssociatedTokenAddressPK(destinationAccAddr, sourceTokenAccount.mint);

		// @ts-ignore
		try {
			const destinationTokenAccount = await getAccount(
				provider.connection,
				destinationTokenAccAddr
			);
			// @ts-ignore
			if (
				sourceTokenAccount.mint.toBase58() !==
				destinationTokenAccount.mint.toBase58()
			) {
				enqueueSnackbar("Token mint does not match", {
					variant: "error",
				});
				return;
			}
		} catch (err) {
			enqueueSnackbar(
				"No token account found for the destination address. Op in for this specific token on your phantom wallet.",
				{ variant: "error" }
			);
			return;
		}

		// const tokenMint = await getMintInfo(provider, sourceTokenAccount.mint);

		let tokenMint = await provider.connection.getTokenSupply(
			sourceTokenAccount.mint
		);

		if (!amount) {
			enqueueSnackbar("No amount provided", {
				variant: "warning",
			});
			return;
		}
		const TEN = new BN(10);
		const multiplier = TEN.pow(new BN(tokenMint.value.decimals));
		const amountInLamports = amount.mul(multiplier);
		const transferIx = createTransferInstruction(
			sourceAddr,
			destinationTokenAccAddr,
			multisigSigner,
			amountInLamports.toNumber()
		);
		const transaction = new Account();
		const tx = await multisigClient.rpc.createTransaction(
			TOKEN_PROGRAM_ID,
			transferIx.keys,
			Buffer.from(transferIx.data),
			{
				// @ts-ignore
				accounts: {
					multisig,
					transaction: transaction.publicKey,
					proposer: provider.publicKey as PublicKey,
					rent: SYSVAR_RENT_PUBKEY,
				},
				signers: [transaction],
				instructions: [
					await multisigClient.account.transaction.createInstruction(
						transaction,
						// @ts-ignore
						TX_SIZE + 150
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
				paddingTop: "24px",
				paddingLeft: "24px",
				paddingRight: "24px",
			}}
		>
			<FormControl fullWidth>
				<InputLabel id="source-select-label">Source Token Mint</InputLabel>
				<Select autoWidth={true} value={source}>
					{tokenAccounts.map((tokenAccount) => {
						console.log("amount", typeof tokenAccount.amount);
						return (
							<MenuItem
								value={tokenAccount.address.toString()}
								onClick={() => {
									setSource(tokenAccount.address.toString());
								}}
							>
								<p>
									{tokenAccount.mint.toString()} - [Balance:{" "}
									{(
										Number(tokenAccount.amount.toString()) / 1000000
									).toString()}
									]
								</p>
							</MenuItem>
						);
					})}
				</Select>
				<TextField
					style={{ marginTop: "16px" }}
					fullWidth
					label="Amount"
					value={amount}
					onChange={(e) => setAmount(new BN(e.target.value as string))}
				/>
				<TextField
					style={{ marginTop: "16px" }}
					fullWidth
					label="Destination Address (token account pubkey)"
					value={destination}
					onChange={(e) => setDestination(e.target.value as string)}
				/>
			</FormControl>
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					marginTop: "16px",
					paddingBottom: "16px",
				}}
			>
				<Button onClick={() => createTransactionAccount()}>
					Create Token Transfer
				</Button>
			</div>
		</div>
	);
}
