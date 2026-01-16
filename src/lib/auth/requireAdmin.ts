import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to ensure the current user is authenticated.
 * Since ALL authenticated users are admins now, this just checks authentication.
 * Throws an error if not authorized.
 */
export async function requireAdmin() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("Unauthorized: No active session");
    }

    // Todos os usuários autenticados são admins
    return {
        userId: session.user.id,
        role: 'admin',
        email: session.user.email
    };
}
