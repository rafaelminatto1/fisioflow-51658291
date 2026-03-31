import { fisioLogger as logger } from "@/lib/errors/logger";

let initialized = false;

type CornerstoneInitRuntime = {
	core: typeof import("@cornerstonejs/core");
	toolsInit: () => void;
	dicomImageLoader: typeof import("@cornerstonejs/dicom-image-loader");
};

export default async function initCornerstone({
	core,
	toolsInit,
	dicomImageLoader,
}: CornerstoneInitRuntime) {
	if (initialized) return;

	try {
		await core.init();
		await toolsInit();
		dicomImageLoader.init({
			maxWebWorkers:
				typeof navigator !== "undefined" && navigator.hardwareConcurrency
					? Math.max(1, Math.floor(navigator.hardwareConcurrency / 2))
					: 1,
		});

		initialized = true;
		logger.info("Cornerstone initialized", undefined, "initCornerstone");
	} catch (error) {
		logger.error("Cornerstone init failed", error, "initCornerstone");
	}
}
