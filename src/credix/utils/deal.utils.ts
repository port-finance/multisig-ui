import {
	Deal,
	DealStatus,
	InterestRepaymentType,
	PrincipalRepaymentType,
} from "../types/program.types";
import { percentage } from "./math.utils";

const SECONDS_IN_DAY = 86400;

export const mapDealToStatus = (deal: Deal, clusterTime: number): DealStatus => {
	const principalToPay = getPrincipalToRepay(deal);
	const interestToPay = getInterestToRepay(deal);

	if (!principalToPay && !interestToPay) {
		return DealStatus.CLOSED;
	}

	// We store max u64 as a hack to know it's not live yet. BN can't handle this.
	if (deal.goLiveAt.bitLength() < 53 && deal.goLiveAt.toNumber() <= clusterTime) {
		return DealStatus.IN_PROGRESS;
	}

	return DealStatus.PENDING;
};

export const getDaysRemaining = (deal: Deal, clusterTime: number) => {
	return ((deal.goLiveAt.toNumber() + deal.timeToMaturityDays * SECONDS_IN_DAY - clusterTime) / SECONDS_IN_DAY);
};

export const getTotalInterest = (deal: Deal) => {
	return percentage(deal.principal.toNumber(), deal.financingFeePercentage);
};

export const getPrincipalToRepay = (deal: Deal) => {
	return deal.principal.toNumber() - deal.principalAmountRepaid.toNumber();
};

export const getInterestToRepay = (deal: Deal) => {
	const totalInterest = getTotalInterest(deal);
	return totalInterest - deal.interestAmountRepaid.toNumber();
};

export const createPrincipalRepaymentType = (): PrincipalRepaymentType => ({ principal: {} });
export const createInterestRepaymentType = (): InterestRepaymentType => ({ interest: {} });
