/**
 * Compat layer legado.
 *
 * Firebase runtime foi removido do frontend principal. Este arquivo existe
 * apenas para evitar que imports antigos quebrem imediatamente.
 */

export const app = null;
export const auth = null;
export const db = null;
export const storage = null;
export const functions = null;

export const getFirebaseApp = () => null;
export const getFirebaseAuth = () => null;
export const getFirebaseDb = async () => null;
export const getFirebaseStorage = () => null;
export const getFirebaseFunctions = () => null;
export const useFirebase = () => null;
export const useAuth = () => null;
export const useFirestore = () => null;
export const useStorage = () => null;
export const isFirebaseConfigured = () => false;

export default app;
