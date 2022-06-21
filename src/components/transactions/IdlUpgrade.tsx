import { ListItem, ListItemIcon, ListItemText, Collapse, TextField, Button } from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { idlAddress } from "@project-serum/anchor/dist/cjs/idl";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import * as idl from "../../utils/idl";
import { ViewTransactionOnExplorerButton } from "../Notification";
import DescriptionIcon from "@material-ui/icons/Description";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";
import { TX_SIZE } from "../../credix/consts";

export function IdlUpgradeListItem({
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
            <DescriptionIcon />
          </ListItemIcon>
          <ListItemText primary={"Upgrade IDL"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <UpgradeIdlListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
  function UpgradeIdlListItemDetails({
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
  
    const [multisigClient, credixClient] = useMultisigProgram();
    const { enqueueSnackbar } = useSnackbar();
    const createTransactionAccount = async () => {
      enqueueSnackbar("Creating transaction", {
        variant: "info",
      });
      const programAddr = new PublicKey(programId as string);
      const bufferAddr = new PublicKey(buffer as string);
      const idlAddr = await idlAddress(programAddr);
      const [multisigSigner] = await PublicKey.findProgramAddress(
        [multisig.toBuffer()],
        multisigClient.programId
      );
      const data = idl.encodeInstruction({ setBuffer: {} });
      const accs = [
        {
          pubkey: bufferAddr,
          isWritable: true,
          isSigner: false,
        },
        { pubkey: idlAddr, isWritable: true, isSigner: false },
        { pubkey: multisigSigner, isWritable: true, isSigner: false },
      ];
      const txSize = TX_SIZE; // TODO: tighter bound.
      const transaction = new Account();
      const tx = await multisigClient.rpc.createTransaction(
        programAddr,
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
          label="New IDL buffer"
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