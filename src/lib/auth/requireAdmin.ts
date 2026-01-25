import { getFirebaseAuth } from "@/integrations/firebase/app";

/**
 * Helper to ensure the current user is authenticated.
 * Since ALL authenticated users are admins now, this just checks authentication.
 * Throws an error if not authorized.
 */
export async function requireAdmin() {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Unauthorized: No active session");
    }

    // Todos os usuários autenticados são admins
    return {
        userId: user.uid,
        role: 'admin',
        email: user.email
    };
}
