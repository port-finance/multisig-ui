import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Checkbox,
} from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import React, { useState } from "react";
import { config } from "../../credix/config";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";

import { Account, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { SEEDS, TX_SIZE } from "../../credix/consts";
import {
  Market,
  Deal,
  Fraction,
  UpdateDealConfig,
  MarketAdmins,
  RepaymentPeriodConfig,
} from "@credix/credix-client";
import { serialAsync } from "../../credix/utils/async.utils";

export function ActivateMigratedDealListItem({
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
        <ListItemText primary={"Activate migrated deal"} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <ActivateMigratedDealListItemDetails
          didAddTransaction={didAddTransaction}
          multisig={multisig}
          onClose={onClose}
        />
      </Collapse>
    </>
  );
}

function ActivateMigratedDealListItemDetails({
  multisig,
  onClose,
  didAddTransaction,
}: {
  multisig: PublicKey;
  onClose: Function;
  didAddTransaction: (tx: PublicKey) => void;
}) {
  const [deal, setDeal] = useState<Deal | null>();
  const [indexToStart, setIndexToStart] = useState<number>(0);
  const [lpClaims, setLpClaims] = useState<string>("");
  const [trancheClaims, setTrancheClaims] = useState<string>("");

  const [multisigClient, credixClient] = useMultisigProgram();
  const decimals = 1000000;
  const { enqueueSnackbar } = useSnackbar();

  const isValidPublicKey = (publicKey: string) => {
    try {
      new PublicKey(publicKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchInitialClaims = async () => {
    let lastRepaidIndex = 0;
    // @ts-ignore
    const principals = [];
    // @ts-ignore
    const interests = [];
    if (deal) {
      const schedule = await deal.fetchRepaymentSchedule();
      setLpClaims(
        JSON.stringify([
          {
            investor: "REPLACE_WITH_INVESTOR_PUBKEY",
            baseAmountDeposit: schedule?.totalPrincipal.uiAmountString,
          },
        ])
      );

      const tranches = await deal.fetchTranches();
      const trancheClaims = tranches?.tranches.map((tranche) => {
        return {
          investor: "REPLACE_WITH_INVESTOR_PUBKEY",
          baseAmountDeposit: tranche.size.uiAmountString,
          trancheIndex: tranche.index,
        };
      });
      setTrancheClaims(JSON.stringify(trancheClaims));
    }
  };

  const onBlurDeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isValidPublicKey(e.target.value)) {
      enqueueSnackbar(`Non valid Deal Public Key`, {
        variant: "error",
      });
      return;
    }
    console.log(e.target.value);
    const dealPubkey = new PublicKey(e.target.value);
    const dealForPubkey = await credixClient.fetchDealByPublicKey(dealPubkey);
    setDeal(dealForPubkey);
    await fetchInitialClaims();
  };

  const onChangeIndexToStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIndexToStart(Number(e.target.value));
  };

  const onChangeLpClaims = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setLpClaims(e.target.value);
  };

  const onChangeTrancheClaims = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTrancheClaims(e.target.value);
  };

  const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    enqueueSnackbar("Creating transaction", {
      variant: "info",
    });

    const parsedLpClaims = JSON.parse(lpClaims);
    const parsedTrancheClaims = JSON.parse(trancheClaims);

    console.log({ parsedLpClaims });
    console.log({ parsedTrancheClaims });

    const [multisigSigner] = await PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId
    );

    const activateMigratedDealIx = await deal?.activateMigratedIx(
      {
        lpClaims: parsedLpClaims,
        trancheClaims: parsedTrancheClaims,
      },
      multisigSigner
    );

    console.log(activateMigratedDealIx);

    const transaction = new Account();
    const tx = await multisigClient.rpc.createTransaction(
      config.clusterConfig.programId,
      // @ts-ignore
      activateMigratedDealIx[0].keys,
      // @ts-ignore
      Buffer.from(activateMigratedDealIx[0].data),
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
        <br />
        <label>
          Deal Pubkey:
          <input
            name="dealPubkey"
            type="text"
            onBlur={onBlurDeal}
            style={{ marginLeft: "10px", width: "500px", margin: "10px" }}
          />
        </label>
        <Checkbox checked={!(deal === undefined)} />
        <br />
        <label>
          lp claims
          <textarea
            rows={5}
            name="lpClaims"
            value={lpClaims}
            onChange={onChangeLpClaims}
            style={{
              marginLeft: "10px",
              width: "500px",
              margin: "10px",
            }}
          />
        </label>
        <br />
        <label>
          tranche claims
          <textarea
            rows={10}
            name="trancheClaims"
            value={trancheClaims}
            onChange={onChangeTrancheClaims}
            style={{
              marginLeft: "10px",
              width: "500px",
              margin: "10px",
            }}
          />
        </label>
        <br />
        <br />
        <input
          type="submit"
          value={"Activate migrated deal"}
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
