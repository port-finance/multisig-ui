import { ListItem, ListItemIcon, ListItemText, Collapse, TextField, IconButton, Button } from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import AddIcon from "@material-ui/icons/Add";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { ViewTransactionOnExplorerButton } from "../Notification";
import SupervisorAccountIcon from "@material-ui/icons/SupervisorAccount";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";

export function MultisigSetOwnersListItem({
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
            <SupervisorAccountIcon />
          </ListItemIcon>
          <ListItemText primary={"Set owners"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <SetOwnersListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
  function SetOwnersListItemDetails({
    multisig,
    onClose,
    didAddTransaction,
  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
  }) {
    const [multisigClient, credixClient] = useMultisigProgram();
    // @ts-ignore
    const zeroAddr = new PublicKey("11111111111111111111111111111111").toString();
    const [participants, setParticipants] = useState([zeroAddr]);
    const { enqueueSnackbar } = useSnackbar();
    const setOwners = async () => {
      enqueueSnackbar("Creating setOwners transaction", {
        variant: "info",
      });
      const owners = participants.map((p) => new PublicKey(p));
      const data = setOwnersData(multisigClient, owners);
      const [multisigSigner] = await PublicKey.findProgramAddress(
        [multisig.toBuffer()],
        multisigClient.programId
      );
      const accounts = [
        {
          pubkey: multisig,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: multisigSigner,
          isWritable: false,
          isSigner: true,
        },
      ];
      const transaction = new Account();
      const txSize = 5000; // TODO: tighter bound.
      const tx = await multisigClient.rpc.createTransaction(
        multisigClient.programId,
        accounts,
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
      if (!tx) {
        return;
      }
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
        {participants.map((p, idx) => (
          <TextField
            fullWidth
            style={{ marginTop: "16px" }}
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
              p.push(new PublicKey("11111111111111111111111111111111").toString());
              setParticipants(p);
            }}
          >
            <AddIcon />
          </IconButton>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <Button onClick={() => setOwners()}>Set Owners</Button>
        </div>
      </div>
    );
  }

// @ts-ignore
function setOwnersData(multisigClient, owners) {
    return multisigClient.coder.instruction.encode("set_owners", {
      owners,
    });
  }
