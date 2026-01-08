import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to ensure the current user is an admin.
 * Throws an error if not authorized.
 */
export async function requireAdmin() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("Unauthorized: No active session");
    }

    const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

    if (error) {
        console.error("Error checking permissions:", error);
        throw new Error("Forbidden: Error checking permissions");
    }

    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isAdmin) {
        throw new Error("Forbidden: Admin privileges required");
    }

    return {
        userId: session.user.id,
        role: 'admin',
        email: session.user.email
    };
}
