import { ListItem, ListItemIcon, ListItemText, Collapse, Button, Checkbox } from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { ProgramAccount } from "@project-serum/anchor";
import { useSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { initializeMarket, fetchGlobalMarketStateFrozen, freezeGlobalMarketState, thawGlobalMarketState } from "../../credix/api";
import { config } from "../../credix/config";
import { Deal } from "../../credix/types/program.types";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import { TX_SIZE } from "../../credix/consts";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";
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
            <img src="/credix.svg" alt="Credix Logo" style={{width: "30px"}}/>
          </ListItemIcon>
          <ListItemText primary={"Initialize market"} />
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
    const [withdrawalFee, setWithdrawalFee] = useState<number>(10)
    const [interestFee, setInterestFee] = useState<number>(0.5)
    const [globalMarketSeed, setGlobalMarketSeed] = useState<string>("credix-marketplace")
    const [baseMintPk, setBaseMintPk] = useState<string>("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")
    const [treasuryPk, setTreasuryPk] = useState<string>("FW7CiLgLKyx54hpXHVNquFpyAQuLTTFYeprswocpiVHV")
    const [gatekeeperNetworkPk, setGatekeeperNetworkPk] = useState<string>("Br5iqQaPsb3HStGfri4enwLoUVp5zfJuZhkFFdWgSqqq")
    const [multisigClient, credixClient] = useMultisigProgram();
    const { enqueueSnackbar } = useSnackbar();

    const onChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		setter: any
	) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		setter(newValue);
	};

    const onChangeWithdrawalFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setWithdrawalFee); 
	};

    const onChangeInterestFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setInterestFee); 
	}; 

    const onChangeGlobalMarketSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGlobalMarketSeed(e.target.value);
	};

    const onChangeBaseMintPk = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBaseMintPk(e.target.value);
	};

    const onChangeTreasuryPk = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTreasuryPk(e.target.value);
	};

    const onChangeGatekeeperNetworkPk = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGatekeeperNetworkPk(e.target.value);
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
      
      let activateIx = await initializeMarket(multisigSigner, withdrawalFee, interestFee, globalMarketSeed, baseMintPk, treasuryPk, gatekeeperNetworkPk, multisigClient.provider); 
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
              TX_SIZE
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
                    Withdrawal fee:  
                    <input
                        name="withdrawalFee"
                        type="number"
                        value={withdrawalFee}
                        onChange={onChangeWithdrawalFee}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
                    />
                </label>
                <label>
                    Interest fee:  
                    <input
                        name="interestFee"
                        type="number"
                        value={interestFee}
                        onChange={onChangeInterestFee}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
                    />
                </label>
                <label>
                    Global marketstate seed: 
                    <input
                        name="globalMarketSeed"
                        type="text"
                        value={globalMarketSeed}
                        onChange={onChangeGlobalMarketSeed}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
                    />
                </label>
                <label>
                    (Base) mint public key: 
                    <input
                        name="baseMintPublicKey"
                        type="text"
                        value={baseMintPk}
                        onChange={onChangeBaseMintPk}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
                    />
                </label>
                <label>
                    Treasury public key (NOT token account pk): 
                    <input
                        name="treasuryPublicKey"
                        type="text"
                        value={treasuryPk}
                        onChange={onChangeTreasuryPk}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
                    />
                </label>
                <label>
                    Civic gatekeeper network public key: 
                    <input
                        name="gatekeeperNetworkPublicKey"
                        type="text"
                        value={gatekeeperNetworkPk}
                        onChange={onChangeGatekeeperNetworkPk}
                        style={{marginLeft: "10px", width: "500px", margin: "10px"}}
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