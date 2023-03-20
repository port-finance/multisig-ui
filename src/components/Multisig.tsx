import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSnackbar } from "notistack";
import { encode as encodeBase64 } from "js-base64";
import Container from "@material-ui/core/Container";
import AppBar from "@material-ui/core/AppBar";
import StarsIcon from "@material-ui/icons/Stars";
import DescriptionIcon from "@material-ui/icons/Description";
import Paper from "@material-ui/core/Paper";
import SupervisorAccountIcon from "@material-ui/icons/SupervisorAccount";
import CheckIcon from "@material-ui/icons/Check";
import ReceiptIcon from "@material-ui/icons/Receipt";
import RemoveIcon from "@material-ui/icons/Remove";
import Collapse from "@material-ui/core/Collapse";
import Toolbar from "@material-ui/core/Toolbar";
import InfoIcon from "@material-ui/icons/Info";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableBody from "@material-ui/core/TableBody";
import GavelIcon from "@material-ui/icons/Gavel";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import BuildIcon from "@material-ui/icons/Build";
import Tooltip from "@material-ui/core/Tooltip";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import CardContent from "@material-ui/core/CardContent";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import AddIcon from "@material-ui/icons/Add";
import List from "@material-ui/core/List";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
// import CredixLogo from "../credix.svg";
import { BN } from "bn.js";
import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { ViewTransactionOnExplorerButton } from "./Notification";
// import * as idl from "../utils/idl";
import { useMultisigProgram } from "../hooks/useMultisigProgram";
import {
	Token,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	u64,
	AccountInfo as TokenAccount,
	AccountLayout,
} from "@solana/spl-token";
import { MoneyRounded } from "@material-ui/icons";
import { Connection } from "@solana/web3.js";
import {
	getMintInfo,
	getTokenAccount,
	parseTokenAccount,
	ProgramAccount,
} from "@project-serum/common";
import { useMultiSigOwnedTokenAccounts } from "../hooks/useOwnedTokenAccounts";
import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import { config } from "../credix/config";
import { ChangeThresholdListItem } from "./transactions/ChangeThreshold";
import { ProgramUpdateListItem } from "./transactions/ProgramUpgrade";
// import { IdlUpgradeListItem } from "./transactions/IdlUpgrade";
import { MultisigSetOwnersListItem } from "./transactions/SetOwners";
import { ActivateDealListItem } from "./transactions/ActivateDeal";
import { OpenDealListItem } from "./transactions/OpenDeal";
// import { TransferTokenListItem } from "./transactions/TransferToken";
import { FreezeThawGlobalMarketStateListItem } from "./transactions/FreezeThawGlobalMarketState";
import { UpdateMarketListItem } from "./transactions/UpdateMarket";
import { CredixPassListItem } from "./transactions/CredixPass";
import { TranchePassListItem } from "./transactions/TranchePass";
import { MarketAdminsListItem } from "./transactions/MarketAdmins";
import { UpdateDealListItem } from "./transactions/UpdateDeal";
import { AdjustRepaymentScheduleListItem } from "./transactions/AdjustRepaymentSchedule";
import { ActivateMigratedDealListItem } from "./transactions/ActivateMigratedDeal";

const NO_SHOW_LIST = [
	"DRPykGTLFzhNB8mMP1aw9wBt9ZSgv1FFxdnbCQoXDo8o",
	"7ezaSsbSoHJWqA59KAq1ENZGgJjhNtVpzULPbyzFNRqF",
	"59y9hWxMbW3MVFP36TJbipaXzXMAWJfoBisP6NtFKDrU",
	"FPyePnLxghsUwPtrp9pEU8yc3W96ieDPdAdhWFbPKdMV",
	"AuMhJnjpiQjHffgbkA8HQ4fWjWi5yTJpAV9b8ZdwfpKv",
	"3PRgK6SPnJZD8C34esq2fW13pMU1Ky8GagjEqxJVcmXK",
	"AczcRjjZ47negBzU4TVkQQRe4PYMCVsmo5C3Tt6dzXRs",
	"2CPEs3TizBopukcHTrPPeVYy8DRr4RVoLfp5ccgchDEn",
	"CrWf9XdZwL8iy8Jhbu4DRJLAUmn7iv5pT67c8Wyj2pUu",
	"BA4gCkzBYcrVv6CmrWoia4cV7GqwSV2Aay18wM2Jf8Fu",
	"56bNvH6Ckvqops5gbgM1rBaVi8nSk4aiykmXgrjNfCRn",
	"4gAmLrY61STRGrPL2eLmyXz2eE3x9XZSJPkbUBF3LDwB",
	"387KmRLPVDUf7TQSbiEaQB8Jy36HgH7LMsbyj67LHXWu",
	"9Do5Eh2oeQjVNW75c6gmSBbcnM2Z8FK6AQNPsjmLWcX6",
	"AaXXDNBDESnrN3wWGsXV7ke1v5mTY6m46ok418FeQ1mt",
	"BC8ZyiUT7nVSGQnBcujCEHyaJrjkmFA7SBSbfjL3qnsV",
	"9YkX6vfZKg9vD4E7P46UMzkeqYtsXiTm2WLfrZS4tA8L",
	"J9QvJTf8y9Vm4Q69zSBqzXLjTvdc8zgbqBmrC3TJwdJW",
	"9ULcD9McCETwUaT3Pw8uZxk81qriiKRTX9Uo7LJZXj6o",
	"7ZwEod26DTdygr4rvrYLH9yLyyzh5UgXEumvo8x9CFJ7",
	"9QXwLCgjFJYSCrHaDgti4qQJHcFmnTsuBipNVXDCWUs8",
	"35GhRoQNbtB8h5zAWWFNo4vvqpAqfYhwGMGyDQahg8pJ",
	"EigpveeSn5jVPL78m4x7M83er3Czz5Gw2aeJ5XtSgPgr",
	"AGnNFEp49utYtqMCRFGZo1t5J9mZVY4CA5rGWWdiyLqr",
	"HhkHFd7DjGxzDCDhYe5tsz4EqLuHHe7uVoUyquP2b6MK",
	"6vCbSFtMScZnqJUfQbfJGKHQVGGgHLNNBsZEtTCUHnUo",
	"8R4svSBvqEQV4twfiCZeZVbfdjUGgTmMT1GpHhWMBrA6",
	"5n5bwcHRMEZL6pYrMKQMeyQDtMbVzAbHeQF6mpy26jYS",
	"CjBoGN5suTtiyAevoQ69sCr5dVX8LAGLvQ2vyiuLcfnY",
	"EQ73zgjJPJU71qjzofCDJ6zexntvDttFBxwG9jbFunTh",
	"DeEHzBxtQyDVK2vZyB3euvgL6cnYU6cfsPHTgdm7euXz",
	"DtTHVgjYUkubr6haRyY74Kv8rBQM7kBmdbEKmrrjrprB",
	"fiq7nyThaQdH8wyfEFgFhHS4VnYFGdA4SvTP73LdgUh",
	"Dc2DrnKfAcnnTwf9bJYGi8ot6qsr5BwPXLH6GNNy93cP",
	"Crh7AQdaHbGQzMLpcgxU9xntjLfr5jxXejrPAfE9qnuR",
	"GpDmfRGGF7Wz1EZ2rMU3Grn7NkVwspLMg3p7RHFtKk1S",
	"4hRCkqCyyMtMvraFA7fGCFF3wpvCwdNXrMxGRxSwujqo",
	"5cnSAp7vCadCH75R6Kat1ZW1Pq4W317hQ6bWKD35oTBN",
	"3pnafRSCgSuU7yCeuUCXRgeNJKbbC25sXGnybW3GvipY",
	"GR4bLNMD7tBRTLgFXwJq5So2QGh92QZDfDXrH3e1M3eN",
	"FFu2QvyiFDg2omxLTqwyV57gAonRR5RSouVdJonFwekd",
	"CE7cQRSbYBXXWu9MvBj6MoMbfzNhJgJux7Rg1JAhZtqy",
	"GTh1AY9v5ZAQYpQ7KdzWK8K8k41nAiPRas2nfnscYxU9",
	"5fuFHNcQebNdsEQhaMwgZs7tpcdSy8LA2LFuDKG1bNAH",
	"9Y1Xo76H1oeEhokpDGR7d5iVgioq48ktHFEXP6Pjk2Lm",
	"Ap3sqH2ka1XgxS11PbrjTaVLwSQVbQj8QdwbE96mREyR",
	"BR526swddpwyyuJqzwtWhc59gEcoy88qV45uJi2PwEZH",
	"2Z6TsJVg7YhS3RtYUjzxUXab6cYLgaQsEvhWnusJcUnK",
	"9ZXvBiW1U5CBh56FD9Mi82RJWh9juRuqgr1EYNcgHKpg",
	"AJKeAJgXo16NzYJcw3R8WKrK11tYhoChVCHTWGBbHxcw",
	"c5eiDeZHQe1Ly4bDx7QfRaKckuBgZWfgfJj8khyUcAu",
	"2Mbj3epHTv6Q2NHESqU4pCv8KjMRynhQtNULsEBjPWeY",
	"6GSHyR9HyKj2KH9PnU5Dd3uLeoayxiKqGbkcM8Y5dzeo",
	"2mztM4EBhUAiFVixdaYvzqe9YdZZ3oCGTewaVojFbufR",
	"HcJcGK6zdV4EnNCHwEmpUMFGvDJYL3dRaVHCtiRFJ8z3",
	"FiLV2C198Yfw156Q1CvotjmDhNbqdwsNxZFMhB8Cbce8",
	"5UqRdQyB4k9cwcMvZKyvVrESSVEg931Y3P2c6BjSAk6E",
	"7u3n13SDjBgz5Q6tmKRZzXnWCUmZJpva4Db1PUFXU9BE",
	"FP3hjhVmkk2b5adR6hYQ4HUjXaB659Gb6fTMzeCVZoiS",
	"8J5ChExD4pM6fPbMFk2bBKDQfkPLXXTeKSgeNkpfuEsR",
	"BGkL2E8h9m1W6Ea7ekjqC7QZd7ewGkuQH14aTdnAPd61",
	"4Erf8j8fzEqbRwpfmsPu4EmrzSSusBTpURiKbNkrATp4",
	"GWUdwKp4Z64R3kAqS44rwwVsmvWFzTBTvn558dQB2mWp",
	"ATLMVhNNvKzTv6egMbETc2EhJWvJCHwAzHiDCwi1ssdn",
	"DP4VKAYv5LSK7Cry4MRaUig9KPvrAkTcAUwK759P6Zxt",
	"CUPTwXBcUQZUqw5mw9B6GJ2GmuU2Yjww5Wrw4NpDgQ4k",
	"HuwWNPWEW8fkkLe4LuvNXpcoMhjNznhRZxQxFYVwjKz3",
	"G6TvM8C79sd2YJ3T48HQCQJQjKXTeid5RWYWN1fuB3V",
	"2rWbzXDwQJmuk5tQRTVcNd4NtTXAD2Ef818KvPVMiKyM",
];

// NEW TRANSACTION
function AddTransactionDialog({
	multisig,
	open,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	open: boolean;
	onClose: () => void;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	return (
		<Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
			<DialogTitle>
				<Typography variant="h4" component="h2">
					New Transaction
				</Typography>
			</DialogTitle>
			<DialogContent style={{ paddingBottom: "16px" }}>
				<DialogContentText>
					Create a new transaction to be signed by the multisig. This
					transaction will not execute until enough owners have signed the
					transaction.
				</DialogContentText>
				<List disablePadding>
					<ProgramUpdateListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					{/* <IdlUpgradeListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/> */}
					<MultisigSetOwnersListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<ChangeThresholdListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					{/* <TransferTokenListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/> */}
					<TranchePassListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<OpenDealListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<ActivateDealListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<UpdateDealListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<FreezeThawGlobalMarketStateListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<CredixPassListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<MarketAdminsListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<UpdateMarketListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<AdjustRepaymentScheduleListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
					<ActivateMigratedDealListItem
						didAddTransaction={didAddTransaction}
						multisig={multisig}
						onClose={onClose}
					/>
				</List>
			</DialogContent>
		</Dialog>
	);
}

// LABELS FOR TRANSACTIONS
function ixLabel(tx: any, multisigClient: any) {
	console.log(tx);
	console.log("account length", tx.account.accounts.length);
	console.log("data length", tx.account.data.length);
	if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
		// Upgrade instruction.
		if (tx.account.data.equals(Buffer.from([3, 0, 0, 0]))) {
			return (
				<ListItemText
					primary="Program upgrade"
					secondary={tx.publicKey.toString()}
				/>
			);
		}
	}
	// if (tx.account.programId.equals(multisigClient.programId)) {
	// 	const setThresholdSighash = multisigClient.coder.sighash(
	// 		"global",
	// 		"change_threshold"
	// 	);
	// 	if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
	// 		return (
	// 			<ListItemText
	// 				primary="Set threshold"
	// 				secondary={tx.publicKey.toString()}
	// 			/>
	// 		);
	// 	}
	// 	const setOwnersSighash = multisigClient.coder.sighash(
	// 		"global",
	// 		"set_owners"
	// 	);
	// 	if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
	// 		return (
	// 			<ListItemText
	// 				primary="Set owners"
	// 				secondary={tx.publicKey.toString()}
	// 			/>
	// 		);
	// 	}
	// }
	if (tx.account.programId.equals(TOKEN_PROGRAM_ID)) {
		const tag = tx.account.data.slice(0, 1);
		const amountBuf = tx.account.data.slice(1, 9) as Buffer;
		const amountParsed = u64.fromBuffer(amountBuf).toNumber() / 1000000;
		if (Buffer.from([3]).equals(tag)) {
			return (
				<ListItemText
					primary={`Transfer ${amountParsed.toString()} Token`}
					// primary={"yey"}
					secondary={tx.publicKey.toString()}
				/>
			);
		}

		if (Buffer.from([4]).equals(tag)) {
			return (
				<ListItemText
					primary="Approve Token"
					secondary={tx.publicKey.toString()}
				/>
			);
		}

		if (Buffer.from([7]).equals(tag)) {
			return (
				<ListItemText
					primary="Mint Token To"
					secondary={tx.publicKey.toString()}
				/>
			);
		}
		return (
			<ListItemText
				primary="Token Instructions"
				secondary={tx.publicKey.toString()}
			/>
		);
	}
	if (tx.account.programId.equals(config.clusterConfig.programId)) {
		if (tx.account.accounts.length === 4 && tx.account.data.length === 8) {
			return (
				<ListItemText
					primary={"Freeze / Thaw market"}
					secondary={tx.publicKey.toString()}
				/>
			);
			// } else if (tx.account.accounts.length === 13) {
			//   return (
			//     <ListItemText
			//       primary={"Set up new market"}
			//       secondary={tx.publicKey.toString()}
			//     />
			//   );
		} else if (
			tx.account.accounts.length === 6 &&
			tx.account.data.length === 20
		) {
			// update credix pass newest version
			const credixPassPk = tx.account.accounts[1].pubkey.toString();
			const active = tx.account.data.slice(8, 9)[0];
			const underwriter = tx.account.data.slice(9, 10)[0];
			const borrower = tx.account.data.slice(10, 11)[0];
			const releaseDateBuffer = tx.account.data.slice(11, 19);
			const releaseDateUnix = u64.fromBuffer(releaseDateBuffer);
			const disableWithdrawalFee = tx.account.data.slice(19, 20)[0];
			let releaseDate;

			if (releaseDateUnix.eq(new BN(0))) {
				releaseDate = "no lockup";
			} else {
				releaseDate = new Date(releaseDateUnix.toNumber() * 1000);
			}

			return (
				<ListItemText
					primary={`Update credix pass for ${credixPassPk}`}
					secondary={`Is active: ${!!active}, Is borrower: ${!!borrower}, Is LP: ${!!underwriter}, disable withdrawal fee: ${!!disableWithdrawalFee} Lockup release date: ${releaseDate}`}
				/>
			);
		} else if (
			tx.account.accounts.length === 8 &&
			tx.account.data.length === 19
		) {
			// create credix pass newest version
			const credixPassPk = tx.account.accounts[1].pubkey.toString();
			const underwriter = tx.account.data.slice(8, 9)[0];
			const borrower = tx.account.data.slice(9, 10)[0];
			const releaseDateBuffer = tx.account.data.slice(10, 18);
			const releaseDateUnix = u64.fromBuffer(releaseDateBuffer);
			const disableWithdrawalFee = tx.account.data.slice(18, 19)[0];
			let releaseDate;

			if (releaseDateUnix.eq(new BN(0))) {
				releaseDate = "no lockup";
			} else {
				releaseDate = new Date(releaseDateUnix.toNumber() * 1000);
			}

			return (
				<ListItemText
					primary={`Issue credix pass for ${credixPassPk}`}
					secondary={`Is borrower: ${!!borrower}, Is underwriter ${!!underwriter}, disable withdrawal fee: ${!!disableWithdrawalFee}, Lockup release date: ${releaseDate}`}
				/>
			);
		} else if (tx.account.data.length === 11) {
			// update credix pass newest version
			const credixPassPk = tx.account.accounts[1].pubkey.toString();
			return (
				<ListItemText
					primary={`Issue / update credix pass for ${credixPassPk.slice(
						0,
						5
					)}...${credixPassPk.slice(-5)}`}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (
			tx.account.accounts.length === 10 &&
			tx.account.data.length === 9
		) {
			const investorPk = tx.account.accounts[1].pubkey.toString();
			return (
				<ListItemText
					primary={`Issue Tranche pass for ${investorPk}`}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (
			tx.account.accounts.length === 4 &&
			tx.account.data.length === 33
		) {
			return (
				<ListItemText
					primary={"Update deal config"}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (tx.account.accounts.length === 8) {
			return (
				<ListItemText
					primary={`Update LP token name`}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (tx.account.accounts.length === 4) {
			return (
				<ListItemText
					primary={"Update market admins"}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (
			tx.account.accounts.length === 6 &&
			tx.account.data.length === 8
		) {
			const dealPk = tx.account.accounts[2].pubkey.toString();
			return (
				<ListItemText
					primary={`Opening deal ${dealPk}`}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (tx.account.accounts.length === 3) {
			return (
				<ListItemText
					primary={"Update market config"}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (tx.account.accounts.length === 6) {
			console.log(tx);
			return (
				<ListItemText
					primary={"Adjust repayment schedule"}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else if (tx.account.accounts.length === 19) {
			const borrowerPk = tx.account.accounts[11].pubkey.toString();
			return (
				<ListItemText
					primary={`Activate migrated deal for borrower ${borrowerPk.toString()}`}
					secondary={tx.publicKey.toString()}
				/>
			);
		} else {
			const borrowerPk = tx.account.accounts[9].pubkey.toString();
			return (
				<ListItemText
					primary={`Activate deal for borrower ${borrowerPk.toString()}`}
					secondary={tx.publicKey.toString()}
				/>
			);
		}
	}
	// if (idl.IDL_TAG.equals(tx.account.data.slice(0, 8))) {
	// 	return (
	// 		<ListItemText primary="Upgrade IDL" secondary={tx.publicKey.toString()} />
	// 	);
	// }
	return <ListItemText primary={tx.publicKey.toString()} />;
}

export default function Multisig({ multisig }: { multisig?: PublicKey }) {
	return (
		<div>
			<Container fixed maxWidth="md">
				<div
					style={{
						position: "fixed",
						bottom: "75px",
						right: "75px",
						display: "flex",
						flexDirection: "row-reverse",
					}}
				>
					<NewMultisigButton />
				</div>
			</Container>
			{multisig && <MultisigInstance multisig={multisig} />}
		</div>
	);
}

const BPF_LOADER_UPGRADEABLE_PID = new PublicKey(
	"BPFLoaderUpgradeab1e11111111111111111111111"
);

function NewMultisigButton() {
	const [open, setOpen] = useState(false);
	return (
		<div style={{ display: "flex" }}>
			<IconButton
				style={{
					border: "solid 1pt #ccc",
					width: "60px",
					height: "60px",
					borderRadius: "30px",
				}}
				onClick={() => setOpen(true)}
			>
				<AddIcon />
			</IconButton>
			<NewMultisigDialog open={open} onClose={() => setOpen(false)} />
		</div>
	);
}

export function MultisigInstance({ multisig }: { multisig: PublicKey }) {
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const [multisigAccount, setMultisigAccount] = useState<any>(undefined);
	const [transactions, setTransactions] = useState<any>(null);
	const [showSignerDialog, setShowSignerDialog] = useState(false);
	const [showAddTransactionDialog, setShowAddTransactionDialog] =
		useState(false);
	const [forceRefresh, setForceRefresh] = useState(false);
	useEffect(() => {
		multisigClient.account.multisig
			.fetch(multisig)
			.then((account: any) => {
				setMultisigAccount(account);
			})
			.catch((err: any) => {
				console.error(err);
				setMultisigAccount(null);
			});
	}, [multisig, multisigClient.account]);
	useEffect(() => {
		multisigClient.account.transaction
			.all(multisig.toBuffer())
			.then((txs) => {
				txs.sort((a, b) =>
					!a.account.didExecute && b.account.didExecute ? -1 : 1
				);
				var txsFiltered = txs.filter(function (tx) {
					return !NO_SHOW_LIST.includes(tx.publicKey.toString());
				});
				setTransactions(txsFiltered);
			})
			.catch((err) => console.log("error", err));
	}, [multisigClient.account.transaction, multisig, forceRefresh]);
	useEffect(() => {
		multisigClient.account.multisig
			.subscribe(multisig)
			.on("change", (account) => {
				setMultisigAccount(account);
			});
	}, [multisigClient, multisig]);
	return (
		<Container fixed maxWidth="md" style={{ marginBottom: "16px" }}>
			<div>
				<Card style={{ marginTop: "24px" }}>
					{multisigAccount === undefined ? (
						<div style={{ padding: "16px" }}>
							<CircularProgress
								style={{
									display: "block",
									marginLeft: "auto",
									marginRight: "auto",
								}}
							/>
						</div>
					) : multisigAccount === null ? (
						<CardContent>
							<Typography
								color="textSecondary"
								style={{
									padding: "24px",
									textAlign: "center",
								}}
							>
								Multisig not found
							</Typography>
						</CardContent>
					) : (
						<></>
					)}
				</Card>
				{multisigAccount && (
					<Paper>
						<AppBar
							style={{ marginTop: "24px" }}
							position="static"
							color="default"
							elevation={1}
						>
							<Toolbar>
								<Typography variant="h6" style={{ flexGrow: 1 }} component="h2">
									{multisig.toString()} | {multisigAccount.threshold.toString()}{" "}
									of {multisigAccount.owners.length.toString()} Multisig
								</Typography>
								<Tooltip title="Signer" arrow>
									<IconButton onClick={() => setShowSignerDialog(true)}>
										<InfoIcon />
									</IconButton>
								</Tooltip>
								<Tooltip title="Add" arrow>
									<IconButton onClick={() => setShowAddTransactionDialog(true)}>
										<AddIcon />
									</IconButton>
								</Tooltip>
							</Toolbar>
						</AppBar>
						<List disablePadding>
							{transactions === null ? (
								<div style={{ padding: "16px" }}>
									<CircularProgress
										style={{
											display: "block",
											marginLeft: "auto",
											marginRight: "auto",
										}}
									/>
								</div>
							) : transactions.length === 0 ? (
								<ListItem>
									<ListItemText primary="No transactions found" />
								</ListItem>
							) : (
								// eslint-disable-next-line array-callback-return
								transactions.map((tx: any) => {
									if (
										!tx.account.didExecute &&
										multisigAccount.ownerSetSeqno === tx.account.ownerSetSeqno
									) {
										return (
											<TxListItem
												key={tx.publicKey.toString()}
												multisig={multisig}
												multisigAccount={multisigAccount}
												tx={tx}
											/>
										);
									}
								})
							)}
						</List>
					</Paper>
				)}
			</div>
			<AddTransactionDialog
				multisig={multisig}
				open={showAddTransactionDialog}
				onClose={() => setShowAddTransactionDialog(false)}
				didAddTransaction={() => setForceRefresh(!forceRefresh)}
			/>
			{multisigAccount && (
				<SignerDialog
					key={multisigClient.provider.publicKey?.toString()}
					multisig={multisig}
					multisigAccount={multisigAccount}
					open={showSignerDialog}
					onClose={() => setShowSignerDialog(false)}
				/>
			)}
		</Container>
	);
}

export function NewMultisigDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const navigate = useNavigate();
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();
	const [threshold, setThreshold] = useState(2);
	// @ts-ignore
	const zeroAddr = new PublicKey("11111111111111111111111111111111").toString();
	const [participants, setParticipants] = useState([zeroAddr]);
	const _onClose = () => {
		onClose();
		setThreshold(2);
		setParticipants([zeroAddr, zeroAddr]);
	};
	const [maxParticipantLength, setMaxParticipantLength] = useState(10);
	const disableCreate = maxParticipantLength < participants.length;
	const createMultisig = async () => {
		enqueueSnackbar("Creating multisig", {
			variant: "info",
		});
		const multisig = new Account();
		// Disc. + threshold + nonce.
		const baseSize = 8 + 8 + 1 + 4;
		// Add enough for 2 more participants, in case the user changes one's
		/// mind later.
		const fudge = 64;
		// Can only grow the participant set by 2x the initialized value.
		const ownerSize = maxParticipantLength * 32 + 8;
		const multisigSize = baseSize + ownerSize + fudge;
		const [, nonce] = await PublicKey.findProgramAddress(
			[multisig.publicKey.toBuffer()],
			multisigClient.programId
		);
		const owners = participants.map((p) => new PublicKey(p));
		const tx = await multisigClient.rpc.createMultisig(
			owners,
			new BN(threshold),
			nonce,
			{
				accounts: {
					multisig: multisig.publicKey,
					rent: SYSVAR_RENT_PUBKEY,
				},
				signers: [multisig],
				instructions: [
					await multisigClient.account.multisig.createInstruction(
						multisig,
						// @ts-ignore
						multisigSize
					),
				],
			}
		);
		enqueueSnackbar(`Multisig created: ${multisig.publicKey.toString()}`, {
			variant: "success",
			action: <ViewTransactionOnExplorerButton signature={tx} />,
		});
		_onClose();
		navigate(`/${multisig.publicKey.toString()}`);
	};
	return (
		<Dialog fullWidth open={open} onClose={_onClose} maxWidth="md">
			<DialogTitle>
				<Typography variant="h4" component="h2">
					New Multisig
				</Typography>
			</DialogTitle>
			<DialogContent>
				<TextField
					fullWidth
					label="Threshold"
					value={threshold}
					type="number"
					onChange={(e) => setThreshold(parseInt(e.target.value) as number)}
				/>
				<TextField
					fullWidth
					label="Max Number of Participants (cannot grow the owner set past this)"
					value={maxParticipantLength}
					type="number"
					onChange={(e) =>
						setMaxParticipantLength(parseInt(e.target.value) as number)
					}
				/>
				{participants.map((p, idx) => (
					<TextField
						key={p}
						fullWidth
						label="Participant"
						value={p}
						onChange={(e) => {
							const p = [...participants];
							p[idx] = e.target.value;
							setParticipants(p);
						}}
					/>
				))}
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<IconButton
						onClick={() => {
							const p = [...participants];
							// @ts-ignore
							p.push(
								new PublicKey("11111111111111111111111111111111").toString()
							);
							setParticipants(p);
						}}
					>
						<AddIcon />
					</IconButton>
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={_onClose}>Cancel</Button>
				<Button
					disabled={disableCreate}
					variant="contained"
					type="submit"
					color="primary"
					onClick={() =>
						createMultisig().catch((err) => {
							const str = err ? err.toString() : "";
							enqueueSnackbar(`Error creating multisig: ${str}`, {
								variant: "error",
							});
						})
					}
				>
					Create
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function TxListItem({
	multisig,
	multisigAccount,
	tx,
}: {
	multisig: PublicKey;
	multisigAccount: any;
	tx: any;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const [open, setOpen] = useState(false);
	const [txAccount, setTxAccount] = useState(tx.account);
	useEffect(() => {
		multisigClient.account.transaction
			.subscribe(tx.publicKey)
			.on("change", (account) => {
				setTxAccount(account);
			});
	}, [multisigClient, multisig, tx.publicKey]);
	const rows = [
		{
			field: "Program ID",
			value: txAccount.programId.toString(),
		},
		{
			field: "Did execute",
			value: txAccount.didExecute.toString(),
		},
		{
			field: "Instruction data",
			value: (
				<code
					style={{
						wordBreak: "break-word",
						width: "370px",
						background: "black",
						color: "#ffffff",
						float: "right",
						textAlign: "left",
					}}
				>
					{encodeBase64(txAccount.data)}
				</code>
			),
		},
		{
			field: "Multisig",
			value: txAccount.multisig.toString(),
		},
		{
			field: "Transaction account",
			value: tx.publicKey.toString(),
		},
		{
			field: "Owner set seqno",
			value: txAccount.ownerSetSeqno.toString(),
		},
	];
	const msAccountRows = multisigAccount.owners.map(
		(owner: PublicKey, idx: number) => {
			return {
				field: owner.toString(),
				value: txAccount.signers[idx] ? <CheckIcon /> : <RemoveIcon />,
			};
		}
	);
	const approve = async () => {
		enqueueSnackbar("Approving transaction", {
			variant: "info",
		});
		//@ts-ignore
		await multisigClient.rpc.approve({
			accounts: {
				multisig,
				transaction: tx.publicKey,
				owner: multisigClient.provider.publicKey,
			},
		});
		enqueueSnackbar("Transaction approved", {
			variant: "success",
		});
	};
	const execute = async () => {
		enqueueSnackbar("Executing transaction", {
			variant: "info",
		});
		const [multisigSigner] = await PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		);
		await multisigClient.rpc.executeTransaction({
			accounts: {
				multisig,
				multisigSigner,
				transaction: tx.publicKey,
			},
			remainingAccounts: txAccount.accounts
				.map((t: any) => {
					if (t.pubkey.equals(multisigSigner)) {
						return { ...t, isSigner: false };
					}
					return t;
				})
				.concat({
					pubkey: txAccount.programId,
					isWritable: false,
					isSigner: false,
				}),
		});
		enqueueSnackbar("Transaction executed", {
			variant: "success",
		});
	};
	return (
		<>
			<ListItem
				button
				onClick={() => setOpen(!open)}
				key={tx.publicKey.toString()}
			>
				<ListItemIcon>{icon(tx, multisigClient)}</ListItemIcon>
				{ixLabel(tx, multisigClient)}
				{txAccount.didExecute && (
					<CheckCircleIcon style={{ marginRight: "16px" }} />
				)}
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<div style={{ background: "#ececec", padding: "10px" }}>
					<div style={{ display: "flex", justifyContent: "flex-end" }}>
						<Button
							style={{ marginRight: "10px" }}
							variant="contained"
							color="primary"
							onClick={() =>
								approve().catch((err) => {
									let errStr = "";
									if (err) {
										errStr = err.toString();
									}
									enqueueSnackbar(`Unable to approve transaction: ${errStr}`, {
										variant: "error",
									});
								})
							}
						>
							Approve
						</Button>
						<Button
							variant="contained"
							color="secondary"
							onClick={() =>
								execute().catch((err) => {
									let errStr = "";
									if (err) {
										errStr = err.toString();
									}
									enqueueSnackbar(`Unable to execute transaction: ${errStr}`, {
										variant: "error",
									});
								})
							}
						>
							Execute
						</Button>
					</div>
					<Card style={{ marginTop: "16px" }}>
						<CardContent>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Transaction Field</TableCell>
										<TableCell align="right">Value</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{rows.map((r) => (
										<TableRow>
											<TableCell key={r.field}>{r.field}</TableCell>
											<TableCell align="right" key={`${r.field}-value`}>
												{r.value}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
					<Card style={{ marginTop: "16px" }}>
						<CardContent>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Multisig Owner</TableCell>
										<TableCell align="right">Did Sign</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{txAccount.ownerSetSeqno === multisigAccount.ownerSetSeqno &&
										msAccountRows.map((r: any) => (
											<TableRow>
												<TableCell>{r.field}</TableCell>
												<TableCell align="right">{r.value}</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
							{txAccount.ownerSetSeqno !== multisigAccount.ownerSetSeqno && (
								<div style={{ marginTop: "16px" }}>
									<Typography
										color="textSecondary"
										style={{ textAlign: "center" }}
									>
										The owner set has changed since this transaction was created
									</Typography>
								</div>
							)}
						</CardContent>
					</Card>
					<Card style={{ marginTop: "16px" }}>
						<CardContent>
							<AccountsList accounts={txAccount.accounts} />
						</CardContent>
					</Card>
				</div>
			</Collapse>
		</>
	);
}

function AccountsList({ accounts }: { accounts: any }) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableCell>Account</TableCell>
					<TableCell align="right">Writable</TableCell>
					<TableCell align="right">Signer</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{accounts.map((r: any) => (
					<TableRow>
						<TableCell>{r.pubkey.toString()}</TableCell>
						<TableCell align="right">{r.isWritable.toString()}</TableCell>
						<TableCell align="right">{r.isSigner.toString()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function SignerDialog({
	multisig,
	multisigAccount,
	open,
	onClose,
}: {
	multisig: PublicKey;
	multisigAccount: any;
	open: boolean;
	onClose: () => void;
}) {
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const [signer, setSigner] = useState<null | string>(null);
	useEffect(() => {
		PublicKey.findProgramAddress(
			[multisig.toBuffer()],
			multisigClient.programId
		).then((addrNonce) => setSigner(addrNonce[0].toString()));
	}, [multisig, multisigClient.programId, setSigner, multisigClient]);
	return (
		<Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
			<DialogTitle>
				<Typography variant="h4" component="h2">
					Multisig Info
				</Typography>
			</DialogTitle>
			<DialogContent style={{ paddingBottom: "16px" }}>
				<DialogContentText>
					<b>Program derived address</b>: {signer}. This is the address one
					should use as the authority for data governed by the multisig.
				</DialogContentText>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Owners</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{multisigAccount.owners.map((r: any) => (
							<TableRow key={r.toString()}>
								<TableCell>{r.toString()}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

// @ts-ignore
function icon(tx, multisigClient) {
	if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
		return <BuildIcon />;
	}
	// if (tx.account.programId.equals(multisigClient.programId)) {
	// 	const setThresholdSighash = multisigClient.coder.sighash(
	// 		"global",
	// 		"change_threshold"
	// 	);
	// 	if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
	// 		return <GavelIcon />;
	// 	}
	// 	const setOwnersSighash = multisigClient.coder.sighash(
	// 		"global",
	// 		"set_owners"
	// 	);
	// 	if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
	// 		return <SupervisorAccountIcon />;
	// 	}
	// }
	if (tx.account.programId.equals(TOKEN_PROGRAM_ID)) {
		return <MoneyRounded />;
	}
	// if (idl.IDL_TAG.equals(tx.account.data.slice(0, 8))) {
	// 	return <DescriptionIcon />;
	// }
	return (
		<img
			src="/credix.svg"
			alt="Credix Logo"
			style={{ width: "20px", marginLeft: "3px" }}
		/>
	);
}

// Deterministic IDL address as a function of the program id.
async function idlAddress(programId: PublicKey): Promise<PublicKey> {
	const base = (await PublicKey.findProgramAddress([], programId))[0];
	return await PublicKey.createWithSeed(base, seed(), programId);
}

// Seed for generating the idlAddress.
function seed(): string {
	return "anchor:idl";
}

export async function getOwnedTokenAccounts(
	connection: Connection,
	publicKey: PublicKey
): Promise<TokenAccount[]> {
	const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
		filters: [
			{
				memcmp: {
					offset: 32,
					bytes: publicKey.toBase58(),
				},
			},
			{
				dataSize: AccountLayout.span,
			},
		],
	});
	return accounts.map((r) => {
		const tokenAccount = parseTokenAccount(r.account.data);
		tokenAccount.address = r.pubkey;
		return tokenAccount;
	});
}
