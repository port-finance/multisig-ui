import { utils } from "@project-serum/anchor";
import { DECIMALS, PERCENTAGE_FACTOR } from "../consts";
import { round } from "./math.utils";

export const encodeSeedString = (seedString: string) =>
	Buffer.from(utils.bytes.utf8.encode(seedString));

export const toAppAmount = (n: number) => n / Math.pow(10, DECIMALS);
export const toProgramAmount = (n: number) => n * Math.pow(10, DECIMALS);
export const toProgramPercentage = (n: number) => n * PERCENTAGE_FACTOR;
export const toAppPercentage = (n: number) => round(n / PERCENTAGE_FACTOR);

export const toUIAmount = (n: number) => round(Math.floor(toAppAmount(n) * 100) / 100);
export const toUIPercentage = (n: number) => round(toAppPercentage(n));
