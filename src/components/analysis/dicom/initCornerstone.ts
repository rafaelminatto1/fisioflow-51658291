import { fisioLogger as logger } from "@/lib/errors/logger";

let initialized = false;

type CornerstoneInitRuntime = {
	core: typeof import("@cornerstonejs/core");
	tools: typeof import("@cornerstonejs/tools");
	dicomImageLoader: typeof import("@cornerstonejs/dicom-image-loader");
};

export default async function initCornerstone({
	core,
	tools,
	dicomImageLoader,
}: CornerstoneInitRuntime) {
	if (initialized) return;

	try {
		await core.init();
		await tools.init();
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
