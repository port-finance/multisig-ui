import { Program, Provider, Wallet } from "@project-serum/anchor";
import { ConfirmOptions, Keypair } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import MultisigIdl from "../idl";
import { getMultisigProgramIdByUrl } from "../utils/ids"; 
import { useConnection } from "../context/connection";

export function useMultisigProgram(): Program {
  const wallet = useAnchorWallet();
  const connection = useConnection();
  const currentNetwork = (connection as any)._rpcEndpoint;
  const currentMultisigProgramId = getMultisigProgramIdByUrl(currentNetwork); 
  return useMemo(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    let provider = new Provider(connection, wallet ?? new Wallet(Keypair.generate()), opts);
    // console.log(currentMultisigProgramId);
    return new Program(MultisigIdl, "74Cgm3as7QPrp1v8DfQkUHmj6QaSQupqCKGKmKhAvfzV", provider);
  }, [wallet, connection]);
}
