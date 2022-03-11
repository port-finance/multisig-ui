import { PublicKey } from "@solana/web3.js";

export const WRAPPED_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export let TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const PROGRAM_IDS = [
  {
    name: "mainnet-beta",
    url: "https://solana-api.projectserum.com", 
    multisigProgramId: "msigmtwzgXJHj2ext4XJjCDmpbcMuufFb5cHuwg6Xdt"
  },
  {
    name: "devnet",
    url: "https://api.devnet.solana.com",
    multisigProgramId: "74Cgm3as7QPrp1v8DfQkUHmj6QaSQupqCKGKmKhAvfzV"
  },
  {
    name: "localnet",
    url: "http://127.0.0.1:8899",
    multisigProgramId: "74Cgm3as7QPrp1v8DfQkUHmj6QaSQupqCKGKmKhAvfzV"
  },
];

export const setProgramIds = (envName: string) => {
  let instance = PROGRAM_IDS.find((env) => env.name === envName);
  if (!instance) {
    return;
  }
};

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
  };
};

export const getMultisigProgramIdByUrl = (url: string) => {
  let instance = PROGRAM_IDS.find((env) => env.url == url); 
  if (!instance) {
    return "";
  }; 
  return instance.multisigProgramId; 
}; 