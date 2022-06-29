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
          <img
            src="/credix.svg"
            alt="Credix Logo"
            style={{ width: "20px", marginLeft: "3px" }}
          />
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
  const [market, setMarket] = useState<Market | null>();
  const [frozen, setFrozen] = useState<boolean>(false);
  const [globalMarketSeed, setGlobalMarketSeed] = useState<string>(
    SEEDS.GLOBAL_MARKET_STATE_PDA
  );
  const [multisigClient, credixClient] = useMultisigProgram();
  const { enqueueSnackbar } = useSnackbar();

  const onBlurGlobalMarketSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalMarketSeed(e.target.value);
    fetchFrozen(e.target.value);
  };

  const onChangeFrozen = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrozen(e.target.checked);
  };

  const fetchFrozen = async (seed: string) => {
    const market = await credixClient.fetchMarket(globalMarketSeed);
    setMarket(market);
    try {
      // @ts-ignore
      setFrozen(market?.isFrozen);
    } catch (err) {
      enqueueSnackbar(`market with name ${seed} does not exist`, {
        variant: "error",
      });
      setFrozen(false);
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
    console.log(multisigSigner);
    let activateIx = await market?.freezeIx(multisigSigner);
    if (frozen) {
      activateIx = await market?.thawIx(multisigSigner);
    }
    console.log("actiave ix", activateIx);
    const transaction = new Account();
    // @ts-ignore
    const tx = await multisigClient.rpc.createTransaction(
      config.clusterConfig.programId,
      // @ts-ignore
      activateIx.keys,
      // @ts-ignore
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
            TX_SIZE + 100
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
        <label>
          Frozen? Check to freeze, uncheck to thaw. If checked, market is
          already frozen.
          <Checkbox name="frozen" checked={frozen} onChange={onChangeFrozen} />
        </label>
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
