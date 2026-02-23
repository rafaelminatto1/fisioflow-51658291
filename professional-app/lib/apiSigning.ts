/**
 * API Request Signing Utility
 *
 * Implementação de assinatura de requisições usando HMAC para segurança
 * contra adulteração de dados. Previene:
 * - Tampering de dados
 * - Replay attacks
 * - Spoofing de requisições
 */

import * as Crypto from 'expo-crypto';
import { getRandomBytesAsync } from 'expo-crypto';

// Interface para configuração de assinatura
export interface SigningConfig {
  secretKey: string;  // Chave secreta compartilhada (do servidor)
  algorithm?: 'SHA256' | 'SHA384' | 'SHA512';
  includeTimestamp?: boolean;
  includeNonce?: boolean;
  ttl?: number;  // Time to live em ms para prevenir replay (padrão: 5 minutos)
}

// Interface para requisição assinada
export interface SignedRequest {
  url: string;
  method: string;
  body?: any;
  headers: Record<string, string>;
  timestamp: string;
  nonce: string;
  signature: string;
}

// Interface para resposta assinada do servidor
export interface SignedResponse<T = any> {
  data: T;
  signature: string;
  timestamp: string;
  nonce: string;
}

/**
 * Configuração padrão
 */
const DEFAULT_CONFIG: Partial<SigningConfig> = {
  algorithm: 'SHA256',
  includeTimestamp: true,
  includeNonce: true,
  ttl: 5 * 60 * 1000, // 5 minutos
};

/**
 * Gera um nonce aleatório para prevenir replay attacks
 */
export async function generateNonce(length: number = 32): Promise<string> {
  const bytes = await getRandomBytesAsync(length);
  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Cria um HMAC para assinar dados
 */
async function createHMAC(
  data: string,
  secret: string,
  algorithm: 'SHA256' | 'SHA384' | 'SHA512' = 'SHA256'
): Promise<string> {
  // Concatena a chave secreta com os dados
  const keyData = secret + data;

  // Gera o hash
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigest[algorithm],
    keyData
  );

  return hash;
}

/**
 * Normaliza o corpo da requisição para assinatura
 */
function normalizeBody(body: any): string {
  if (!body) return '';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

/**
 * Cria a string para assinatura
 */
function createSigningString(
  method: string,
  url: string,
  body: string,
  timestamp: string,
  nonce: string
): string {
  // Formato: METHOD\nURL\nBODY\nTIMESTAMP\nNONCE
  return [method, url, body, timestamp, nonce].join('\n');
}

/**
 * Verifica se um timestamp está válido (dentro do TTL)
 */
export function isTimestampValid(
  timestamp: string,
  ttl: number = DEFAULT_CONFIG.ttl!
): boolean {
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  const diff = now - requestTime;

  return Math.abs(diff) <= ttl;
}

/**
 * Verifica se um nonce já foi usado (prevenir replay)
 * Em produção, isso deve ser verificado no servidor
 */
const usedNonces = new Set<string>();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutos

/**
 * Adiciona um nonce ao registro de nãoces usados
 */
export function recordNonce(nonce: string): void {
  usedNonces.add(nonce);

  // Remove nonces antigos
  setTimeout(() => {
    usedNonces.delete(nonce);
  }, NONCE_EXPIRY);
}

/**
 * Verifica se um nonce já foi usado
 */
export function isNonceUsed(nonce: string): boolean {
  return usedNonces.has(nonce);
}

/**
 * Limpa o registro de nonces (útil para testes)
 */
export function clearNonceRecord(): void {
  usedNonces.clear();
}

/**
 * Assina uma requisição
 */
export async function signRequest(
  url: string,
  method: string,
  body?: any,
  config: SigningConfig
): Promise<SignedRequest> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Gera timestamp e nonce
  const timestamp = Date.now().toString();
  const nonce = await generateNonce();

  // Normaliza o corpo
  const normalizedBody = normalizeBody(body);

  // Cria a string para assinatura
  const signingString = createSigningString(
    method,
    url,
    normalizedBody,
    timestamp,
    nonce
  );

  // Gera a assinatura
  const signature = await createHMAC(
    signingString,
    fullConfig.secretKey,
    fullConfig.algorithm!
  );

  return {
    url,
    method,
    body,
    headers: {
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Algorithm': fullConfig.algorithm!,
    },
    timestamp,
    nonce,
    signature,
  };
}

/**
 * Verifica uma assinatura de requisição
 */
export async function verifyRequest(
  signedRequest: SignedRequest,
  secretKey: string,
  ttl: number = DEFAULT_CONFIG.ttl!
): Promise<boolean> {
  const { url, method, body, headers, timestamp, nonce, signature } = signedRequest;

  // Verifica o timestamp (prevenir replay)
  if (!isTimestampValid(timestamp, ttl)) {
    console.warn('[API Signing] Timestamp expirado ou inválido');
    return false;
  }

  // Verifica o nonce (prevenir replay)
  if (isNonceUsed(nonce)) {
    console.warn('[API Signing] Nonce reutilizado (possible replay attack)');
    return false;
  }

  // Recria a string de assinatura
  const normalizedBody = normalizeBody(body);
  const signingString = createSigningString(
    method,
    url,
    normalizedBody,
    timestamp,
    nonce
  );

  // Gera a assinatura esperada
  const expectedSignature = await createHMAC(
    signingString,
    secretKey,
    (headers['X-Algorithm'] as any) || 'SHA256'
  );

  // Verifica se as assinaturas batem
  const isValid = signature === expectedSignature;

  if (isValid) {
    recordNonce(nonce);
  } else {
    console.warn('[API Signing] Assinatura inválida');
  }

  return isValid;
}

/**
 * Verifica uma resposta assinada do servidor
 */
export async function verifyResponse<T>(
  response: SignedResponse<T>,
  secretKey: string,
  ttl: number = DEFAULT_CONFIG.ttl!
): Promise<boolean> {
  const { data, signature, timestamp, nonce } = response;

  // Verifica o timestamp
  if (!isTimestampValid(timestamp, ttl)) {
    console.warn('[API Signing] Timestamp da resposta expirado');
    return false;
  }

  // Cria a string de verificação
  const normalizedData = typeof data === 'string' ? data : JSON.stringify(data);
  const verificationString = [normalizedData, timestamp, nonce].join('\n');

  // Gera a assinatura esperada
  const expectedSignature = await createHMAC(
    verificationString,
    secretKey,
    'SHA256'
  );

  return signature === expectedSignature;
}

/**
 * Decorator para adicionar assinatura a requisições fetch
 */
export function createSignedFetch(secretKey: string) {
  return async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    const method = options?.method || 'GET';
    const body = options?.body;

    // Assina a requisição
    const signed = await signRequest(url, method, body, {
      secretKey,
    });

    // Combina os headers
    const headers = {
      ...options?.headers,
      ...signed.headers,
    };

    // Faz a requisição com os headers de assinatura
    return fetch(url, {
      ...options,
      headers,
    });
  };
}

/**
 * Classe para gerenciar sessões de assinatura
 */
export class SigningSession {
  private secretKey: string;
  private sessionId: string;
  private createdAt: number;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.createdAt = Date.now();
  }

  /**
   * Assina uma requisição dentro da sessão
   */
  async sign(
    url: string,
    method: string,
    body?: any
  ): Promise<SignedRequest> {
    const timestamp = Date.now().toString();
    const nonce = await generateNonce();

    // Inclui o session ID na assinatura
    const normalizedBody = normalizeBody(body);
    const signingString = createSigningString(
      method,
      url,
      normalizedBody,
      timestamp,
      nonce
    );

    const signature = await createHMAC(
      signingString + this.sessionId,
      this.secretKey
    );

    return {
      url,
      method,
      body,
      headers: {
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Algorithm': 'SHA256',
        'X-Session-Id': this.sessionId,
      },
      timestamp,
      nonce,
      signature,
    };
  }

  /**
   * Verifica se a sessão expirou
   */
  isExpired(ttl: number = 30 * 60 * 1000): boolean {
    return Date.now() - this.createdAt > ttl;
  }

  /**
   * Retorna o ID da sessão
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Armazena a sessão de assinatura
 */
let currentSession: SigningSession | null = null;

/**
 * Obtém ou cria uma nova sessão de assinatura
 */
export function getSigningSession(secretKey: string): SigningSession {
  if (!currentSession || currentSession.isExpired()) {
    currentSession = new SigningSession(secretKey);
  }
  return currentSession;
}

/**
 * Limpa a sessão atual (chamar no logout)
 */
export function clearSigningSession(): void {
  currentSession = null;
  clearNonceRecord();
}
