import { PERCENTAGE_FACTOR } from "../consts";
import { toAppAmount } from "./format.utils";

export const round = (n: number) => {
	const m = Number((Math.abs(n) * 100).toPrecision(15));
	return (Math.round(m) / 100) * Math.sign(n);
};

// TODO: can we make sure we never overflow, can we decide whether it's reasonable to try to prevent this
export const percentage = (n: number, percentage: number) => {
	return Math.floor((n * percentage) / (100 * PERCENTAGE_FACTOR));
};

export const divide = (n: number, by: number) => {
	return Math.floor(toAppAmount(n) / toAppAmount(by));
};
