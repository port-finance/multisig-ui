import {
	ListItem,
	ListItemIcon,
	ListItemText,
	Collapse,
	Button,
	Checkbox,
} from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { BN, ProgramAccount, Wallet } from "@project-serum/anchor";
import { useSnackbar } from "notistack";
import { useState, useEffect, useCallback } from "react";
import { config } from "../../credix/config";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";

// @ts-ignore
import DateTimePicker from "react-datetime-picker";
import {
	Account,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { serialAsync } from "../../credix/utils/async.utils";
import { SEEDS, TX_SIZE } from "../../credix/consts";
import { CredixPass, CredixPassConfig, Market } from "@credix/credix-client";

export function CredixPassListItem({
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
				<ListItemText primary={"Credix Pass"} />
				{open ? <ExpandLess /> : <ExpandMore />}
			</ListItem>
			<Collapse in={open} timeout="auto" unmountOnExit>
				<CredixPassListItemDetails
					didAddTransaction={didAddTransaction}
					multisig={multisig}
					onClose={onClose}
				/>
			</Collapse>
		</>
	);
}

function CredixPassListItemDetails({
	multisig,
	onClose,
	didAddTransaction,
}: {
	multisig: PublicKey;
	onClose: Function;
	didAddTransaction: (tx: PublicKey) => void;
}) {
	const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
		SEEDS.GLOBAL_MARKET_STATE_PDA
	);
	const [market, setMarket] = useState<Market | null>();
	const [isBorrower, setIsBorrower] = useState<boolean>(false);
	const [isUnderwriter, setIsUnderwriter] = useState<boolean>(false);
	const [isActive, setIsActive] = useState<boolean>(false);
	const [disableWithdrawalFee, setDisableWithdrawalFee] =
		useState<boolean>(false);
	const [passHolder, setPassHolder] = useState<string>("");
	const [releaseTimestamp, setReleaseTimestamp] = useState(new BN(0));
	const [credixPass, setCredixPass] = useState<CredixPass | null | any>();
	const [issueUpdate, setIssueUpdate] = useState<string>("Issue");
	const [multisigClient, credixClient, provider] = useMultisigProgram();
	const { enqueueSnackbar } = useSnackbar();

	const fetchAndSetPassData = useCallback(
		async (globalMarketSeed: string, publicKey: PublicKey) => {
			const market = await credixClient.fetchMarket(globalMarketSeed);
			setMarket(market);
			// @ts-ignore
			const credixPass = await market.fetchCredixPass(publicKey);
			// @ts-ignore
			if (credixPass) {
				setIssueUpdate("Update");
			} else {
				setIssueUpdate("Issue");
			}
			setCredixPass(credixPass);
			try {
				// @ts-ignore
				setReleaseTimestamp(new BN(credixPass.programVersion.releaseTimestamp));
			} catch (err) {
				setReleaseTimestamp(new BN(0));
			}
		},
		[multisigClient.provider.connection, multisigClient.provider.publicKey]
	);

	useEffect(() => {
		try {
			const passholderKey = new PublicKey(passHolder);
			fetchAndSetPassData(globalMarketSeed, passholderKey);
		} catch (e) {
			setCredixPass(null);
		}
	}, [passHolder, globalMarketSeed, fetchAndSetPassData]);

	useEffect(() => {
		setIsActive(!!credixPass?.isActive);
		setIsBorrower(!!credixPass?.isBorrower);
		setIsUnderwriter(!!credixPass?.isInvestor);
		setDisableWithdrawalFee(!!credixPass?.withdrawalFeeDisabled);
	}, [credixPass]);

	const isValidPublicKey = (publicKey: string) => {
		try {
			new PublicKey(publicKey);
			return true;
		} catch (e) {
			return false;
		}
	};

	const onPassHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassHolder(e.target.value);
	};

	const onActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsActive(true) : setIsActive(false);
	};

	const onBorrowerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsBorrower(true) : setIsBorrower(false);
	};

	const onUnderwriterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true"
			? setIsUnderwriter(true)
			: setIsUnderwriter(false);
	};

	const onDisableWithdrawalFeeChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		e.target.value === "true"
			? setDisableWithdrawalFee(true)
			: setDisableWithdrawalFee(false);
	};

	const onBlurGlobalMarketSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGlobalMarketSeed(e.target.value);
	};

	const onChangeReleaseTimestamp = (e: string) => {
		setReleaseTimestamp(new BN(Math.round(new Date(e).getTime() / 1000)));
	};

	const submitButtonDisabled = () =>
		!!(
			credixPass &&
			credixPass.active === isActive &&
			credixPass.isBorrower === isBorrower &&
			credixPass.isUnderwriter === isUnderwriter &&
			credixPass.disableWithdrawalFee === disableWithdrawalFee &&
			credixPass.releaseTimestamp === releaseTimestamp
		);

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		enqueueSnackbar("Creating transaction", {
			variant: "info",
		});

		if (market) {
			const [multisigSigner] = await PublicKey.findProgramAddress(
				[multisig.toBuffer()],
				multisigClient.programId
			);

			if (!isValidPublicKey(passHolder)) {
				enqueueSnackbar(`Non valid PassHolder Public Key`, {
					variant: "error",
				});
				return;
			}
			const holderPublicKey = new PublicKey(passHolder);

			const credixPassConfig: CredixPassConfig = {
				active: isActive,
				borrower: isBorrower,
				underwriter: isUnderwriter,
				disableWithdrawalFee: disableWithdrawalFee,
				releaseTimestamp: releaseTimestamp.toNumber(),
			};

			let credixPassIx = await market.updateCredixPassIx(
				holderPublicKey,
				credixPassConfig,
				multisigSigner
			);

			if (!credixPass) {
				credixPassIx = await market.issueCredixPassIx(
					holderPublicKey,
					credixPassConfig,
					multisigSigner
				);
			}
			const transaction = new Account();
			const tx = await multisigClient.rpc.createTransaction(
				config.clusterConfig.programId,
				// @ts-ignore
				credixPassIx.keys,
				// @ts-ignore
				Buffer.from(credixPassIx.data),
				{
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
							500
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
		}
	});

	return (
		<div
			style={{
				background: "#f1f0f0",
				padding: "24px",
			}}
		>
			<h2>{issueUpdate} credix pass</h2>
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
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<label>
					PassHolder Public Key
					<input
						name="holderPublicKey"
						type="text"
						value={passHolder}
						onChange={onPassHolderChange}
						style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
					/>
				</label>
				<br />
				<label>
					Is Active
					<select
						name="isActive"
						onChange={onActiveChange}
						style={{ marginLeft: "10px", width: "100px", margin: "10px" }}
					>
						<option selected={isActive} value="true">
							True
						</option>
						<option selected={!isActive} value="false">
							False
						</option>
					</select>
				</label>
				<br />
				<label>
					Is Borrower
					<select
						name="isBorrower"
						onChange={onBorrowerChange}
						style={{ marginLeft: "10px", width: "100px", margin: "10px" }}
					>
						<option selected={isBorrower} value="true">
							True
						</option>
						<option selected={!isBorrower} value="false">
							False
						</option>
					</select>
				</label>
				<br />
				<label>
					Is Underwriter
					<select
						name="isUnderwriter"
						onChange={onUnderwriterChange}
						style={{ marginLeft: "10px", width: "100px", margin: "10px" }}
					>
						<option selected={isUnderwriter} value="true">
							True
						</option>
						<option selected={!isUnderwriter} value="false">
							False
						</option>
					</select>
				</label>
				<br />
				<label>
					disableWithdrawalFee
					<select
						name="isUnderwriter"
						onChange={onDisableWithdrawalFeeChange}
						style={{ marginLeft: "10px", width: "100px", margin: "10px" }}
					>
						<option selected={disableWithdrawalFee} value="true">
							True
						</option>
						<option selected={!disableWithdrawalFee} value="false">
							False
						</option>
					</select>
				</label>
				<label>
					Release date
					<DateTimePicker
						onChange={onChangeReleaseTimestamp}
						value={new Date(releaseTimestamp.toNumber() * 1000)}
					/>
				</label>
				<br />
				<input
					type="submit"
					value={`${issueUpdate} Credix Pass`}
					disabled={submitButtonDisabled()}
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
