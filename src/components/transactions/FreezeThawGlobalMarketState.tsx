import { ListItem, ListItemIcon, ListItemText, Collapse, Button, Checkbox } from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { ProgramAccount } from "@project-serum/anchor";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { findPendingDeals, activateDeal, fetchGlobalMarketStateFrozen, freezeGlobalMarketState, thawGlobalMarketState } from "../../credix/api";
import { config } from "../../credix/config";
import { Deal } from "../../credix/types/program.types";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";
import { serialAsync } from "../../credix/utils/async.utils";

export function FreezeThawGlobalMarketStateListItem({
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
          <ListItemText primary={"Freeze / Thaw market"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <FreezeThawGlobalMarketStateListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
function FreezeThawGlobalMarketStateListItemDetails({
    multisig,
    onClose,
    didAddTransaction,
  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
  }) {
    const [frozen, setFrozen] = useState<boolean>(false); 
    const [globalMarketSeed, setGlobalMarketSeed] = useState<string>("credix-marketplace"); 
    const multisigClient = useMultisigProgram();
    const { enqueueSnackbar } = useSnackbar();


    const onBlurGlobalMarketSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGlobalMarketSeed(e.target.value);
        fetchFrozen();
	};

    const onChangeFrozen = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFrozen(e.target.checked); 
	};
  
    const fetchFrozen = async () => {
      try {
        const globalMarketStateInfo = await fetchGlobalMarketStateFrozen(globalMarketSeed, multisigClient.provider); 
        console.log("frozen", globalMarketStateInfo.frozen); 
        setFrozen(globalMarketStateInfo.frozen); 
      } catch (err) {
        enqueueSnackbar(`market with name ${globalMarketSeed} does not exist`, {
            variant: "error",
          });
        setFrozen(false); 
      }
    }
  
    const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
      e.preventDefault();

      enqueueSnackbar("Creating transaction", {
        variant: "info",
      });
  
      const [multisigSigner] = await PublicKey.findProgramAddress(
        [multisig.toBuffer()],
        multisigClient.programId
      );
      
      let activateIx = await thawGlobalMarketState(multisigSigner, globalMarketSeed, multisigClient.provider);  
      if (frozen) {
        activateIx = await freezeGlobalMarketState(multisigSigner, globalMarketSeed, multisigClient.provider);
      } 
      const transaction = new Account();
      const tx = await multisigClient.rpc.createTransaction(
        config.clusterConfig.programId,
        activateIx.keys,
        Buffer.from(activateIx.data),
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
            <form 
                onSubmit={onSubmit}
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
                        style={{marginLeft: "10px", width: "500px"}}
                    />
                </label>
                <label>
                    Frozen? Check to freeze, uncheck to thaw. If checked, market is already frozen. 
                    <Checkbox
                        name="frozen"
                        checked={frozen}
                        onChange={onChangeFrozen}
                    />
                </label>
                <input
                    type="submit"
                    value="create transaction"
                    style={{background: "white", cursor: "pointer", width:"200px", height:"30px"}}
                />
            </form>
        </div>
    );
  }