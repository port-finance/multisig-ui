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
import { SentimentSatisfiedAltSharp } from "@material-ui/icons";

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

const findGlobalMarketStatePDA = multiAsync(async (globalMarketSeed = SEEDS.GLOBAL_MARKET_STATE_PDA) => {
	const seed = encodeSeedString(globalMarketSeed);
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


const getBaseMintPK = multiAsync(async (provider) => {
	const globalMarketState = await getGlobalMarketStateAccountData(provider);
	return globalMarketState.liquidityPoolTokenMintAccount;
});

export const findDealPDA = multiAsync(async (publicKey: PublicKey, dealNumber: number, globalMarketSeed) => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA(globalMarketSeed);
	const globalMarketStateSeed = globalMarketStatePDA[0].toBuffer();
	const borrowerSeed = publicKey.toBuffer();
	const dealInfo = encodeSeedString(SEEDS.DEAL_INFO);
	const dealNumberBN = new BN(dealNumber);

	const seeds: PdaSeeds = [
		globalMarketStateSeed,
		borrowerSeed,
		dealNumberBN.toArrayLike(Buffer, "le", 2),
		dealInfo,
	];
	return findPDA(seeds);
});

const mapDealsToMarket = multiAsync(async (deals, globalMarketSeed = SEEDS.GLOBAL_MARKET_STATE_PDA, setDeals) => {
	const marketDeals: ProgramAccount<Deal>[] = [];
	(deals as Array<ProgramAccount<Deal>>).forEach(async (deal) => {
		const expectedDealPda = await findDealPDA(deal.account.borrower, deal.account.dealNumber, globalMarketSeed);
		console.log(deal.publicKey.toString());
		console.log(expectedDealPda[0].toString()); 
		if (deal.publicKey.toString() === expectedDealPda[0].toString()) {
			marketDeals.push(deal);
		}
		setDeals(marketDeals); 
	});
});

export const findPendingDealsForMarket = multiAsync(async (provider, globalMarketSeed, setDeals) => {
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

	await mapDealsToMarket(pendingDeals, globalMarketSeed, setDeals); 
});

export const getClusterTime = multiAsync(async (connection: Connection) => {
	const slot = await connection.getSlot();
	return connection.getBlockTime(slot);
});


const getMarketBaseTokenAccountPK = multiAsync(async (provider) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(provider);
	console.log("globalMarketStateData", globalMarketStateData);
	return globalMarketStateData.liquidityPoolTokenAccount;
});

const getAssociatedBaseTokenAddressPK = multiAsync(
	async (provider, publicKey: PublicKey, offCurve: boolean) => {
		const _baseMintPK = await getBaseMintPK(provider);
		return await Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			_baseMintPK,
			publicKey,
			offCurve
		);
	}
);

export const getGatekeeperNetwork = multiAsync(async (provider) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(provider);
	console.log(globalMarketStateData.gatekeeperNetwork.toString());
	return globalMarketStateData.gatekeeperNetwork;
});

const getGatewayToken = multiAsync(
	async (provider, userPK: PublicKey) => {
		console.log("pk user to check civic", userPK.toString());
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

const getLiquidityPoolAssociatedBaseTokenAddressPK = multiAsync(
	async (provider) => {
		const signingAuthorityPDA = await findSigningAuthorityPDA();
		return getAssociatedBaseTokenAddressPK(provider, signingAuthorityPDA[0], true);
	}
);


export const activateDeal = multiAsync(
	async (dealPk: PublicKey, borrowerPk: PublicKey, multisigPk: PublicKey, provider) => {
		const program = constructProgram(provider);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			provider,
			borrowerPk,
			false
		);
		const _baseMintPK = getBaseMintPK(provider);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			provider
		);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getGatewayToken = getGatewayToken(provider, borrowerPk);
		const _getCredixPassPDA = findCredixPassPDA(borrowerPk);

		const [
			userAssociatedBaseTokenAddressPK,
			baseMintPK,
			liquidityPoolAssociatedBaseTokenAddressPK,
			globalMarketStatePDA,
			signingAuthorityPDA,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_userAssociatedBaseTokenAddressPK,
			_baseMintPK,
			_liquidityPoolAssociatedBaseTokenAddressPK,
			_globalMarketStatePDA,
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
				deal: dealPk,
				liquidityPoolTokenAccount: liquidityPoolAssociatedBaseTokenAddressPK,
				borrower: borrowerPk,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedBaseTokenAddressPK,
				credixPass: credixPass[0],
				baseMintAccount: baseMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
		});
	}
); 


export const initializeMarket = multiAsync(
	async (
		multisigPk: PublicKey, 
		_withdrawalFee: number, 
		_interestFee: number, 
		_globalMarketSeed: string, 
		_baseMintPk: string, 
		_treasuryPk: string, 
		_gatekeeperNetworkPk: string,
		provider
		) => {
			const program = constructProgram(provider);
			const withdrawalFee = _withdrawalFee * 1000; 
			const interestFee = _interestFee * 1000; 
			const baseMintPk = new PublicKey(_baseMintPk); 
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

			const treasuryAssociatedBaseTokenAddress =
				await Token.getAssociatedTokenAddress(
					ASSOCIATED_TOKEN_PROGRAM_ID,
					TOKEN_PROGRAM_ID,
					baseMintPk,
					treasuryPk,
					true
				);

			const liquidityPoolBaseTokenAccount =
				await Token.getAssociatedTokenAddress(
					ASSOCIATED_TOKEN_PROGRAM_ID,
					TOKEN_PROGRAM_ID,
					baseMintPk,
					signingAuthorityPda,
					true
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
					owner: multisigPk,
					gatekeeperNetwork: new PublicKey(gatekeeperNetworkPk),
					globalMarketState: globalMarketStatePda,
					liquidityPoolTokenAccount: liquidityPoolBaseTokenAccount,
					treasury: new PublicKey(treasuryPk),
					treasuryPoolTokenAccount: treasuryAssociatedBaseTokenAddress,
					lpTokenMintAccount: lpTokenMintKeypair.publicKey,
					baseMintAccount: new PublicKey(baseMintPk),
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

export const findCredixPassPDA = multiAsync(async (publicKey: PublicKey, globalMarketSeed = SEEDS.GLOBAL_MARKET_STATE_PDA) => {
	console.log("seed", globalMarketSeed);
	const globalMarketStatePDA = await findGlobalMarketStatePDA(globalMarketSeed);
	const credixPassSeeds = encodeSeedString(SEEDS.CREDIX_PASS);
	const seeds: PdaSeeds = [
		globalMarketStatePDA[0].toBuffer(),
		publicKey.toBuffer(),
		credixPassSeeds,
	];

	return findPDA(seeds);
});


export const issueCredixPass = multiAsync(
	async (
    globalMarketSeed: string, 
	multisigPk: PublicKey, 
	publicKey: PublicKey,
	isUnderwriter: boolean,
	isBorrower: boolean,
	provider
) => {
	const program = constructProgram(provider);
	const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
	const _getCredixPassPDA = findCredixPassPDA(publicKey, globalMarketSeed);

	const [globalMarketStatePDA, credixPassPDA] = await Promise.all([
		_globalMarketStatePDA,
		_getCredixPassPDA,
	]);

	return program.instruction.createCredixPass(credixPassPDA[1], isUnderwriter, isBorrower, {
		accounts: {
			owner: multisigPk,
			passHolder: publicKey,
			credixPass: credixPassPDA[0],
			systemProgram: SystemProgram.programId,
			rent: web3.SYSVAR_RENT_PUBKEY,
			globalMarketState: globalMarketStatePDA[0],
		},
		signers: [],
	});
});

export const updateCredixPass = multiAsync(
	async (
	globalMarketSeed: string, 
	multisigPk: PublicKey, 
	publicKey: PublicKey,
	isActive: boolean,
	isUnderwriter: boolean,
	isBorrower: boolean,
	provider
) => {
	const program = constructProgram(provider);

	const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
	const _getCredixPassPDA = findCredixPassPDA(publicKey, globalMarketSeed);

	const [globalMarketStatePDA, credixPassPDA] = await Promise.all([
		_globalMarketStatePDA,
		_getCredixPassPDA,
	]);

	return program.instruction.updateCredixPass(isActive, isUnderwriter, isBorrower, {
		accounts: {
			owner: multisigPk,
			passHolder: publicKey,
			credixPass: credixPassPDA[0],
			globalMarketState: globalMarketStatePDA[0],
		},
		signers: [],
	});
});

export const getCredixPassInfo = multiAsync(
	async (
		globalMarketSeed: string, 
		publicKey: PublicKey, 
		provider) => {
		const program = constructProgram(provider);
		const [credixPassPDA] = await findCredixPassPDA(publicKey, globalMarketSeed);
		return program.account.credixPass.fetchNullable(credixPassPDA);
	}
);