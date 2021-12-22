import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export interface PoolStats {
	TVL: number;
	APY: number;
	outstandingCredit: number;
	solendBuffer: number;
}

export enum DealStatus {
	CLOSED,
	IN_PROGRESS,
	PENDING,
}

export type Deal = {
	borrower: PublicKey;
	principal: BN;
	financingFeePercentage: number;
	principalAmountRepaid: BN;
	interestAmountRepaid: BN;
	timeToMaturityDays: number;
	goLiveAt: BN;
	createdAt: BN;
	leverageRatio: number;
	underwriterPerformanceFeePercentage: number;
};

export type PrincipalRepaymentType = { principal: {} };
export type InterestRepaymentType = { interest: {} };

export type RepaymentType = PrincipalRepaymentType | InterestRepaymentType;
