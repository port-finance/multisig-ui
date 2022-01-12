import { ListItem, ListItemIcon, ListItemText, Collapse, FormControl, InputLabel, Select, MenuItem, TextField, Button } from "@material-ui/core";
import { MoneyRounded, ExpandLess, ExpandMore } from "@material-ui/icons";
import { getTokenAccount, getMintInfo } from "@project-serum/common";
import { u64, Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useMultisigProgram } from "../../hooks/useMultisigProgram";
import { useMultiSigOwnedTokenAccounts } from "../../hooks/useOwnedTokenAccounts";
import { ViewTransactionOnExplorerButton } from "../Notification";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  } from "@solana/web3.js";

export function TransferTokenListItem({
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
            <MoneyRounded />
          </ListItemIcon>
          <ListItemText primary={"Transfer Token"} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <TransferTokenListItemDetails
            didAddTransaction={didAddTransaction}
            multisig={multisig}
            onClose={onClose}
          />
        </Collapse>
      </>
    );
  }
  
  function TransferTokenListItemDetails({
    multisig,
    onClose,
    didAddTransaction,
  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
  }) {
    const [source, setSource] = useState<null | string>(null);
    const [destination, setDestination] = useState<null | string>(null);
    const [amount, setAmount] = useState<null | u64>(null);
  
  
    const multisigClient = useMultisigProgram();
    const { enqueueSnackbar } = useSnackbar();
  
    const tokenAccounts = useMultiSigOwnedTokenAccounts(multisigClient.provider, multisig, multisigClient.programId)
  
    const getAssociatedTokenAddressPK = async (ownerPk: PublicKey, mintPk: PublicKey) => {
      return await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintPk,
        ownerPk
      );
    }
  
    const createTransactionAccount = async () => {
      enqueueSnackbar("Creating transaction", {
        variant: "info",
      });
      const sourceAddr = new PublicKey(source as string);
      const destinationAccAddr = new PublicKey(destination as string);
      const [multisigSigner] = await PublicKey.findProgramAddress(
        [multisig.toBuffer()],
        multisigClient.programId
      );
      const sourceTokenAccount = await getTokenAccount(
        multisigClient.provider,
        sourceAddr,
      );
  
      const destinationTokenAccAddr = await getAssociatedTokenAddressPK(destinationAccAddr, sourceTokenAccount.mint); 
  
      // @ts-ignore
      try { 
          const destinationTokenAccount = await getTokenAccount(
          multisigClient.provider,
          destinationTokenAccAddr
        );
        // @ts-ignore
        if (sourceTokenAccount.mint.toBase58() !== destinationTokenAccount.mint.toBase58()) {
          enqueueSnackbar("Token mint does not match", {
            variant: "error",
          });
          return;
        }
      } catch (err) {
          enqueueSnackbar("No token account found for the destination address. Op in for this specific token on your phantom wallet.", {variant: "error",});
        return;
      }
  
      const tokenMint = await getMintInfo(
        multisigClient.provider, sourceTokenAccount.mint);
  
      if (!amount) {
        enqueueSnackbar("No amount provided", {
          variant: "warning",
        });
        return;
      }
      const TEN = new u64(10);
      const multiplier = TEN.pow(new BN(tokenMint.decimals));
      const amountInLamports = amount.mul(multiplier);
      const transferIx = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        sourceAddr,
        destinationTokenAccAddr,
        multisigSigner,
        [],
        new u64(amountInLamports.toString())
      );
      const transaction = new Account();
      const tx = await multisigClient.rpc.createTransaction(
        TOKEN_PROGRAM_ID,
        transferIx.keys,
        Buffer.from(transferIx.data),
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
    };
  
    return (
      <div
        style={{
          background: "#f1f0f0",
          paddingTop: "24px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        <FormControl fullWidth>
          <InputLabel id="source-select-label">Source Token Mint</InputLabel>
          <Select
            autoWidth={true}
            value={source}
          >
            {tokenAccounts.map(
              tokenAccount => {
                return (
                  <MenuItem value={tokenAccount.address.toString()} onClick={
                    () => {
                      setSource(tokenAccount.address.toString());
                    }
                  }>
                    <p>{tokenAccount.mint.toString()} - [Balance: {(tokenAccount.amount.toNumber() / 1000000).toString()}]</p>
                  </MenuItem>
                )
              }
            )}
          </Select>
          <TextField
            style={{ marginTop: "16px" }}
            fullWidth
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(new u64(e.target.value as string))}
          />
          <TextField
            style={{ marginTop: "16px" }}
            fullWidth
            label="Destination Address"
            value={destination}
            onChange={(e) => setDestination(e.target.value as string)}
          />
  
        </FormControl>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <Button onClick={() => createTransactionAccount()}>
            Create Token Transfer
          </Button>
        </div>
      </div>
    );
  }