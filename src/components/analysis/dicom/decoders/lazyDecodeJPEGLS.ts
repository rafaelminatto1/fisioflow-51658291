const charlsWasm = new URL("@fisioflow/codec-charls-wasm", import.meta.url);

type JPEGImageInfo = {
	signed?: boolean;
	bytesPerPixel: number;
};

type FrameInfo = {
	width: number;
	height: number;
	bitsPerSample: number;
	componentCount: number;
};

type CharLSDecoderInstance = {
	getEncodedBuffer(length: number): Uint8Array;
	decode(): void;
	getFrameInfo(): FrameInfo;
	getInterleaveMode(): number;
	getNearLossless(): number;
	getDecodedBuffer(): Uint8Array;
};

type CharLSModule = {
	JpegLSDecoder: new () => CharLSDecoderInstance;
	getExceptionMessage(exception: number): string;
};

type CharLSFactory = (options: {
	locateFile: (fileName: string) => string;
}) => Promise<CharLSModule>;

const local: {
	codec?: CharLSModule;
	decoder?: CharLSDecoderInstance;
	decodeConfig: Record<string, unknown>;
} = {
	codec: undefined,
	decoder: undefined,
	decodeConfig: {},
};

function getExceptionMessage(exception: unknown) {
	return typeof exception === "number" && local.codec
		? local.codec.getExceptionMessage(exception)
		: exception;
}

export function initialize(decodeConfig?: Record<string, unknown>) {
	local.decodeConfig = decodeConfig || {};
	if (local.codec) {
		return Promise.resolve();
	}

	return import("@fisioflow/codec-charls-real")
		.then((module) => module.default as CharLSFactory)
		.then((charlsFactory) =>
			charlsFactory({
				locateFile: (fileName) => {
					if (fileName.endsWith(".wasm")) {
						return charlsWasm.toString();
					}
					return fileName;
				},
			}),
		)
		.then((instance) => {
			local.codec = instance;
			local.decoder = new instance.JpegLSDecoder();
		});
}

function getPixelData(
	frameInfo: FrameInfo,
	decodedBuffer: Uint8Array,
	signed: boolean | undefined,
) {
	if (frameInfo.bitsPerSample > 8) {
		if (signed) {
			return new Int16Array(
				decodedBuffer.buffer,
				decodedBuffer.byteOffset,
				decodedBuffer.byteLength / 2,
			);
		}
		return new Uint16Array(
			decodedBuffer.buffer,
			decodedBuffer.byteOffset,
			decodedBuffer.byteLength / 2,
		);
	}

	if (signed) {
		return new Int8Array(
			decodedBuffer.buffer,
			decodedBuffer.byteOffset,
			decodedBuffer.byteLength,
		);
	}

	return new Uint8Array(
		decodedBuffer.buffer,
		decodedBuffer.byteOffset,
		decodedBuffer.byteLength,
	);
}

export default async function decodeJPEGLS(
	compressedImageFrame: Uint8Array,
	imageInfo: JPEGImageInfo,
) {
	try {
		await initialize();
		const decoder = local.decoder;
		if (!decoder) {
			throw new Error("Decoder JPEG-LS não inicializado.");
		}

		const encodedBufferInWASM = decoder.getEncodedBuffer(
			compressedImageFrame.length,
		);
		encodedBufferInWASM.set(compressedImageFrame);
		decoder.decode();

		const frameInfo = decoder.getFrameInfo();
		const interleaveMode = decoder.getInterleaveMode();
		const nearLossless = decoder.getNearLossless();
		const decodedPixelsInWASM = decoder.getDecodedBuffer();
		const encodedImageInfo = {
			columns: frameInfo.width,
			rows: frameInfo.height,
			bitsPerPixel: frameInfo.bitsPerSample,
			signed: imageInfo.signed,
			bytesPerPixel: imageInfo.bytesPerPixel,
			componentsPerPixel: frameInfo.componentCount,
		};
		const pixelData = getPixelData(
			frameInfo,
			decodedPixelsInWASM,
			imageInfo.signed,
		);
		const encodeOptions = {
			nearLossless,
			interleaveMode,
			frameInfo,
		};

		return {
			...imageInfo,
			pixelData,
			imageInfo: encodedImageInfo,
			encodeOptions,
			...encodeOptions,
			...encodedImageInfo,
		};
	} catch (error) {
		throw getExceptionMessage(error);
	}
}
