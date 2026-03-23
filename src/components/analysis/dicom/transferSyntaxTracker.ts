const STORAGE_KEY = "dicom_transfer_syntaxes";

function isBrowser() {
  return typeof window !== "undefined";
}

function loadStored(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function persist(codes: Set<string>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(codes)));
  } catch {
    /* ignore */
  }
}

const cache = loadStored();

export function trackTransferSyntax(syntax?: string) {
  if (!syntax || !isBrowser()) return;
  if (cache.has(syntax)) return;
  cache.add(syntax);
  persist(cache);
  console.info("[DICOM] collected transfer syntax", syntax);
}

export function getTrackedTransferSyntaxes(): string[] {
  return Array.from(cache);
}
