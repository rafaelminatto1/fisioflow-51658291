import { authClient } from './neonAuth';
import { db } from './firestore';
import { getStorage } from './storage';

type CompatUser = {
  id: string;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
};

type RemoteValue = {
  asBoolean: () => boolean;
  asString: () => string;
};

let currentUser: CompatUser | null = null;

authClient.useSession.subscribe((session) => {
  const user = session?.data?.user;
  currentUser = user
    ? {
        id: user.id,
        uid: user.id,
        email: user.email,
        displayName: user.name || '',
        photoURL: user.image || '',
      }
    : null;
});

export const auth = {
  get currentUser() {
    return currentUser;
  },
};

export const storage = getStorage();
export const functions = { provider: 'cloudflare-workers-compat' } as const;

const REMOTE_DEFAULTS: Record<string, boolean | string> = {
  enable_multimodal_ai: false,
};

export function getRemoteValue(key: string): RemoteValue {
  const value = REMOTE_DEFAULTS[key];
  return {
    asBoolean: () => value === true,
    asString: () => String(value ?? ''),
  };
}

export { db };
