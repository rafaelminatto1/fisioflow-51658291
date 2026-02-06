
// POSE_CONNECTIONS defined locally since @mediapipe/pose uses UMD format

import React, { useEffect, useState } from 'react';
import { Stage, Layer, Circle, Line, Image as KonvaImage } from 'react-konva';
import { UnifiedLandmark } from '@/utils/geometry';

const POSE_CONNECTIONS: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
];

interface LandmarkEditorProps {
    imageUrl: string;
    landmarks: UnifiedLandmark[];
    onLandmarksChange: (normalizedLandmarks: UnifiedLandmark[]) => void;
    editable: boolean;
    imageWidth?: number;
    imageHeight?: number;
}

const LandmarkEditor: React.FC<LandmarkEditorProps> = ({ imageUrl, landmarks, onLandmarksChange, editable }) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Load image to get dimensions
    useEffect(() => {
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => {
            setImage(img);
            // Limit max display size? or standard fit?
            // For analysis, we usually want max width but reasonable.
            // Let's rely on parent container sizing, but Stage needs px values.
            // We'll scale to 600px width maybe?
            const maxWidth = 600;
            const ratio = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;

            setDimensions({
                width: img.naturalWidth * ratio,
                height: img.naturalHeight * ratio
            });
        };
    }, [imageUrl]);

    const handleDragMove = (index: number, e: { target: { position: () => { x: number; y: number } } }) => {
        if (!editable) return;

        // const stage = e.target.getStage();
        const pos = e.target.position();

        const newX = pos.x / dimensions.width;
        const newY = pos.y / dimensions.height;

        const newLandmarks = [...landmarks];
        newLandmarks[index] = { ...newLandmarks[index], x: newX, y: newY };
        onLandmarksChange(newLandmarks);
    };

    if (!image) return <div>Loading...</div>;

    return (
        <Stage width={dimensions.width} height={dimensions.height}>
            <Layer>
                <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />

                {/* Connections */}
                {landmarks.length >= 33 && POSE_CONNECTIONS.map(([start, end], i) => {
                    const s = landmarks[start];
                    const e = landmarks[end];
                    if (!s || !e) return null;
                    if ((s.visibility || 1) < 0.5 || (e.visibility || 1) < 0.5) return null;

                    return (
                        <Line
                            key={i}
                            points={[s.x * dimensions.width, s.y * dimensions.height, e.x * dimensions.width, e.y * dimensions.height]}
                            stroke={editable ? "white" : "#0EA5E9"}
                            strokeWidth={2}
                            opacity={0.6}
                        />
                    );
                })}

                {/* Landmarks */}
                {landmarks.map((lm, i) => {
                    // Check visibility
                    if ((lm.visibility || 1) < 0.5 && !editable) return null;

                    return (
                        <Circle
                            key={i}
                            x={lm.x * dimensions.width}
                            y={lm.y * dimensions.height}
                            radius={editable ? 5 : 3}
                            fill={editable ? "#F97316" : "#0EA5E9"} // Orange editable, Blue static
                            stroke="white"
                            strokeWidth={1}
                            draggable={editable}
                            onDragMove={(e) => handleDragMove(i, e)}
                        />
                    );
                })}
            </Layer>
        </Stage>
    );
};

export default LandmarkEditor;
