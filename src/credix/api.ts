import { BN, Program, ProgramAccount, Provider, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { config } from "./config";
import { SEEDS } from "./consts";
import { Deal, DealStatus } from "./types/program.types";
import { PdaSeeds } from "./types/solana.types";
import { multiAsync } from "./utils/async.utils";
import { mapDealToStatus } from "./utils/deal.utils";
import { encodeSeedString } from "./utils/format.utils";
import { dataToGatewayToken, GatewayTokenData } from "@identity.com/solana-gateway-ts";
import * as anchor from "@project-serum/anchor";

const constructProgram = (provider: Provider) => {
	return new Program(config.idl, config.clusterConfig.programId, provider);
};

const getDealAccounts = multiAsync(async (provider) => {
	const program = constructProgram(provider);
	return program.account.deal.all();
});

const findPDA = multiAsync(async (seeds: PdaSeeds) => {
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress(seeds, programId);
});

const findGlobalMarketStatePDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.GLOBAL_MARKET_STATE_PDA);
	return findPDA([seed]);
});

const findSigningAuthorityPDA = multiAsync(async () => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();
	const seeds: PdaSeeds = [globalMarketStatePDA[0].toBuffer()];
	return findPDA(seeds);
});


const getGlobalMarketStateAccountData = multiAsync(
	async (provider) => {
		const program = constructProgram(provider);
		const globalMarketStatePDA = await findGlobalMarketStatePDA();
		return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
	}
);

export const getDealAccountData = multiAsync((provider, dealPk) => {
	const program = constructProgram(provider);
	return program.account.deal.fetch(dealPk);;
});


const getUSDCMintPK = multiAsync(async (provider) => {
	const marketUSDCTokenAccount = await getMarketUSDCTokenAccountPK(provider);
	const marketUSDCTokenAccountInfo = await provider.connection.getParsedAccountInfo(marketUSDCTokenAccount);

	if (!marketUSDCTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	return new PublicKey(
		(marketUSDCTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint
	);
});

export const findPendingDeals = multiAsync(async (provider) => {
	const _deals = await getDealAccounts(provider);
	const _clusterTime = getClusterTime(provider.connection);
	const pendingDeals: ProgramAccount<Deal>[] = [];
	const [deals, clusterTime] = await Promise.all([_deals, _clusterTime]);
	if (!clusterTime) {
		throw Error("Could not fetch cluster time");
	}

	(deals as Array<ProgramAccount<Deal>>).forEach((deal) => {
		const status = mapDealToStatus(deal.account, clusterTime);
		if (status === DealStatus.PENDING) {
			pendingDeals.push(deal);
		}
	});

	return pendingDeals;
});

export const getClusterTime = multiAsync(async (connection: Connection) => {
	const slot = await connection.getSlot();
	return connection.getBlockTime(slot);
});


const getMarketUSDCTokenAccountPK = multiAsync(async (provider) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(provider);
	return globalMarketStateData.liquidityPoolTokenAccount;
});

const getAssociatedUSDCTokenAddressPK = multiAsync(
	async (provider, publicKey: PublicKey) => {
		const _usdcMintPK = await getUSDCMintPK(provider);
		return await Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			_usdcMintPK,
			publicKey
		);
	}
);

export const getGatekeeperNetwork = multiAsync(async (provider) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(provider);
	console.log(globalMarketStateData); 
	return globalMarketStateData.gatekeeperNetwork;
});

const getGatewayToken = multiAsync(
	async (provider, userPK: PublicKey) => {
		// used from node_modules/@identity.com/solana-gateway-ts/src/lib `findGatewayTokens`
		// should be able to plug in our own program id in order to make it work locally
		const GATEWAY_TOKEN_ACCOUNT_OWNER_FIELD_OFFSET = 2;
		const GATEWAY_TOKEN_ACCOUNT_GATEKEEPER_NETWORK_FIELD_OFFSET = 35;
		const gatekeeperNetwork = await getGatekeeperNetwork(provider);
		const ownerFilter = {
			memcmp: {
				offset: GATEWAY_TOKEN_ACCOUNT_OWNER_FIELD_OFFSET,
				bytes: userPK.toBase58(),
			},
		};
		const gatekeeperNetworkFilter = {
			memcmp: {
				offset: GATEWAY_TOKEN_ACCOUNT_GATEKEEPER_NETWORK_FIELD_OFFSET,
				bytes: gatekeeperNetwork.toBase58(),
			},
		};
		const filters = [ownerFilter, gatekeeperNetworkFilter];
		const accountsResponse = await provider.connection.getProgramAccounts(config.clusterConfig.gatewayProgramId, {
			filters,
		});

		if (accountsResponse.length === 0) {
			throw Error("No valid Civic gateway tokens found");
		}

		return dataToGatewayToken(
			GatewayTokenData.fromAccount(accountsResponse[0].account.data as Buffer),
			accountsResponse[0].pubkey
		);
	}
);

export const findCredixPassPDA = multiAsync(async (publicKey: PublicKey) => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();
	const credixPassSeeds = encodeSeedString(SEEDS.CREDIX_PASS);
	const seeds: PdaSeeds = [
		globalMarketStatePDA[0].toBuffer(),
		publicKey.toBuffer(),
		credixPassSeeds,
	];

	return findPDA(seeds);
});


export const activateDeal = multiAsync(
	async (dealPk: PublicKey, borrowerPk: PublicKey, multisigPk: PublicKey, provider) => {
		const program = constructProgram(provider);
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(
			provider,
			borrowerPk
		);
		const _usdcMintPK = getUSDCMintPK(provider);
		const _liquidityPoolAssociatedUSDCTokenAddressPK = getMarketUSDCTokenAccountPK(
			provider
		);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _dealPDA = dealPk; 
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getGatewayToken = getGatewayToken(provider, borrowerPk);
		const _getCredixPassPDA = findCredixPassPDA(borrowerPk);

		const [
			userAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			liquidityPoolAssociatedUSDCTokenAddressPK,
			globalMarketStatePDA,
			dealPDA,
			signingAuthorityPDA,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_userAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_liquidityPoolAssociatedUSDCTokenAddressPK,
			_globalMarketStatePDA,
			_dealPDA,
			_signingAuthorityPDA,
			_getGatewayToken,
			_getCredixPassPDA,
		]);

		return program.instruction.activateDeal({
			accounts: {
				owner: multisigPk,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				deal: _dealPDA,
				liquidityPoolTokenAccount: liquidityPoolAssociatedUSDCTokenAddressPK,
				borrower: borrowerPk,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
				credixPass: credixPass[0],
				usdcMintAccount: usdcMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
		});
	}
); 


export const initializeMarket = multiAsync(
	async (
		_withdrawalFee: number, 
		_interestFee: number, 
		_globalMarketSeed: string, 
		_usdcMintPk: string, 
		_treasuryPk: string, 
		_gatekeeperNetworkPk: string,
		provider
		) => {
			const program = constructProgram(provider);
			const withdrawalFee = _withdrawalFee * 1000; 
			const interestFee = _interestFee * 1000; 
			const usdcMintPk = new PublicKey(_usdcMintPk); 
			const treasuryPk = new PublicKey(_treasuryPk); 
			const gatekeeperNetworkPk = new PublicKey(_gatekeeperNetworkPk); 
			
			const [globalMarketStatePda, globalMarketStateBump] =
				await PublicKey.findProgramAddress(
					[Buffer.from(anchor.utils.bytes.utf8.encode(_globalMarketSeed))],
					program.programId
				);

			const [signingAuthorityPda, signingAuthorityPdaBump] =
				await PublicKey.findProgramAddress(
					[globalMarketStatePda.toBuffer()],
					program.programId
				);

			const treasuryAssociatedUSDCTokenAddress =
				await Token.getAssociatedTokenAddress(
					ASSOCIATED_TOKEN_PROGRAM_ID,
					TOKEN_PROGRAM_ID,
					usdcMintPk,
					treasuryPk
				);

			const liquidityPoolUSDCTokenAccount =
				await Token.getAssociatedTokenAddress(
					ASSOCIATED_TOKEN_PROGRAM_ID,
					TOKEN_PROGRAM_ID,
					usdcMintPk,
					signingAuthorityPda
				);

			const lpTokenMintKeypair = Keypair.generate();

			return program.instruction.initializeMarket(
				signingAuthorityPdaBump,
				globalMarketStateBump,
				_globalMarketSeed,
				interestFee, // 10%
				withdrawalFee, // 0.5%
				{
				accounts: {
					owner: provider.wallet.publicKey,
					gatekeeperNetwork:new PublicKey(gatekeeperNetworkPk),
					globalMarketState: globalMarketStatePda,
					liquidityPoolTokenAccount: liquidityPoolUSDCTokenAccount,
					treasury: new PublicKey(treasuryPk),
					treasuryPoolTokenAccount: treasuryAssociatedUSDCTokenAddress,
					lpTokenMintAccount: lpTokenMintKeypair.publicKey,
					usdcMintAccount: new PublicKey(usdcMintPk),
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
					tokenProgram: TOKEN_PROGRAM_ID,
					signingAuthority: signingAuthorityPda,
					systemProgram: anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				},
				signers: [lpTokenMintKeypair],
				}
			);
	}
);

export const fetchGlobalMarketStateFrozen = multiAsync(async (globalMarketSeed: string, provider) => {
	const program = constructProgram(provider);
	const [globalMarketStatePda, globalMarketStateBump] =
		await PublicKey.findProgramAddress(
			[Buffer.from(anchor.utils.bytes.utf8.encode(globalMarketSeed))],
			program.programId
		);
	return program.account.globalMarketState.fetch(globalMarketStatePda);
})

// Freezing/thawing global market state
export const freezeGlobalMarketState = multiAsync(
	async (
		multisigPk: PublicKey, 
		globalMarketSeed: string,
		provider
		) => {
			const program = constructProgram(provider);
			const [globalMarketStatePda, globalMarketStateBump] =
				await PublicKey.findProgramAddress(
					[Buffer.from(anchor.utils.bytes.utf8.encode(globalMarketSeed))],
					program.programId
				);

			return program.instruction.freezeGlobalMarketState({
				accounts: {
					owner: multisigPk,
					globalMarketState: globalMarketStatePda,
				},
				signers: [],
			});
		}
); 
  
export const thawGlobalMarketState = multiAsync(
	async (
		multisigPk: PublicKey, 
		globalMarketSeed: string,
		provider
		) => {
			const program = constructProgram(provider);
			const [globalMarketStatePda, globalMarketStateBump] =
				await PublicKey.findProgramAddress(
					[Buffer.from(anchor.utils.bytes.utf8.encode(globalMarketSeed))],
					program.programId
				);

			return program.instruction.thawGlobalMarketState({
				accounts: {
					owner: multisigPk,
					globalMarketState: globalMarketStatePda,
				},
				signers: [],
			});
		}
); 