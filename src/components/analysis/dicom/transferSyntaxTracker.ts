const STORAGE_KEY = "dicom_transfer_syntaxes";

type CodecFamily = "native" | "charls" | "openjpeg" | "openjph" | "unknown";

const TRANSFER_SYNTAX_LABELS: Record<string, string> = {
	"1.2.840.10008.1.2": "Implicit VR Little Endian",
	"1.2.840.10008.1.2.1": "Explicit VR Little Endian",
	"1.2.840.10008.1.2.1.99": "Deflated Explicit VR Little Endian",
	"1.2.840.10008.1.2.2": "Explicit VR Big Endian",
	"1.2.840.10008.1.2.4.50": "JPEG Baseline",
	"1.2.840.10008.1.2.4.51": "JPEG Extended",
	"1.2.840.10008.1.2.4.57": "JPEG Lossless",
	"1.2.840.10008.1.2.4.70": "JPEG Lossless SV1",
	"1.2.840.10008.1.2.4.80": "JPEG-LS Lossless",
	"1.2.840.10008.1.2.4.81": "JPEG-LS Near Lossless",
	"1.2.840.10008.1.2.4.90": "JPEG 2000 Lossless",
	"1.2.840.10008.1.2.4.91": "JPEG 2000",
	"3.2.840.10008.1.2.4.96": "HTJ2K",
	"1.2.840.10008.1.2.4.201": "HTJ2K RPCL",
	"1.2.840.10008.1.2.4.202": "HTJ2K Lossless RPCL",
	"1.2.840.10008.1.2.4.203": "HTJ2K Lossless",
};

const TRANSFER_SYNTAX_CODEC: Record<string, CodecFamily> = {
	"1.2.840.10008.1.2": "native",
	"1.2.840.10008.1.2.1": "native",
	"1.2.840.10008.1.2.1.99": "native",
	"1.2.840.10008.1.2.2": "native",
	"1.2.840.10008.1.2.4.50": "native",
	"1.2.840.10008.1.2.4.51": "native",
	"1.2.840.10008.1.2.4.57": "native",
	"1.2.840.10008.1.2.4.70": "native",
	"1.2.840.10008.1.2.4.80": "charls",
	"1.2.840.10008.1.2.4.81": "charls",
	"1.2.840.10008.1.2.4.90": "openjpeg",
	"1.2.840.10008.1.2.4.91": "openjpeg",
	"3.2.840.10008.1.2.4.96": "openjph",
	"1.2.840.10008.1.2.4.201": "openjph",
	"1.2.840.10008.1.2.4.202": "openjph",
	"1.2.840.10008.1.2.4.203": "openjph",
};

export interface TrackedTransferSyntax {
	syntax: string;
	label: string;
	codec: CodecFamily;
}

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

export function getTrackedTransferSyntaxDetails(): TrackedTransferSyntax[] {
	return Array.from(cache)
		.sort()
		.map((syntax) => ({
			syntax,
			label: TRANSFER_SYNTAX_LABELS[syntax] || "Transfer Syntax não mapeado",
			codec: TRANSFER_SYNTAX_CODEC[syntax] || "unknown",
		}));
}
