import { ListItem, ListItemIcon, ListItemText, Collapse, Button, Checkbox } from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { BN, ProgramAccount, Wallet } from "@project-serum/anchor";
import { useSnackbar } from "notistack";
import { useState, useEffect, useCallback } from "react";
import { updateLpTokenMetadata } from "../../credix/api";
import { config } from "../../credix/config";
import { CredixPass, Deal } from "../../credix/types/program.types";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
// @ts-ignore
import DateTimePicker  from "react-datetime-picker";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";
import { serialAsync } from "../../credix/utils/async.utils";
import { SEEDS, TX_SIZE } from "../../credix/consts";

export function NameTokenListItem({
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
            <img src="/credix.svg" alt="Credix Logo" style={{width: "20px", marginLeft: "3px"}}/>
          </ListItemIcon>
          <ListItemText primary={"Rename LP token"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <NameTokenListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
function NameTokenListItemDetails({
    multisig,
    onClose,
    didAddTransaction,
  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
  }) {
  const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(SEEDS.GLOBAL_MARKET_STATE_PDA); 
  const [lpTokenName, setLpTokenName] = useState<string>("");
	const [lpTokenSymbol, setLpTokenSymbol] = useState<string>("");

  const [multisigClient, credixClient] = useMultisigProgram();
  const { enqueueSnackbar } = useSnackbar();

  const onBlurGlobalMarketSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGlobalMarketSeed(e.target.value);
  };
  
  const onBlurLpTokenName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLpTokenName(e.target.value);
	};

  const onBlurLpTokenSymbol = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLpTokenSymbol(e.target.value);
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
    
    let nameTokenIx = await updateLpTokenMetadata(
          multisigSigner,
          globalMarketSeed, 
          lpTokenName,
          lpTokenSymbol,
          multisigClient.provider
      );
    

      const transaction = new Account();

      const tx = await multisigClient.rpc.createTransaction(
          config.clusterConfig.programId,
          nameTokenIx.keys,
          Buffer.from(nameTokenIx.data),
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
              1000
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
            padding: "24px"
            }}
        >
			<h2>Rename LP token</h2>
			<form onSubmit={onSubmit} 
                style={{
                    display: "flex",
                    flexDirection: "column"
                }}
            >
        <label>
            Global marketstate seed: 
            <input
                name="globalMarketSeed"
                type="text"
                placeholder={globalMarketSeed}
                onBlur={onBlurGlobalMarketSeed}
                style={{marginLeft: "10px", width: "500px", margin: "10px"}}
            />
        </label>
				<label>
            LP token name: 
            <input
                name="lpTokenName"
                type="text"
                placeholder={lpTokenName}
                onBlur={onBlurLpTokenName}
                style={{marginLeft: "10px", width: "500px", margin: "10px"}}
            />
        </label>
        <label>
            LP token symbol: 
            <input
                name="lpTokenSymbol"
                type="text"
                placeholder={lpTokenSymbol}
                onBlur={onBlurLpTokenSymbol}
                style={{marginLeft: "10px", width: "500px", margin: "10px"}}
            />
        </label>
				<br />
				<input
					type="submit"
					value={"rename"}
          style={{background: "white", cursor: "pointer", width:"200px", height:"30px"}}
				/>
			</form>
		</div>
    );
  }