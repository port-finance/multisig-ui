import { stringify } from "flatted";

let runners = 0;
const callbacks: Array<Function> = [];

export const serialAsync = <F extends (...args: any[]) => any>(
	f: F
): ((...funcArgs: Parameters<F>) => ReturnType<F>) => {
	return (...args: Parameters<F>) => {
		runners++;

		return f(...args).finally(() => {
			runners--;

			if (runners === 0) {
				callbacks.forEach((c) => c());
			}
		});
	};
};

export const multiAsync = <F extends (...args: any[]) => any>(
	func: F
): ((...funcArgs: Parameters<F>) => ReturnType<F>) => {
	let promises: Record<string, Promise<any> | undefined> = {};
	let serialPromises: Record<string, Promise<any> | undefined> = {};

	callbacks.push(() => (serialPromises = {}));

	return (...args: Parameters<F>): ReturnType<any> => {
		const key = stringify(args);
		const runningPromise = promises[key] || serialPromises[key];

		if (!runningPromise) {
			const p = func(...args);

			promises[key] = p.finally(() => {
				promises[key] = undefined;
			});

			if (runners) {
				serialPromises[key] = p;
			}
		}

		return promises[key] || serialPromises[key];
	};
};
