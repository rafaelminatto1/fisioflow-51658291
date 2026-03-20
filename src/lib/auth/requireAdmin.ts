/**
 * Helper to ensure the current user is authenticated.
 * Since ALL authenticated users are admins now, this just checks authentication.
 * Throws an error if not authorized.
 */

import { authClient } from "@/lib/auth/neon-token";

export async function requireAdmin() {
	const { data } = await authClient.getSession();
	const user = data?.user;

	if (!user) {
		throw new Error("Unauthorized: No active session");
	}

	// Todos os usuários autenticados são admins
	return {
		userId: user.id,
		role: "admin",
		email: user.email,
	};
}
