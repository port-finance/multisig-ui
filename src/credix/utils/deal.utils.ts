import Big from "big.js";
import {
	Deal,
	DealStatus,
	InterestRepaymentType,
	PrincipalRepaymentType,
	Ratio,
} from "../types/program.types";
import { applyRatio, ZERO } from "./math.utils";

const SECONDS_IN_DAY = 86400;

export const mapDealToStatus = (deal: Deal, clusterTime: number): DealStatus => {
	const principalToPay = getPrincipalToRepay(deal);
	const interestToPay = getInterestToRepay(deal);

	if (principalToPay.eq(ZERO) && interestToPay.eq(ZERO)) {
		return DealStatus.CLOSED;
	}

	// We store max i64 as a hack to know it's not live yet. BN can't handle this.
	if (deal.goLiveAt.bitLength() < 53 && deal.goLiveAt.toNumber() <= clusterTime) {
		return DealStatus.IN_PROGRESS;
	}

	return DealStatus.PENDING;
};

export const getDaysRemaining = (deal: Deal, clusterTime: number, dealStatus: DealStatus) => {
	if (deal.goLiveAt.bitLength() > 53) {
		return deal.timeToMaturityDays;
	}

	if (dealStatus === DealStatus.CLOSED) {
		return 0;
	}

	const daysRemaining =
		(deal.goLiveAt.toNumber() + deal.timeToMaturityDays * SECONDS_IN_DAY - clusterTime) /
		SECONDS_IN_DAY;

	return Math.max(Math.round(daysRemaining * 10) / 10, 0);
};

export const getTotalInterest = (deal: Deal) => {
	const principal = new Big(deal.principal.toNumber());
	const financingFeePercentage = deal.financingFeePercentage;
	const timeToMaturityRatio: Ratio = { numerator: deal.timeToMaturityDays, denominator: 360 };

	return applyRatio(timeToMaturityRatio, applyRatio(financingFeePercentage, principal)).round(
		0,
		Big.roundDown
	);
};

export const getPrincipalToRepay = (deal: Deal) => {
	const principal = new Big(deal.principal.toNumber());
	const principalAmountRepaid = new Big(deal.principalAmountRepaid.toNumber());

	return principal.minus(principalAmountRepaid);
};

export const getInterestToRepay = (deal: Deal) => {
	const interestAmountRepaid = new Big(deal.interestAmountRepaid.toNumber());
	const totalInterest = getTotalInterest(deal);

	return totalInterest.minus(interestAmountRepaid);
};

export const createPrincipalRepaymentType = (): PrincipalRepaymentType => ({ principal: {} });
export const createInterestRepaymentType = (): InterestRepaymentType => ({ interest: {} });
