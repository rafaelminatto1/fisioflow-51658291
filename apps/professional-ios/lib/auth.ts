import { authClient } from './neonAuth';

export async function signOut(_auth?: unknown) {
  await authClient.signOut();
}
