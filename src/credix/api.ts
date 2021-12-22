import { BN, Program, ProgramAccount, Provider, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "./config";
import { SEEDS } from "./consts";
import { Deal, DealStatus } from "./types/program.types";
import { PdaSeeds } from "./types/solana.types";
import { multiAsync } from "./utils/async.utils";
import { mapDealToStatus } from "./utils/deal.utils";
import { encodeSeedString } from "./utils/format.utils";

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

const findDealPDA = multiAsync(async (publicKey: PublicKey) => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();

	const globalMarketStateSeed = globalMarketStatePDA[0].toBuffer();
	const borrowerSeed = publicKey.toBuffer();
	const dealInfo = encodeSeedString(SEEDS.DEAL_INFO);

	const seeds: PdaSeeds = [globalMarketStateSeed, borrowerSeed, dealInfo];
	return findPDA(seeds);
});

const getGlobalMarketStateAccountData = multiAsync(
	async (provider) => {
		const program = constructProgram(provider);
		const globalMarketStatePDA = await findGlobalMarketStatePDA();
		return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
	}
);

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
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const dealPDA = dealPk; 

		const [
			userAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			liquidityPoolAssociatedUSDCTokenAddressPK,
			globalMarketStatePDA,
			signingAuthorityPDA,
		] = await Promise.all([
			_userAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_liquidityPoolAssociatedUSDCTokenAddressPK,
			_globalMarketStatePDA,
			_signingAuthorityPDA,
		]);

		return program.instruction.activateDeal({
			accounts: {
				owner: multisigPk,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				deal: dealPDA,
				liquidityPoolTokenAccount: liquidityPoolAssociatedUSDCTokenAddressPK,
				borrowerAccount: borrowerPk,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
				usdcMintAccount: usdcMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
		});
	}
);

