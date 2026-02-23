/**
 * Signed Firebase Operations
 *
 * Camada de segurança adicional para operações críticas do Firebase
 * que requerem assinatura de requisições.
 */

import { doc, setDoc, updateDoc, deleteDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { signRequest, SigningConfig, SignedRequest } from './apiSigning';
import { captureException } from './sentry';

/**
 * Tipos de operações que podem ser assinadas
 */
export type SignedOperationType = 'create' | 'update' | 'delete';

/**
 * Configuração de segurança para operações assinadas
 */
export interface SecurityConfig extends SigningConfig {
  requireSignature: boolean;
  logOperations: boolean;
}

/**
 * Configuração padrão para operações críticas
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  secretKey: process.env.EXPO_PUBLIC_API_SIGNING_KEY || 'default-key-change-in-production',
  algorithm: 'SHA256',
  includeTimestamp: true,
  includeNonce: true,
  ttl: 5 * 60 * 1000,
  requireSignature: __DEV__ ? false : true, // Em dev, não requer assinatura por padrão
  logOperations: true,
};

/**
 * Informações de auditoria para operações assinadas
 */
export interface OperationAudit {
  operationType: SignedOperationType;
  collection: string;
  documentId?: string;
  userId: string;
  timestamp: number;
  signature?: string;
  nonce?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Classe para gerenciar operações assinadas no Firebase
 */
export class SignedFirebaseOperations {
  private config: SecurityConfig;
  private auditLog: OperationAudit[] = [];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Cria um documento com assinatura
   */
  async createSignedDocument<T>(
    collectionPath: string,
    data: T,
    userId: string,
    documentId?: string
  ): Promise<string> {
    const collectionRef = collection(db, collectionPath);
    const docRef = documentId
      ? doc(db, collectionPath, documentId)
      : doc(collectionRef);

    try {
      // Cria a assinatura
      const signature = await this.createSignature(
        'create',
        collectionPath,
        documentId || '',
        data,
        userId
      );

      // Adiciona metadados de segurança
      const signedData = {
        ...data,
        _security: {
          signature: signature.signature,
          timestamp: signature.timestamp,
          nonce: signature.nonce,
          algorithm: signature.headers['X-Algorithm'],
        },
      };

      // Salva o documento
      if (documentId) {
        await setDoc(docRef, signedData);
      } else {
        const newDoc = await addDoc(collectionRef, signedData);
        return newDoc.id;
      }

      // Registra a operação
      this.logOperation({
        operationType: 'create',
        collection: collectionPath,
        documentId: documentId || docRef.id,
        userId,
        timestamp: Date.now(),
        signature: signature.signature,
        nonce: signature.nonce,
      });

      return docRef.id;
    } catch (error) {
      console.error('[SignedFirebase] Erro ao criar documento:', error);
      captureException(error as Error, {
        collection: collectionPath,
        operation: 'create',
      });
      throw error;
    }
  }

  /**
   * Atualiza um documento com assinatura
   */
  async updateSignedDocument<T>(
    collectionPath: string,
    documentId: string,
    data: Partial<T>,
    userId: string
  ): Promise<void> {
    const docRef = doc(db, collectionPath, documentId);

    try {
      // Cria a assinatura
      const signature = await this.createSignature(
        'update',
        collectionPath,
        documentId,
        data,
        userId
      );

      // Adiciona metadados de segurança
      const signedData = {
        ...data,
        _security: {
          signature: signature.signature,
          timestamp: signature.timestamp,
          nonce: signature.nonce,
          algorithm: signature.headers['X-Algorithm'],
          updatedBy: userId,
        },
      };

      await updateDoc(docRef, signedData);

      // Registra a operação
      this.logOperation({
        operationType: 'update',
        collection: collectionPath,
        documentId,
        userId,
        timestamp: Date.now(),
        signature: signature.signature,
        nonce: signature.nonce,
      });
    } catch (error) {
      console.error('[SignedFirebase] Erro ao atualizar documento:', error);
      captureException(error as Error, {
        collection: collectionPath,
        documentId,
        operation: 'update',
      });
      throw error;
    }
  }

  /**
   * Deleta um documento com assinatura
   */
  async deleteSignedDocument(
    collectionPath: string,
    documentId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const docRef = doc(db, collectionPath, documentId);

    try {
      // Verifica se o documento existe
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Documento não encontrado');
      }

      // Cria a assinatura para a deleção
      const signature = await this.createSignature(
        'delete',
        collectionPath,
        documentId,
        { reason: reason || 'Standard deletion' },
        userId
      );

      // Salva um registro da deleção em uma coleção de audit
      const auditCollection = collection(db, 'audit', 'deletions', 'records');
      await addDoc(auditCollection, {
        originalData: docSnap.data(),
        documentId,
        collection: collectionPath,
        deletedBy: userId,
        deletedAt: Date.now(),
        reason,
        signature: signature.signature,
        nonce: signature.nonce,
      });

      // Deleta o documento original
      await deleteDoc(docRef);

      // Registra a operação
      this.logOperation({
        operationType: 'delete',
        collection: collectionPath,
        documentId,
        userId,
        timestamp: Date.now(),
        signature: signature.signature,
        nonce: signature.nonce,
      });
    } catch (error) {
      console.error('[SignedFirebase] Erro ao deletar documento:', error);
      captureException(error as Error, {
        collection: collectionPath,
        documentId,
        operation: 'delete',
      });
      throw error;
    }
  }

  /**
   * Verifica a integridade de um documento
   */
  async verifyDocumentIntegrity(
    collectionPath: string,
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const docRef = doc(db, collectionPath, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return false;
    }

    const data = docSnap.data();
    const security = data._security;

    if (!security) {
      // Documento não tem assinatura, pode ser legado
      return true;
    }

    try {
      // Recria a assinatura
      const { signature: storedSignature, timestamp, nonce, algorithm } = security;

      // Remove os metadados de segurança dos dados
      const cleanData = { ...data };
      delete cleanData._security;

      // Cria a string de assinatura
      const { createHMAC, createSigningString } = await import('./apiSigning');

      const signingString = createSigningString(
        'read', // Tipo de operação para leitura
        collectionPath,
        documentId,
        JSON.stringify(cleanData),
        timestamp,
        nonce
      );

      const expectedSignature = await createHMAC(
        signingString,
        this.config.secretKey,
        algorithm as any || 'SHA256'
      );

      return storedSignature === expectedSignature;
    } catch (error) {
      console.error('[SignedFirebase] Erro ao verificar integridade:', error);
      return false;
    }
  }

  /**
   * Cria uma assinatura para uma operação
   */
  private async createSignature(
    operation: string,
    collection: string,
    documentId: string,
    data: any,
    userId: string
  ): Promise<SignedRequest> {
    const payload = {
      operation,
      collection,
      documentId,
      data,
      userId,
    };

    return signRequest(
      `${collection}/${documentId}`,
      operation,
      payload,
      this.config
    );
  }

  /**
   * Registra uma operação no log
   */
  private logOperation(audit: OperationAudit): void {
    if (this.config.logOperations) {
      this.auditLog.push(audit);
      console.log('[SignedFirebase] Operação registrada:', audit);
    }
  }

  /**
   * Obtém o log de operações
   */
  getAuditLog(): OperationAudit[] {
    return [...this.auditLog];
  }

  /**
   * Limpa o log de operações
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

/**
 * Instância singleton das operações assinadas
 */
let signedOpsInstance: SignedFirebaseOperations | null = null;

/**
 * Obtém a instância das operações assinadas
 */
export function getSignedFirebaseOperations(
  config?: Partial<SecurityConfig>
): SignedFirebaseOperations {
  if (!signedOpsInstance) {
    signedOpsInstance = new SignedFirebaseOperations(config);
  }
  return signedOpsInstance;
}

/**
 * Reinicia a instância (chamar no logout)
 */
export function resetSignedFirebaseOperations(): void {
  if (signedOpsInstance) {
    signedOpsInstance.clearAuditLog();
  }
  signedOpsInstance = null;
}
