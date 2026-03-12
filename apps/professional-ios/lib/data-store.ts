import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, profApi } from './api';
import { authClient } from './neonAuth';

const DOC_PREFIX = '@fisioflow_data_doc:';
const POLL_INTERVAL_MS = 30000;

type DataStorePath = string[];
type FilterOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains';
type WhereConstraint = { kind: 'where'; field: string; op: FilterOperator; value: unknown };
type OrderConstraint = { kind: 'orderBy'; field: string; direction: 'asc' | 'desc' };
type LimitConstraint = { kind: 'limit'; count: number };
type QueryConstraint = WhereConstraint | OrderConstraint | LimitConstraint;
type DocumentData = Record<string, any>;

type CollectionReference = {
  kind: 'collection';
  path: DataStorePath;
};

type DocumentReference = {
  kind: 'doc';
  path: DataStorePath;
  id: string;
};

type QueryReference = {
  kind: 'query';
  path: DataStorePath;
  constraints: QueryConstraint[];
};

type CompatReference = CollectionReference | DocumentReference | QueryReference;

type ServerCollectionProvider = {
  list?: (queryRef: QueryReference) => Promise<DocumentData[]>;
  get?: (id: string) => Promise<DocumentData | null>;
  create?: (data: DocumentData) => Promise<DocumentData>;
  update?: (id: string, data: DocumentData) => Promise<void>;
  delete?: (id: string) => Promise<void>;
};

type ServerTimestampValue = {
  __type: 'serverTimestamp';
};

export class Timestamp {
  private readonly value: Date;

  constructor(value: Date | string | number = new Date()) {
    this.value = value instanceof Date ? value : new Date(value);
  }

  toDate() {
    return new Date(this.value);
  }

  toMillis() {
    return this.value.getTime();
  }

  toJSON() {
    return this.value.toISOString();
  }

  static now() {
    return new Timestamp();
  }

  static fromDate(date: Date) {
    return new Timestamp(date);
  }
}

export const db = { provider: 'neon-cloudflare-compat' } as const;

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isServerTimestamp(value: unknown): value is ServerTimestampValue {
  return Boolean(value && typeof value === 'object' && (value as ServerTimestampValue).__type === 'serverTimestamp');
}

function isTimestampKey(key: string) {
  return key.endsWith('_at') || key.endsWith('At') || key === 'timestamp';
}

function dehydrateValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toJSON();
  if (value instanceof Date) return value.toISOString();
  if (isServerTimestamp(value)) return new Date().toISOString();
  if (Array.isArray(value)) return value.map((item) => dehydrateValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, dehydrateValue(entry)]),
    );
  }
  return value;
}

function hydrateValue(key: string, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateValue(key, item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        hydrateValue(entryKey, entryValue),
      ]),
    );
  }
  if (
    isTimestampKey(key) &&
    (typeof value === 'string' || typeof value === 'number') &&
    !Number.isNaN(new Date(value).getTime())
  ) {
    return new Timestamp(value);
  }
  return value;
}

function hydrateDocument<T extends DocumentData>(value: T | null) {
  if (!value) return null;
  return hydrateValue('', value) as T;
}

function docStorageKey(path: DataStorePath) {
  return `${DOC_PREFIX}${path.join('/')}`;
}

async function readLocalDocument(path: DataStorePath) {
  const raw = await AsyncStorage.getItem(docStorageKey(path));
  return raw ? (JSON.parse(raw) as DocumentData) : null;
}

async function writeLocalDocument(path: DataStorePath, data: DocumentData) {
  await AsyncStorage.setItem(docStorageKey(path), JSON.stringify(dehydrateValue(data)));
}

async function deleteLocalDocument(path: DataStorePath) {
  await AsyncStorage.removeItem(docStorageKey(path));
}

async function readLocalCollection(path: DataStorePath) {
  const prefix = `${docStorageKey(path)}/`;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => {
    if (!key.startsWith(prefix)) return false;
    return key.slice(prefix.length).split('/').length === 1;
  });

  if (keys.length === 0) return [] as DocumentData[];

  const entries = await AsyncStorage.multiGet(keys);
  return entries
    .map(([, raw]) => (raw ? (JSON.parse(raw) as DocumentData) : null))
    .filter(Boolean) as DocumentData[];
}

async function cacheCollection(path: DataStorePath, docs: DocumentData[]) {
  await Promise.all(
    docs
      .filter((item) => typeof item?.id === 'string' && item.id.length > 0)
      .map((item) => writeLocalDocument([...path, item.id], item)),
  );
}

function getCollectionName(path: DataStorePath) {
  return path[0] ?? '';
}

function getQueryConstraints(ref: CollectionReference | QueryReference) {
  return ref.kind === 'query' ? ref.constraints : [];
}

function findWhereConstraint(ref: QueryReference, field: string) {
  return ref.constraints.find(
    (constraint): constraint is WhereConstraint => constraint.kind === 'where' && constraint.field === field,
  );
}

function applyConstraints(docs: DocumentData[], constraints: QueryConstraint[]) {
  let result = [...docs];

  for (const constraint of constraints) {
    if (constraint.kind === 'where') {
      result = result.filter((item) => {
        const current = item?.[constraint.field];
        switch (constraint.op) {
          case '==':
            return current === constraint.value;
          case '!=':
            return current !== constraint.value;
          case '>':
            return current > constraint.value;
          case '>=':
            return current >= constraint.value;
          case '<':
            return current < constraint.value;
          case '<=':
            return current <= constraint.value;
          case 'array-contains':
            return Array.isArray(current) && current.includes(constraint.value);
          default:
            return false;
        }
      });
    }

    if (constraint.kind === 'orderBy') {
      result.sort((left, right) => {
        const leftValue = left?.[constraint.field];
        const rightValue = right?.[constraint.field];
        if (leftValue === rightValue) return 0;
        const direction = constraint.direction === 'desc' ? -1 : 1;
        return leftValue > rightValue ? direction : -direction;
      });
    }

    if (constraint.kind === 'limit') {
      result = result.slice(0, constraint.count);
    }
  }

  return result;
}

function makeQueryFromCollection(ref: CollectionReference | QueryReference) {
  return ref.kind === 'query'
    ? ref
    : ({
        kind: 'query',
        path: ref.path,
        constraints: [],
      } satisfies QueryReference);
}

const serverProviders: Record<string, ServerCollectionProvider> = {
  patients: {
    list: async () => profApi.getPatients(),
    get: async (id) => profApi.getPatient(id),
    create: async (data) => {
      const result = await profApi.createPatient(data);
      return { ...data, id: result?.id ?? data.id };
    },
    update: async (id, data) => {
      await profApi.updatePatient(id, data);
    },
    delete: async (id) => {
      await api.delete(`/api/prof/patients/${id}`);
    },
  },
  appointments: {
    list: async () => profApi.getAppointments('', ''),
    get: async (id) => api.get(`/api/prof/appointments/${id}`),
    create: async (data) => {
      const result = await profApi.createAppointment(data);
      return { ...data, id: result?.id ?? data.id };
    },
    update: async (id, data) => {
      await profApi.updateAppointment(id, data);
    },
    delete: async (id) => {
      await api.delete(`/api/prof/appointments/${id}`);
    },
  },
  exercises: {
    list: async () => profApi.getExercises(),
    get: async (id) => api.get(`/api/prof/exercises/${id}`),
  },
  evolutions: {
    list: async (queryRef) => {
      const patientId = findWhereConstraint(queryRef, 'patient_id')?.value;
      if (!patientId || typeof patientId !== 'string') return [];
      return profApi.getEvolutions(patientId);
    },
    create: async (data) => {
      const result = await profApi.createEvolution(data);
      return { ...data, id: result?.id ?? data.id };
    },
  },
};

async function getServerProvider(path: DataStorePath) {
  return serverProviders[getCollectionName(path)] ?? null;
}

async function getCurrentUserDocument(userId: string) {
  const session = await authClient.getSession();
  const user = session?.data?.user;

  if (user?.id === userId) {
    const localDoc = await readLocalDocument(['users', userId]);
    return {
      id: user.id,
      uid: user.id,
      email: user.email,
      full_name: user.name || localDoc?.full_name || '',
      name: user.name || localDoc?.name || '',
      photo_url: user.image || localDoc?.photo_url || '',
      ...localDoc,
    };
  }

  return readLocalDocument(['users', userId]);
}

async function readDocument(ref: DocumentReference) {
  if (ref.path[0] === 'users' && ref.path.length === 2) {
    const userDoc = await getCurrentUserDocument(ref.id);
    if (userDoc) {
      await writeLocalDocument(ref.path, userDoc);
      return userDoc;
    }
  }

  const provider = await getServerProvider(ref.path);
  if (provider?.get && ref.path.length === 2) {
    try {
      const data = await provider.get(ref.id);
      if (data) {
        const normalized = { ...data, id: data.id ?? ref.id };
        await writeLocalDocument(ref.path, normalized);
        return normalized;
      }
    } catch (_error) {
      // fallback to local cache
    }
  }

  return readLocalDocument(ref.path);
}

async function readQuery(ref: QueryReference) {
  const provider = await getServerProvider(ref.path);
  if (provider?.list && ref.path.length === 1) {
    try {
      const docs = await provider.list(ref);
      const normalized = docs.map((item) => ({ ...item, id: item.id ?? randomId() }));
      await cacheCollection(ref.path, normalized);
      return applyConstraints(normalized, ref.constraints);
    } catch (_error) {
      // fallback to local cache
    }
  }

  const localDocs = await readLocalCollection(ref.path);
  return applyConstraints(localDocs, ref.constraints);
}

async function mergeUserProfile(path: DataStorePath, data: DocumentData, merge = false) {
  const existing = merge ? ((await readLocalDocument(path)) ?? {}) : {};
  const next = { ...existing, ...data, id: path[1], uid: path[1] };

  if (next.full_name || next.photo_url) {
    await authClient.updateUser({
      name: next.full_name ?? next.name,
      image: next.photo_url,
    }).catch(() => undefined);
  }

  await writeLocalDocument(path, next);
  return next;
}

async function writeWithProvider(ref: DocumentReference, data: DocumentData, merge = false) {
  const provider = await getServerProvider(ref.path);
  const collectionName = getCollectionName(ref.path);

  if (collectionName === 'users' && ref.path.length === 2) {
    return mergeUserProfile(ref.path, data, merge);
  }

  const payload = { ...data, id: ref.id };

  if (provider?.update) {
    try {
      await provider.update(ref.id, payload);
      await writeLocalDocument(ref.path, payload);
      return payload;
    } catch (_error) {
      // fallback to local cache
    }
  }

  if (provider?.create) {
    try {
      const created = await provider.create(payload);
      const normalized = { ...payload, ...created, id: created?.id ?? ref.id };
      await writeLocalDocument([collectionName, normalized.id], normalized);
      return normalized;
    } catch (_error) {
      // fallback to local cache
    }
  }

  const existing = merge ? ((await readLocalDocument(ref.path)) ?? {}) : {};
  const normalized = { ...existing, ...payload, id: ref.id };
  await writeLocalDocument(ref.path, normalized);
  return normalized;
}

export function collection(dbOrRef: { path?: DataStorePath } | CollectionReference, ...segments: string[]): CollectionReference {
  const basePath = 'path' in dbOrRef && Array.isArray(dbOrRef.path) ? dbOrRef.path : [];
  return { kind: 'collection', path: [...basePath, ...segments] };
}

export function doc(
  base:
    | { path?: DataStorePath }
    | CollectionReference
    | DocumentReference,
  ...segments: string[]
): DocumentReference {
  const basePath = 'path' in base && Array.isArray(base.path) ? base.path : [];

  if (segments.length === 0) {
    const id = randomId();
    return { kind: 'doc', path: [...basePath, id], id };
  }

  const path = [...basePath, ...segments];
  return { kind: 'doc', path, id: path[path.length - 1] };
}

export function where(field: string, op: FilterOperator, value: unknown): WhereConstraint {
  return { kind: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): OrderConstraint {
  return { kind: 'orderBy', field, direction };
}

export function limit(count: number): LimitConstraint {
  return { kind: 'limit', count };
}

export function query(base: CollectionReference | QueryReference, ...constraints: QueryConstraint[]): QueryReference {
  const current = makeQueryFromCollection(base);
  return {
    kind: 'query',
    path: current.path,
    constraints: [...current.constraints, ...constraints],
  };
}

export function serverTimestamp(): ServerTimestampValue {
  return { __type: 'serverTimestamp' };
}

class CompatDocumentSnapshot {
  constructor(private readonly ref: DocumentReference, private readonly value: DocumentData | null) {}

  get id() {
    return this.ref.id;
  }

  exists() {
    return this.value !== null;
  }

  data() {
    return hydrateDocument(this.value);
  }
}

class CompatQueryDocumentSnapshot extends CompatDocumentSnapshot {}

class CompatQuerySnapshot {
  constructor(readonly docs: CompatQueryDocumentSnapshot[]) {}

  forEach(callback: (snapshot: CompatQueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

export async function getDoc(ref: DocumentReference) {
  const data = await readDocument(ref);
  return new CompatDocumentSnapshot(ref, data);
}

export async function getDocs(ref: CollectionReference | QueryReference) {
  const queryRef = makeQueryFromCollection(ref);
  const docs = await readQuery(queryRef);
  return new CompatQuerySnapshot(
    docs.map((item) => new CompatQueryDocumentSnapshot(doc({ path: queryRef.path }, item.id), item)),
  );
}

export async function getCountFromServer(ref: CollectionReference | QueryReference) {
  const snapshot = await getDocs(ref);
  return {
    data: () => ({ count: snapshot.docs.length }),
  };
}

export async function setDoc(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
  const normalized = dehydrateValue(data) as DocumentData;
  return writeWithProvider(ref, normalized, options?.merge === true);
}

export async function addDoc(ref: CollectionReference, data: DocumentData) {
  const provider = await getServerProvider(ref.path);
  const payload = dehydrateValue(data) as DocumentData;

  if (provider?.create && ref.path.length === 1) {
    try {
      const created = await provider.create(payload);
      const normalized = { ...payload, ...created, id: created?.id ?? randomId() };
      await writeLocalDocument([...ref.path, normalized.id], normalized);
      return doc(ref, normalized.id);
    } catch (_error) {
      // fallback to local cache
    }
  }

  const refDoc = doc(ref);
  await writeLocalDocument(refDoc.path, { ...payload, id: refDoc.id });
  return refDoc;
}

export async function updateDoc(ref: DocumentReference, data: DocumentData) {
  const existing = (await readDocument(ref)) ?? {};
  return writeWithProvider(ref, { ...existing, ...(dehydrateValue(data) as DocumentData) }, true);
}

export async function deleteDoc(ref: DocumentReference) {
  const provider = await getServerProvider(ref.path);
  if (provider?.delete && ref.path.length === 2) {
    await provider.delete(ref.id).catch(() => undefined);
  }
  await deleteLocalDocument(ref.path);
}

export function onSnapshot(
  ref: DocumentReference | QueryReference | CollectionReference,
  onNext: (snapshot: CompatDocumentSnapshot | CompatQuerySnapshot) => void,
  onError?: (error: Error) => void,
) {
  let cancelled = false;

  const emit = async () => {
    try {
      if (cancelled) return;
      if (ref.kind === 'doc') {
        onNext(await getDoc(ref));
        return;
      }
      onNext(await getDocs(ref));
    } catch (error) {
      onError?.(error as Error);
    }
  };

  void emit();
  const interval = setInterval(emit, POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

export function writeBatch(_db: unknown) {
  const operations: Array<() => Promise<void>> = [];

  return {
    update(ref: DocumentReference, data: DocumentData) {
      operations.push(async () => {
        await updateDoc(ref, data);
      });
    },
    delete(ref: DocumentReference) {
      operations.push(async () => {
        await deleteDoc(ref);
      });
    },
    async commit() {
      for (const operation of operations) {
        await operation();
      }
    },
  };
}
