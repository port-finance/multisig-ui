import { ListItem, ListItemIcon, ListItemText, Collapse, TextField, Button } from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import BuildIcon from "@material-ui/icons/Build";

import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";

export function ProgramUpdateListItem({
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
            <BuildIcon />
          </ListItemIcon>
          <ListItemText primary={"Upgrade program"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <UpgradeProgramListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
  export const BPF_LOADER_UPGRADEABLE_PID = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  );
  
  function UpgradeProgramListItemDetails({
    multisig,
    onClose,
    didAddTransaction,
  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
  }) {
    const [programId, setProgramId] = useState<null | string>(null);
    const [buffer, setBuffer] = useState<null | string>(null);
  
    const multisigClient = useMultisigProgram();
    const { enqueueSnackbar } = useSnackbar();
    const createTransactionAccount = async () => {
      enqueueSnackbar("Creating transaction", {
        variant: "info",
      });
      const programAddr = new PublicKey(programId as string);
      const bufferAddr = new PublicKey(buffer as string);
      // Hard code serialization.
      const data = Buffer.from([3, 0, 0, 0]);
  
      const programAccount = await (async () => {
        const programAccount = await multisigClient.provider.connection.getAccountInfo(
          programAddr
        );
        if (programAccount === null) {
          throw new Error("Invalid program ID");
        }
        return {
          // Hard code deserialization.
          programdataAddress: new PublicKey(programAccount.data.slice(4)),
        };
      })();
      const spill = multisigClient.provider.wallet.publicKey;
      const [multisigSigner] = await PublicKey.findProgramAddress(
        [multisig.toBuffer()],
        multisigClient.programId
      );
      const accs = [
        {
          pubkey: programAccount.programdataAddress,
          isWritable: true,
          isSigner: false,
        },
        { pubkey: programAddr, isWritable: true, isSigner: false },
        { pubkey: bufferAddr, isWritable: true, isSigner: false },
        { pubkey: spill, isWritable: true, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
        { pubkey: multisigSigner, isWritable: false, isSigner: false },
      ];
      const txSize = 1000; // TODO: tighter bound.
      const transaction = new Account();
      const tx = await multisigClient.rpc.createTransaction(
        BPF_LOADER_UPGRADEABLE_PID,
        accs,
        data,
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
              txSize
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
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        <TextField
          fullWidth
          style={{ marginTop: "16px" }}
          label="Program ID"
          value={programId}
          onChange={(e) => setProgramId(e.target.value as string)}
        />
        <TextField
          style={{ marginTop: "16px" }}
          fullWidth
          label="New program buffer"
          value={buffer}
          onChange={(e) => setBuffer(e.target.value as string)}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <Button onClick={() => createTransactionAccount()}>
            Create upgrade
          </Button>
        </div>
      </div>
    );
  }