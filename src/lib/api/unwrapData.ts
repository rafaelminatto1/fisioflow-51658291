/**
 * Worker API responses can come either as bare values or wrapped in `{ data: T }`.
 * `unwrapData` normalizes both shapes to a flat `T`.
 *
 * @example
 *   const res = await request<User | { data: User }>("/users/me");
 *   const user = unwrapData(res); // User
 */
export function unwrapData<T>(res: T | { data: T }): T {
	if (res && typeof res === "object" && "data" in res) {
		return (res as { data: T }).data;
	}
	return res as T;
}

/** Like `unwrapData`, but defaults to an empty array when the response is missing. */
export function unwrapList<T>(res: T[] | { data: T[] } | undefined | null): T[] {
	if (!res) return [];
	if (Array.isArray(res)) return res;
	if ("data" in res && Array.isArray(res.data)) return res.data;
	return [];
}
