import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

    ZoomIn, ZoomOut, Move, Sun, Contrast,
    MousePointer2, Circle, Square, Type, ArrowRight, Save
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import AnnotationLayer from './AnnotationLayer';
import { useAssetAnnotations } from '@/hooks/useAssetAnnotations';

// PDF Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface AssetViewerProps {
    file?: File;
    fileUrl?: string; // For existing assets
    assetId?: string | null; // For Supabase Persistence
}

type Tool = 'select' | 'pan' | 'arrow' | 'circle' | 'rect' | 'text' | 'ruler';

const AssetViewer: React.FC<AssetViewerProps> = ({ file, fileUrl, assetId }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [isPDF, setIsPDF] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Hook for Annotations
    const {
        annotations,
        setAnnotations,
        saveVersion,
        // versions,
        currentVersion,
        // setCurrentVersion
    } = useAssetAnnotations(assetId ?? null);

    useEffect(() => {
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setUrl(objectUrl);
            setIsPDF(file.type === 'application/pdf');
            return () => URL.revokeObjectURL(objectUrl);
        } else if (fileUrl) {
            setUrl(fileUrl);
            setIsPDF(fileUrl.toLowerCase().endsWith('.pdf'));
        }
    }, [file, fileUrl]);

    // Image load handler to set dimensions
    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        setDimensions({ width: target.naturalWidth, height: target.naturalHeight });
    };

    const handleZoom = (delta: number) => {
        setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    // Pan Logic (only active if tool is 'pan')
    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'pan') {
            const startX = e.clientX - position.x;
            const startY = e.clientY - position.y;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                setPosition({
                    x: moveEvent.clientX - startX,
                    y: moveEvent.clientY - startY
                });
            };

            const handleMouseUp = () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
    };

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Toolbar */}
            <Card className="flex items-center p-2 gap-2 overflow-x-auto bg-white border-b">
                <div className="flex items-center gap-1 border-r pr-2">
                    <Button variant={activeTool === 'select' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('select')} title="Selecionar">
                        <MousePointer2 className="w-4 h-4" />
                    </Button>
                    <Button variant={activeTool === 'pan' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('pan')} title="Mover">
                        <Move className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleZoom(0.1)}><ZoomIn className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleZoom(-0.1)}><ZoomOut className="w-4 h-4" /></Button>
                </div>

                <div className="flex items-center gap-1 border-r pr-2">
                    <Button variant={activeTool === 'arrow' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('arrow')}><ArrowRight className="w-4 h-4" /></Button>
                    <Button variant={activeTool === 'circle' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('circle')}><Circle className="w-4 h-4" /></Button>
                    <Button variant={activeTool === 'rect' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('rect')}><Square className="w-4 h-4" /></Button>
                    <Button variant={activeTool === 'text' ? "default" : "ghost"} size="sm" onClick={() => setActiveTool('text')}><Type className="w-4 h-4" /></Button>
                </div>

                <div className="flex items-center gap-2 border-r pr-2 w-48 px-2">
                    <Sun className="w-4 h-4 text-slate-500" />
                    <Slider
                        value={[brightness]}
                        onValueChange={(v) => setBrightness(v[0])}
                        min={50} max={150} step={1}
                        className="w-20"
                    />
                    <Contrast className="w-4 h-4 text-slate-500 ml-2" />
                    <Slider
                        value={[contrast]}
                        onValueChange={(v) => setContrast(v[0])}
                        min={50} max={150} step={1}
                        className="w-20"
                    />
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={saveVersion}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar (v{currentVersion})
                    </Button>
                </div>
            </Card>

            {/* Viewer Area */}
            <div className="flex-1 bg-slate-900 overflow-hidden relative" onMouseDown={handleMouseDown}>
                <div
                    ref={containerRef}
                    className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: activeTool === 'pan' ? 'grab' : 'crosshair'
                    }}
                >
                    {url && (
                        <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
                            {isPDF ? (
                                <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                                    <Page
                                        pageNumber={pageNumber}
                                        width={dimensions.width} // Force width? Or let it render naturally?
                                        onLoadSuccess={(p) => setDimensions({ width: p.width, height: p.height })}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                    />
                                </Document>
                            ) : (
                                <img
                                    src={url}
                                    alt="Asset"
                                    className="max-w-none block"
                                    onLoad={onImageLoad}
                                    style={{
                                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                                        pointerEvents: 'none' // Let events fall through to Konva? No, we need Konva ON TOP.
                                    }}
                                />
                            )}

                            {/* Annotation Layer Overlay */}
                            <AnnotationLayer
                                width={dimensions.width}
                                height={dimensions.height}
                                scale={1} // The Layer itself is scaled by the parent container CSS
                                annotations={annotations}
                                onAnnotationsChange={setAnnotations}
                                activeTool={activeTool}
                            />
                        </div>
                    )}
                </div>

                {/* PDF Pagination Overlay */}
                {isPDF && numPages && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full flex gap-4 items-center">
                        <Button variant="ghost" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>{'<'}</Button>
                        <span>Using Page {pageNumber} of {numPages}</span>
                        <Button variant="ghost" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}>{'>'}</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetViewer;
