import { loadTfjsPoseRuntime } from "@/lib/ai/tfjsRuntime";

type PoseDetectionModule = typeof import("@tensorflow-models/pose-detection");
type PoseDetector = import("@tensorflow-models/pose-detection").PoseDetector;

let poseDetectionPromise: Promise<PoseDetectionModule> | null = null;

export async function loadPoseDetectionRuntime() {
	if (!poseDetectionPromise) {
		poseDetectionPromise = Promise.all([
			loadTfjsPoseRuntime(),
			import("@tensorflow-models/pose-detection"),
		]).then(([, poseDetection]) => poseDetection);
	}

	return poseDetectionPromise;
}

export async function createMoveNetDetector(): Promise<PoseDetector> {
	const poseDetection = await loadPoseDetectionRuntime();
	return poseDetection.createDetector(
		poseDetection.SupportedModels.MoveNet,
		{
			modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
			enableSmoothing: true,
		},
	);
}
