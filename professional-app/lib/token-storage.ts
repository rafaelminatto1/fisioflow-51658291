import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'FISIOFLOW_AUTH_TOKEN';

export async function getToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      console.log(`[TokenStorage] Token retrieved: ${token.substring(0, 15)}... (length: ${token.length})`);
    }
    return token;
  } catch (error) {
    console.error('Error reading token:', error);
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  console.log(`[TokenStorage] Setting token: ${token.substring(0, 15)}... (length: ${token.length})`);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  console.log(`[TokenStorage] Token verified after save: ${savedToken === token ? 'MATCH' : 'MISMATCH'}`);
}

export async function clearToken(): Promise<void> {
  console.log('[TokenStorage] Clearing token');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
