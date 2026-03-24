import { useState, useCallback, useRef } from "react";
import { Point } from "../../types/biomechanics";

export const useOpticalFlow = (videoRef: React.RefObject<HTMLVideoElement>) => {
    const [trackedPoints, setTrackedPoints] = useState<{ id: string; pos: Point; active: boolean }[]>([]);
    const prevImageData = useRef<Uint8ClampedArray | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const addPointToTrack = useCallback((pos: Point) => {
        setTrackedPoints(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), pos, active: true }]);
    }, []);

    const processFrame = useCallback(() => {
        if (!videoRef.current || trackedPoints.filter(p => p.active).length === 0) return;

        const video = videoRef.current;
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        if (prevImageData.current) {
            const nextPoints = trackedPoints.map(tp => {
                if (!tp.active) return tp;
                
                // Simplified Lucas-Kanade / Template Matching
                // Search in a 20px window around previous position
                const searchSize = 10;
                const prevX = Math.round(tp.pos.x);
                const prevY = Math.round(tp.pos.y);
                
                let bestX = prevX;
                let bestY = prevY;
                let minDiff = Infinity;

                for (let dy = -searchSize; dy <= searchSize; dy++) {
                    for (let dx = -searchSize; dx <= searchSize; dx++) {
                        const curX = prevX + dx;
                        const curY = prevY + dy;
                        
                        if (curX < 0 || curX >= canvas.width || curY < 0 || curY >= canvas.height) continue;

                        // Compare 3x3 patch
                        let diff = 0;
                        for (let py = -1; py <= 1; py++) {
                            for (let px = -1; px <= 1; px++) {
                                const pIdx = ((curY + py) * canvas.width + (curX + px)) * 4;
                                const prevIdx = ((prevY + py) * canvas.width + (prevX + px)) * 4;
                                
                                // Luma difference
                                const curL = currentImageData[pIdx] * 0.299 + currentImageData[pIdx+1] * 0.587 + currentImageData[pIdx+2] * 0.114;
                                const prevL = prevImageData.current![prevIdx] * 0.299 + prevImageData.current![prevIdx+1] * 0.587 + prevImageData.current![prevIdx+2] * 0.114;
                                diff += Math.abs(curL - prevL);
                            }
                        }

                        if (diff < minDiff) {
                            minDiff = diff;
                            bestX = curX;
                            bestY = curY;
                        }
                    }
                }

                return { ...tp, pos: { x: bestX, y: bestY } };
            });

            setTrackedPoints(nextPoints);
        }

        prevImageData.current = currentImageData;
    }, [videoRef, trackedPoints]);

    return { trackedPoints, addPointToTrack, processFrame, setTrackedPoints };
};
