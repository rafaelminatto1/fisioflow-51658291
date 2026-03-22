import { init as coreInit } from "@cornerstonejs/core";
import { init as toolsInit } from "@cornerstonejs/tools";
import dicomImageLoader from "@cornerstonejs/dicom-image-loader";
import { fisioLogger as logger } from "@/lib/errors/logger";

let initialized = false;

export default async function initCornerstone() {
	if (initialized) return;

	try {
		await coreInit();
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
