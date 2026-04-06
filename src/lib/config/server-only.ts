const warnedKeys = new Set<string>();

export const isBrowserRuntime = typeof window !== "undefined";

function warnOnce(key: string, message: string): void {
	if (warnedKeys.has(key)) return;
	warnedKeys.add(key);
	console.warn(message);
}

export function getServerOnlyEnv(key: string): string | undefined {
	if (isBrowserRuntime) {
		warnOnce(
			key,
			`[security] Ignoring server-only secret "${key}" in browser runtime.`,
		);
		return undefined;
	}

	if (typeof process === "undefined") {
		return undefined;
	}

	return process.env?.[key];
}

export function createServerOnlyFeatureError(feature: string): Error {
	return new Error(
		`${feature} requires server-side credentials and must run via the canonical API.`,
	);
}
