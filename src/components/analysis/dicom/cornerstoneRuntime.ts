import { fisioLogger as logger } from "@/lib/errors/logger";

type CornerstoneRuntime = {
	core: typeof import("@cornerstonejs/core");
	tools: typeof import("@cornerstonejs/tools");
	dicomImageLoader: typeof import("@cornerstonejs/dicom-image-loader");
	initCornerstone: typeof import("./initCornerstone").default;
};

let runtimePromise: Promise<CornerstoneRuntime> | null = null;

export async function loadCornerstoneRuntime(): Promise<CornerstoneRuntime> {
	if (!runtimePromise) {
		runtimePromise = Promise.all([
			import("@cornerstonejs/core"),
			import("@cornerstonejs/tools"),
			import("@cornerstonejs/dicom-image-loader"),
			import("./initCornerstone"),
		])
			.then(([core, tools, dicomImageLoader, initModule]) => ({
				core,
				tools,
				dicomImageLoader,
				initCornerstone: initModule.default,
			}))
			.catch((error) => {
				runtimePromise = null;
				logger.error(
					"Falha ao carregar runtime do Cornerstone",
					error,
					"cornerstoneRuntime",
				);
				throw error;
			});
	}

	return runtimePromise;
}
