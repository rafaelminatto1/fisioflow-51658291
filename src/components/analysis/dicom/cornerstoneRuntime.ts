import { fisioLogger as logger } from "@/lib/errors/logger";

type MinimalCornerstoneToolsRuntime = {
	addTool: typeof import("@fisioflow/cornerstone-tools-add-tool").addTool;
	ToolGroupManager: typeof import("@fisioflow/cornerstone-tools-tool-group-manager");
	Enums: Pick<typeof import("@fisioflow/cornerstone-tools-enums"), "MouseBindings">;
	PanTool: typeof import("@fisioflow/cornerstone-tools-pan").default;
	ZoomTool: typeof import("@fisioflow/cornerstone-tools-zoom").default;
	LengthTool: typeof import("@fisioflow/cornerstone-tools-length").default;
	ProbeTool: typeof import("@fisioflow/cornerstone-tools-probe").default;
};

type CornerstoneRuntime = {
	core: typeof import("@cornerstonejs/core");
	tools: MinimalCornerstoneToolsRuntime;
	dicomImageLoader: typeof import("@cornerstonejs/dicom-image-loader");
	initCornerstone: () => Promise<void>;
};

let runtimePromise: Promise<CornerstoneRuntime> | null = null;

export async function loadCornerstoneRuntime(): Promise<CornerstoneRuntime> {
	if (!runtimePromise) {
		runtimePromise = Promise.all([
			import("@cornerstonejs/core"),
			import("@fisioflow/cornerstone-tools-init"),
			import("@fisioflow/cornerstone-tools-add-tool"),
			import("@fisioflow/cornerstone-tools-tool-group-manager"),
			import("@fisioflow/cornerstone-tools-enums"),
			import("@fisioflow/cornerstone-tools-pan"),
			import("@fisioflow/cornerstone-tools-zoom"),
			import("@fisioflow/cornerstone-tools-length"),
			import("@fisioflow/cornerstone-tools-probe"),
			import("@cornerstonejs/dicom-image-loader"),
			import("./initCornerstone"),
		])
			.then(
				([
					core,
					toolsInitModule,
					addToolModule,
					toolGroupManager,
					enums,
					panTool,
					zoomTool,
					lengthTool,
					probeTool,
					dicomImageLoader,
					initModule,
				]) => ({
				core,
				tools: {
					addTool: addToolModule.addTool,
					ToolGroupManager: toolGroupManager,
					Enums: {
						MouseBindings: enums.MouseBindings,
					},
					PanTool: panTool.default,
					ZoomTool: zoomTool.default,
					LengthTool: lengthTool.default,
					ProbeTool: probeTool.default,
				},
				dicomImageLoader,
				initCornerstone: () =>
					initModule.default({
						core,
						toolsInit: toolsInitModule.init,
						dicomImageLoader,
					}),
			}),
			)
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
