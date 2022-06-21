import { Program, Provider, Wallet, } from "@project-serum/anchor";
import { CredixClient } from "@credix/credix-client";
import { ConfirmOptions, Keypair, PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@project-serum/anchor/dist/cjs/provider";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import MultisigIdl from "../idl";
import { getMultisigProgramIdByUrl } from "../utils/ids"; 
import { useConnection } from "../context/connection";

export function useMultisigProgram(): [Program, CredixClient] {
  const wallet = useAnchorWallet();
  const connection = useConnection();
  
  return useMemo(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    const currentNetwork = (connection as any)._rpcEndpoint;
    const currentMultisigProgramId = getMultisigProgramIdByUrl(currentNetwork); 
    const programId = new PublicKey("CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX"); 
    const config = { programId: programId, confirmOptions: opts };
    let provider = new Provider(connection, wallet ?? new Wallet(Keypair.generate()), opts);
    let newProgram = new Program(MultisigIdl, currentMultisigProgramId, provider);
    let newCredixClient = new CredixClient(connection, wallet as Wallet, config);
    return [newProgram, newCredixClient];
  }, [wallet, connection]);
}
