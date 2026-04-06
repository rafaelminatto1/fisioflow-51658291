import { useState, useRef, useCallback, useEffect } from "react";
import { loadTfjsPoseRuntime } from "@/lib/ai/tfjsRuntime";
type PoseDetector = import("@tensorflow-models/pose-detection").PoseDetector;
type Keypoint = import("@tensorflow-models/pose-detection").Keypoint;

// Module-level singleton to avoid slow TF/MoveNet reloads when changing pages
let _detector: PoseDetector | null = null;
let _initPromise: Promise<void> | null = null;

export const useMoveNet = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
	const [aiEnabled, setAiEnabled] = useState(false);
	const [aiLoading, setAiLoading] = useState(false);
	const [poseKeypoints, setPoseKeypoints] = useState<Keypoint[] | null>(null);
	const isRunningRef = useRef(false);
	const rafRef = useRef<number | null>(null);

	const detect = useCallback(async () => {
		if (!isRunningRef.current) return;
		
		// Handle both react-webcam ref and standard HTMLVideoElement ref
		const video = (videoRef.current as any)?.video || videoRef.current;
		
		if (video && _detector && video.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
			try {
				const poses = await _detector.estimatePoses(video);
				if (poses[0]?.keypoints) setPoseKeypoints(poses[0].keypoints);
			} catch (err) {
				console.error("TF.js estimatePoses error:", err);
			}
		}
		if (isRunningRef.current) {
			rafRef.current = requestAnimationFrame(detect);
		}
	}, [videoRef]);

	const startMoveNet = useCallback(async () => {
		if (isRunningRef.current) return;
		setAiEnabled(true);
		isRunningRef.current = true;
		
		if (!_detector) {
			setAiLoading(true);
			try {
				if (!_initPromise) {
					_initPromise = (async () => {
						const [, poseDetection] = await Promise.all([
							loadTfjsPoseRuntime(),
							import("@tensorflow-models/pose-detection"),
						]);
						_detector = await poseDetection.createDetector(
							poseDetection.SupportedModels.MoveNet,
							{
								modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
								enableSmoothing: true,
							}
						);
					})();
				}
				await _initPromise;
			} catch (err) {
				console.error("MoveNet init failed:", err);
				setAiEnabled(false);
				isRunningRef.current = false;
				setAiLoading(false);
				return;
			}
			setAiLoading(false);
		}

		detect();
	}, [detect]);

	const stopMoveNet = useCallback(() => {
		isRunningRef.current = false;
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
		setPoseKeypoints(null);
		setAiEnabled(false);
	}, []);

	useEffect(() => {
		return () => {
			isRunningRef.current = false;
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, []);

	return { aiEnabled, aiLoading, poseKeypoints, startMoveNet, stopMoveNet };
};
