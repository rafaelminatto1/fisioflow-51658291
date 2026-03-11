type StorageRef = {
  fullPath: string;
};

export function getStorage() {
  return { provider: 'cloudflare-r2-compat' } as const;
}

export function ref(_storage: unknown, path: string): StorageRef {
  return { fullPath: path };
}

export async function uploadBytes(_ref: StorageRef, _data: Blob) {
  throw new Error('Upload direto no app profissional ainda não foi migrado para um endpoint Cloudflare/R2.');
}

export async function getDownloadURL(storageRef: StorageRef) {
  if (/^https?:\/\//.test(storageRef.fullPath)) {
    return storageRef.fullPath;
  }

  return storageRef.fullPath;
}
