// Mock for firebase/firestore
export function getFirestore() {
  return {};
}

export function collection() {
  return {};
}

export function doc() {
  return {};
}

export function getDoc() {
  return Promise.resolve({ exists: false, data: () => ({}) });
}

export function getDocs() {
  return Promise.resolve({ empty: true, docs: [] });
}

export function setDoc() {
  return Promise.resolve();
}

export function updateDoc() {
  return Promise.resolve();
}

export function deleteDoc() {
  return Promise.resolve();
}

export function onSnapshot() {
  return jest.fn(() => jest.fn());
}

export function query() {
  return {};
}

export function where() {
  return {};
}

export function orderBy() {
  return {};
}

export function limit() {
  return {};
}

export function addDoc() {
  return Promise.resolve();
}

export function runTransaction() {
  return Promise.resolve();
}

export function serverTimestamp() {
  return { seconds: 1234567890, nanoseconds: 0 };
}
