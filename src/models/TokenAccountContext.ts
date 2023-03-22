import { PublicKey } from "@solana/web3.js";

export class TokenAccountContext {
	private static readonly SPL_ACCOUNT_CONTEXT_EMPTY = TokenAccountContext.index(
		[]
	);

	private readonly accounts: any[];
	private readonly bySplAccountId: Map<string, any>;

	private constructor(accounts: any[], bySplAccountId: Map<string, any>) {
		this.accounts = accounts;
		this.bySplAccountId = bySplAccountId;
	}

	public static empty() {
		return TokenAccountContext.SPL_ACCOUNT_CONTEXT_EMPTY;
	}

	public static index(accounts: any[]): TokenAccountContext {
		const bySplAccountId = new Map<string, any>();
		accounts.forEach((a) => bySplAccountId.set(a.address.toString(), a));
		return new TokenAccountContext(accounts, bySplAccountId);
	}

	public isReady() {
		return this.accounts.length > 0;
	}

	public getAllTokenAccounts(): any[] {
		return this.accounts;
	}

	public getSplAccount(splAccountId: PublicKey): any {
		const result = this.findSplAccount(splAccountId);
		if (!result) {
			throw new Error(`No account for ${splAccountId}`);
		}

		return result;
	}

	public findSplAccount(splAccountId: PublicKey): any | undefined {
		const key = splAccountId.toString();
		return this.bySplAccountId.get(key);
	}

	public getSplAccountByMintId(mintId: PublicKey): any {
		const result = this.findSplAccountByMintId(mintId);
		if (!result) {
			throw new Error(`No account for mint ${mintId}`);
		}

		return result;
	}

	public findSplAccountByMintId(mintId: PublicKey): any | undefined {
		const accounts = this.accounts
			.filter((account) => account.mint.equals(mintId))
			.sort((a, b) => -a.amount.cmp(b.amount));
		return accounts[0];
	}
}
