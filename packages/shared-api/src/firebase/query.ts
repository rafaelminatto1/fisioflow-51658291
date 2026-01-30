/**
 * Firebase Query Builder
 *
 * Query builder type-safe para substituir o Supabase query builder.
 *
 * Implementa uma interface similar ao Supabase para facilitar migração:
 * - select()
 * - where()
 * - orderBy()
 * - limit()
 * - single()
 * - get()
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  Query,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Query builder type-safe para Firestore
 *
 * Uso:
 * ```ts
 * const profile = await FirebaseQuery
 *   .from('profiles')
 *   .where('user_id', '==', userId)
 *   .single();
 *
 * const patients = await FirebaseQuery
 *   .from('patients')
 *   .where('professional_id', '==', profId)
 *   .orderBy('created_at', 'desc')
 *   .limit(20)
 *   .get();
 * ```
 */
export class FirebaseQueryBuilder {
  private collectionName: string;
  private constraints: QueryConstraint[] = [];
  private _single = false;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Cria um novo query builder
   */
  static from(collectionName: string): FirebaseQueryBuilder {
    return new FirebaseQueryBuilder(collectionName);
  }

  /**
   * Adiciona filtro where
   * @param field Campo para filtrar
   * @param op Operador: ==, !=, >, >=, <, <=, array-contains, array-contains-any, in
   * @param value Valor para comparar
   */
  where(field: string, op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'array-contains-any' | 'in', value: any): FirebaseQueryBuilder {
    this.constraints.push(where(field, op, value));
    return this;
  }

  /**
   * Adiciona ordenação
   * @param field Campo para ordenar
   * @param direction 'asc' ou 'desc'
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): FirebaseQueryBuilder {
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  /**
   * Limita número de resultados
   */
  limit(limitValue: number): FirebaseQueryBuilder {
    this.constraints.push(limit(limitValue));
    return this;
  }

  /**
   * Executa query e retorna único documento
   */
  async single<T = DocumentData>(): Promise<T | null> {
    this._single = true;

    if (this.constraints.length === 0) {
      throw new Error('Single query requires at least one where clause');
    }

    const q = query(
      collection(db, this.collectionName) as CollectionReference<DocumentData>,
      ...this.constraints
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    if (snapshot.docs.length > 1) {
      console.warn(`Expected single document, got ${snapshot.docs.length}`);
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as T;
  }

  /**
   * Executa query e retorna array de documentos
   */
  async get<T = DocumentData>(): Promise<T[]> {
    if (this._single) {
      return this.single<T>().then((doc) => (doc ? [doc] : []));
    }

    const q = query(
      collection(db, this.collectionName) as CollectionReference<DocumentData>,
      ...this.constraints
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  /**
   * Executa query e retorna com metadata (como Supabase)
   */
  async select<T = DocumentData>(): Promise<{
    data: T[] | null;
    error: Error | null;
  }> {
    try {
      const data = await this.get<T>();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Executa query e retorna único documento com metadata
   */
  async maybeSingle<T = DocumentData>(): Promise<{
    data: T | null;
    error: Error | null;
  }> {
    try {
      const data = await this.single<T>();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

/**
 * Helper para buscar documento por ID
 */
export async function getDocumentById<T = DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as T;
}

/**
 * Helper para buscar múltiplos documentos por IDs
 */
export async function getDocumentsByIds<T = DocumentData>(
  collectionName: string,
  docIds: string[]
): Promise<T[]> {
  if (docIds.length === 0) return [];

  // Firestore limita 'in' a 10 itens
  const chunks = [];
  for (let i = 0; i < docIds.length; i += 10) {
    chunks.push(docIds.slice(i, i + 10));
  }

  const results: T[] = [];

  for (const chunk of chunks) {
    const docs = await FirebaseQueryBuilder.from(collectionName)
      .where('id', 'in', chunk)
      .get<T>();
    results.push(...docs);
  }

  return results;
}

/**
 * Alias para compatibilidade com Supabase
 */
export const supabaseQuery = FirebaseQueryBuilder.from;

/**
 * Export default
 */
export default FirebaseQueryBuilder;
