// Mock for firebase/storage
export function getStorage() {
  return {};
}

export function ref() {
  return {};
}

export function uploadBytes() {
  return Promise.resolve();
}

export function getDownloadURL() {
  return Promise.resolve('https://example.com/file.pdf');
}

export function deleteObject() {
  return Promise.resolve();
}
