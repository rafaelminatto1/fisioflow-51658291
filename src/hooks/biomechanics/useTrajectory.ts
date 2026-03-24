import { useState, useRef, useCallback, useEffect } from "react";
import { TrackedTraj, TrajectoryPoint, TRAJ_COLORS, KP_NAMES } from "../../types/biomechanics";
type Keypoint = import("@tensorflow-models/pose-detection").Keypoint;

export const useTrajectory = (
	poseKeypoints: Keypoint[] | null,
	aiEnabled: boolean,
	currentFrame: number,
	canvasDimensions: { width: number; height: number },
	videoDimensions: { width: number; height: number } = { width: 640, height: 480 } // default camera resolution
) => {
	const [trackedTrajs, setTrackedTrajs] = useState<TrackedTraj[]>([]);
	const trajFrameRef = useRef(0);

	useEffect(() => {
		if (!poseKeypoints || !aiEnabled) return;
		const frame = ++trajFrameRef.current;
		setTrackedTrajs(prev => prev.map(traj => {
			if (traj.keypointIdx == null) return traj; // manual: do not auto-track
			const kp = poseKeypoints[traj.keypointIdx];
			if (!kp || (kp.score ?? 0) < 0.35) return traj;
			const newPt: TrajectoryPoint = { 
				x: (kp.x / videoDimensions.width) * canvasDimensions.width, 
				y: (kp.y / videoDimensions.height) * canvasDimensions.height, 
				frame 
			};
			return { ...traj, points: [...traj.points.slice(-800), newPt] };
		}));
	}, [poseKeypoints, aiEnabled, canvasDimensions, videoDimensions]);

	const addTrajectory = useCallback((keypointIdx: number | null) => {
		setTrackedTrajs(prev => {
			const color = TRAJ_COLORS[prev.length % TRAJ_COLORS.length];
			const label = keypointIdx != null ? KP_NAMES[keypointIdx] : `Manual ${prev.length + 1}`;
			return [...prev, { points: [], color, label, keypointIdx }];
		});
	}, []);

	const handleCanvasClick = useCallback((x: number, y: number) => {
		setTrackedTrajs(prev => {
			if (prev.length === 0) return prev;
			const arr = [...prev];
			const last = arr[arr.length - 1];
			arr[arr.length - 1] = { ...last, points: [...last.points, { x, y, frame: currentFrame }] };
			return arr;
		});
	}, [currentFrame]);

	const removeTrajectory = useCallback((index: number) => {
		setTrackedTrajs(prev => prev.filter((_, i) => i !== index));
	}, []);

	const removeTrajectoryByKeypoint = useCallback((kpIdx: number) => {
		setTrackedTrajs(prev => prev.filter((t) => t.keypointIdx !== kpIdx));
	}, []);

	const clearTrajectories = useCallback(() => {
		setTrackedTrajs([]);
		trajFrameRef.current = 0;
	}, []);

	return { 
		trackedTrajs, 
		addTrajectory, 
		handleCanvasClick, 
		removeTrajectory, 
		removeTrajectoryByKeypoint,
		clearTrajectories 
	};
};
