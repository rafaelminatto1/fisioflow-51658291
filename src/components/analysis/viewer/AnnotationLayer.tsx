

// Helper function to generate UUID - using crypto.randomUUID() to avoid "ne is not a function" error in production

import { useState } from 'react';
import { Arrow, Circle, Layer, Rect, Stage, Text } from 'react-konva';
import { Annotation } from '@/hooks/useAssetAnnotations';

const uuidv4 = (): string => crypto.randomUUID();

interface AnnotationLayerProps {
    width: number;
    height: number;
    scale: number;
    annotations: Annotation[];
    onAnnotationsChange: (newAnnotations: Annotation[]) => void;
    activeTool: 'select' | 'pan' | 'arrow' | 'circle' | 'rect' | 'text' | 'ruler';
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    width,
    height,
    scale,
    annotations,
    onAnnotationsChange,
    activeTool
}) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [newAnnotation, setNewAnnotation] = useState<Annotation | null>(null);


    const handleMouseDown = (e: { target: { getStage: () => unknown } }) => {  
        if (activeTool === 'select' || activeTool === 'pan') return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        // Adjust for stage scale/position if necessary (but here we assume overlay matches image)
        // Actually we need to account for the zoom scale passed as prop if we are transforming the container, 
        // OR if we are transforming the Stage. 
        // In AssetViewer, we usually transform the Container (CSS). 
        // If so, Konva receives relative coordinates? 
        // Let's assume the Stage fills the Viewer and the viewer handles Zoom via CSS.
        // So coordinates are "screen" coordinates relative to the container.
        // We need "image" coordinates. 
        // If the Stage uses width/height of the image * scale, then we need to divide by scale.
        // BUT usually simpler: Viewer scales the div containing Image AND Stage. 
        // So Stage width = Image original width.

        const x = point.x / scale;
        const y = point.y / scale;

        const id = uuidv4();

        setIsDrawing(true);

        let ann: Annotation;

        switch (activeTool) {
            case 'arrow':
                ann = { id, type: 'arrow', x: 0, y: 0, points: [x, y, x, y], stroke: 'red', strokeWidth: 4 };
                break;
            case 'circle':
                ann = { id, type: 'circle', x: x, y: y, radius: 1, stroke: 'red', strokeWidth: 4 };
                break;
            case 'rect':
                ann = { id, type: 'rect', x: x, y: y, width: 1, height: 1, stroke: 'red', strokeWidth: 4 };
                break;
            case 'text': {
                const text = prompt("Digite o texto:");
                if (text) {
                    ann = { id, type: 'text', x, y, text, fontSize: 24, fill: 'red' };
                    onAnnotationsChange([...annotations, ann]);
                }
                setIsDrawing(false);
                return;
            }
            default:
                return;
        }

        setNewAnnotation(ann);
    };

    const handleMouseMove = (e: { target: { getStage: () => unknown } }) => {  
        if (!isDrawing || !newAnnotation) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        const x = point.x / scale;
        const y = point.y / scale;

        if (newAnnotation.type === 'arrow') {
            setNewAnnotation({
                ...newAnnotation,
                points: [newAnnotation.points![0], newAnnotation.points![1], x, y]
            });
        } else if (newAnnotation.type === 'circle') {
            const dx = x - newAnnotation.x;
            const dy = y - newAnnotation.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            setNewAnnotation({ ...newAnnotation, radius });
        } else if (newAnnotation.type === 'rect') {
            setNewAnnotation({
                ...newAnnotation,
                width: x - newAnnotation.x,
                height: y - newAnnotation.y
            });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && newAnnotation) {
            onAnnotationsChange([...annotations, newAnnotation]);
            setNewAnnotation(null);
            setIsDrawing(false);
        }
    };

    return (
        <Stage
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: activeTool === 'select' ? 'none' : 'auto' }}
        >
            <Layer>
                {annotations.map((ann) => {
                    if (ann.type === 'arrow') {
                        return <Arrow key={ann.id} points={ann.points || []} stroke={ann.stroke} strokeWidth={ann.strokeWidth || 4} />;
                    } else if (ann.type === 'circle') {
                        return <Circle key={ann.id} x={ann.x} y={ann.y} radius={ann.radius} stroke={ann.stroke} strokeWidth={ann.strokeWidth || 4} />;
                    } else if (ann.type === 'rect') {
                        return <Rect key={ann.id} x={ann.x} y={ann.y} width={ann.width} height={ann.height} stroke={ann.stroke} strokeWidth={ann.strokeWidth || 4} />;
                    } else if (ann.type === 'text') {
                        return <Text key={ann.id} x={ann.x} y={ann.y} text={ann.text} fontSize={ann.fontSize || 24} fill={ann.fill} />;
                    }
                    return null;
                })}

                {newAnnotation && (
                    newAnnotation.type === 'arrow' ? <Arrow points={newAnnotation.points || []} stroke="red" strokeWidth={4} /> :
                        newAnnotation.type === 'circle' ? <Circle x={newAnnotation.x} y={newAnnotation.y} radius={newAnnotation.radius} stroke="red" strokeWidth={4} /> :
                            newAnnotation.type === 'rect' ? <Rect x={newAnnotation.x} y={newAnnotation.y} width={newAnnotation.width} height={newAnnotation.height} stroke="red" strokeWidth={4} /> : null
                )}
            </Layer>
        </Stage>
    );
};

export default AnnotationLayer;
