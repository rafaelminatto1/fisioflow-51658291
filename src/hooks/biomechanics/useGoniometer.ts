import { useState, useCallback } from "react";
import { Point } from "../../types/biomechanics";
import { calcAngle } from "../../utils/biomechanics-formulas";

const defaultPoints: Point[] = [
	{ x: 400, y: 300 },
	{ x: 300, y: 200 },
	{ x: 300, y: 400 }
];

export const useGoniometer = (initialPoints: Point[] = defaultPoints) => {
	const [points, setPoints] = useState<Point[]>(initialPoints);

	const updatePoint = useCallback((index: number, newPos: Point) => {
		setPoints(prev => {
			const arr = [...prev];
			arr[index] = newPos;
			return arr;
		});
	}, []);

    const clearGoniometer = useCallback(() => {
        setPoints(initialPoints);
    }, [initialPoints]);

	const currentAngle = calcAngle(points[0], points[1], points[2]);

	return { points, updatePoint, currentAngle, clearGoniometer };
};
