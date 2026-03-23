const STORAGE_KEY = "dicom_transfer_syntaxes";

type CodecFamily = "native" | "charls" | "openjpeg" | "openjph" | "unknown";

interface StoredTransferSyntaxRecord {
	count: number;
	firstSeenAt: string;
	lastSeenAt: string;
}

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
	count: number;
	firstSeenAt: string;
	lastSeenAt: string;
}

interface CodecRecommendation {
	codec: Exclude<CodecFamily, "unknown">;
	status: "keep" | "candidate";
	reason: string;
}

export interface TrackedCodecSummary {
	codec: Exclude<CodecFamily, "unknown">;
	status: "keep" | "candidate";
	totalHits: number;
	syntaxCount: number;
	lastSeenAt: string | null;
	reason: string;
}

function isBrowser() {
	return typeof window !== "undefined";
}

function normalizeLegacyStorage(
	value: unknown,
): Record<string, StoredTransferSyntaxRecord> {
	if (Array.isArray(value)) {
		const now = new Date().toISOString();
		return Object.fromEntries(
			value
				.filter((item): item is string => typeof item === "string")
				.map((syntax) => [
					syntax,
					{ count: 1, firstSeenAt: now, lastSeenAt: now },
				]),
		);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).flatMap(([syntax, record]) => {
				if (!record || typeof record !== "object") {
					return [];
				}
				const typedRecord = record as Partial<StoredTransferSyntaxRecord>;
				const now = new Date().toISOString();
				return [
					[
						syntax,
						{
							count: Math.max(1, Number(typedRecord.count) || 1),
							firstSeenAt: typedRecord.firstSeenAt || now,
							lastSeenAt: typedRecord.lastSeenAt || typedRecord.firstSeenAt || now,
						},
					],
				];
			}),
		);
	}

	return {};
}

function loadStored(): Record<string, StoredTransferSyntaxRecord> {
	if (!isBrowser()) return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		return normalizeLegacyStorage(JSON.parse(raw));
	} catch {
		return {};
	}
}

function persist(records: Record<string, StoredTransferSyntaxRecord>) {
	if (!isBrowser()) return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
	} catch {
		/* ignore */
	}
}

const cache = loadStored();

export function trackTransferSyntax(syntax?: string) {
	if (!syntax || !isBrowser()) return;

	const now = new Date().toISOString();
	const existing = cache[syntax];
	cache[syntax] = existing
		? {
				...existing,
				count: existing.count + 1,
				lastSeenAt: now,
			}
		: {
				count: 1,
				firstSeenAt: now,
				lastSeenAt: now,
			};

	persist(cache);
	console.info("[DICOM] collected transfer syntax", syntax, cache[syntax]);
}

export function getTrackedTransferSyntaxes(): string[] {
	return Object.keys(cache);
}

export function getTrackedTransferSyntaxDetails(): TrackedTransferSyntax[] {
	return Object.entries(cache)
		.sort(([, left], [, right]) => right.count - left.count)
		.map(([syntax, record]) => ({
			syntax,
			label: TRANSFER_SYNTAX_LABELS[syntax] || "Transfer Syntax não mapeado",
			codec: TRANSFER_SYNTAX_CODEC[syntax] || "unknown",
			count: record.count,
			firstSeenAt: record.firstSeenAt,
			lastSeenAt: record.lastSeenAt,
		}));
}

export function getCodecRecommendations(): CodecRecommendation[] {
	const details = getTrackedTransferSyntaxDetails();
	const seen = new Set(details.map((item) => item.codec));

	return [
		{
			codec: "native",
			status: "keep",
			reason: "Obrigatorio para Little/Big Endian e JPEG baseline.",
		},
		{
			codec: "charls",
			status: seen.has("charls") ? "keep" : "candidate",
			reason: seen.has("charls")
				? "Ja houve estudo com JPEG-LS."
				: "Nenhum JPEG-LS visto neste navegador ate agora.",
		},
		{
			codec: "openjpeg",
			status: seen.has("openjpeg") ? "keep" : "candidate",
			reason: seen.has("openjpeg")
				? "Ja houve estudo com JPEG 2000."
				: "Nenhum JPEG 2000 visto neste navegador ate agora.",
		},
		{
			codec: "openjph",
			status: seen.has("openjph") ? "keep" : "candidate",
			reason: seen.has("openjph")
				? "Ja houve estudo com HTJ2K."
				: "Nenhum HTJ2K visto neste navegador ate agora.",
		},
	];
}

export function getTrackedCodecSummaries(): TrackedCodecSummary[] {
	const details = getTrackedTransferSyntaxDetails();
	const recommendations = new Map(
		getCodecRecommendations().map((item) => [item.codec, item]),
	);

	return ["native", "charls", "openjpeg", "openjph"].map((codec) => {
		const related = details.filter((item) => item.codec === codec);
		const totalHits = related.reduce((sum, item) => sum + item.count, 0);
		const lastSeenAt =
			related
				.map((item) => item.lastSeenAt)
				.sort((left, right) => right.localeCompare(left))[0] ?? null;
		const recommendation = recommendations.get(
			codec as Exclude<CodecFamily, "unknown">,
		);

		return {
			codec: codec as Exclude<CodecFamily, "unknown">,
			status: recommendation?.status ?? "candidate",
			totalHits,
			syntaxCount: related.length,
			lastSeenAt,
			reason: recommendation?.reason ?? "Sem dados locais para este codec.",
		};
	});
}

export function clearTrackedTransferSyntaxes() {
	Object.keys(cache).forEach((key) => {
		delete cache[key];
	});
	persist(cache);
}
