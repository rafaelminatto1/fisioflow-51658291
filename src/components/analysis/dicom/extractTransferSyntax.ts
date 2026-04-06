const LONG_VR = new Set([
	"OB",
	"OD",
	"OF",
	"OL",
	"OV",
	"OW",
	"SQ",
	"UC",
	"UR",
	"UT",
	"UN",
]);

function readAscii(bytes: Uint8Array, start: number, length: number) {
	return new TextDecoder("ascii")
		.decode(bytes.subarray(start, start + length))
		.split("\u0000")
		.join("")
		.trim();
}

export async function extractTransferSyntaxFromFile(file: File) {
	const buffer = await file.arrayBuffer();
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	const hasPreamble =
		bytes.length >= 132 && readAscii(bytes, 128, 4) === "DICM";
	let offset = hasPreamble ? 132 : 0;

	while (offset + 8 <= bytes.length) {
		const group = view.getUint16(offset, true);
		const element = view.getUint16(offset + 2, true);

		if (group !== 0x0002) {
			break;
		}

		const vr = readAscii(bytes, offset + 4, 2);
		const isLongVr = LONG_VR.has(vr);
		const valueLength = isLongVr
			? view.getUint32(offset + 8, true)
			: view.getUint16(offset + 6, true);
		const valueOffset = isLongVr ? offset + 12 : offset + 8;

		if (group === 0x0002 && element === 0x0010) {
			return readAscii(bytes, valueOffset, valueLength) || undefined;
		}

		offset = valueOffset + valueLength;
	}

	return undefined;
}
