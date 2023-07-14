import Big from "big.js";
import { Ratio } from "../types/program.types";

export const applyRatio = (r: Ratio, to: Big) => {
	const numerator = new Big(r.numerator);
	const denominator = new Big(r.denominator);

	return to.mul(numerator).div(denominator);
};

export const ZERO = new Big(0);

export const min = (lhs: Big, rhs: Big) => (rhs.gt(lhs) ? lhs : rhs);

export const getFee = (amount: Big, feePercentage: Ratio) =>
	applyRatio(feePercentage, amount).round(0, Big.roundDown);

export const getWithdrawFee = (amount: Big, withdrawFeePercentage: Ratio) => {};
