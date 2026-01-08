import React, { useEffect, useRef, useState } from 'react';
import {
    RenderingEngine,
    Enums,
    StackViewport,
    getRenderingEngine,
} from '@cornerstonejs/core';
import {
    ToolGroupManager,
    StackScrollTool,
    PanTool,
    ZoomTool,
    LengthTool,
    AngleTool,
    CobbAngleTool,
    ProbeTool,
    addTool,
    Enums as ToolEnums,
} from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstone from '@cornerstonejs/core'; // Import cornerstone for external injection
import initCornerstone from './initCornerstone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ruler, MousePointer2, ZoomIn, Activity, Move } from 'lucide-react';

interface DicomViewerProps {
    file?: File; // Local mode
    studyInstanceUid?: string; // WADO-RS mode
    seriesInstanceUid?: string;
    wadoUrl?: string; // Base URL for WADO-RS Proxy
}

const VIEWPORT_ID = 'DICOM_VIEWPORT_ID';
const TOOL_GROUP_ID = 'DICOM_TOOL_GROUP_ID';
const RENDERING_ENGINE_ID = 'DICOM_RENDERING_ENGINE_ID';

const DicomViewer: React.FC<DicomViewerProps> = ({ file, studyInstanceUid, seriesInstanceUid, wadoUrl }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<RenderingEngine | null>(null);
    const [activeTool, setActiveTool] = useState<string>('Length');
    const [isCornerstoneInitialized, setIsCornerstoneInitialized] = useState(false); // Renamed for clarity

    // 1. Initialize Cornerstone and Tools (Once)
    useEffect(() => {
        const setup = async () => {
            await initCornerstone();

            // Add Tools if not added
            // We wrap in try-catch or check existence usually, but addTool is idempotent-ish or we assume fresh load
            try {
                // Check if tool exists to avoid error? 
                // Cornerstone addTool might throw if already added.
                // We'll rely on try/catch
                addTool(StackScrollTool);
                addTool(PanTool);
                addTool(ZoomTool);
                addTool(LengthTool);
                addTool(AngleTool);
                addTool(CobbAngleTool);
                addTool(ProbeTool);
            } catch (e) {
                // Tools might be already added
            }

            setIsCornerstoneInitialized(true);
        };

        setup();
    }, []);

    // -- INIT CORNERSTONE LOADERS --
    // We assume initCornerstone() does basic init.
    // We need to configure WADO-RS loader if wadoUrl is present.
    useEffect(() => {
        if (wadoUrl) {
            // Fix: external property usage
            // The types for dicom-image-loader might mismatch or require different access.
            // Usually: cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
            // If TS complains, we can cast to any or check the import structure.
            // It is likely `cornerstoneDICOMImageLoader.external` exists at runtime.
            (cornerstoneDICOMImageLoader as any).external.cornerstone = cornerstone;

            // Configure WADO-RS
            // The wado-rs loader usually needs a request modifier to add headers (Authorization)
            // For Auth, we might need to append keys or headers.
            // Since we use a Proxy Function, standard auth headers (if cookie based) or query param might be needed.
            // Our Proxy (Edge Function) requires Authorization header if using RLS.
            // But actually we are calling via `dicom-proxy` function URL.
            // How do we inject Auth header into cornerstone loader?
            // cornerstoneDICOMImageLoader.configure({
            //    beforeSend: function(xhr) {
            //        // Add custom headers here (e.g. Supabase session token)
            //    }
            // });
            // For MVP local dev without auth on proxy, we skip.

            // Actually, the wadors loader uses standard fetch or xhr.
        }
    }, [wadoUrl]);

    // 2. Setup Rendering Engine & Viewport and Load Data
    useEffect(() => {
        if (!isCornerstoneInitialized || !elementRef.current) return;

        let renderingEngine: RenderingEngine | null = null;

        const setupViewer = async () => {
            if (!elementRef.current) return;

            // Clean up existing engine if any (Strict Mode double mount)
            const existingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
            if (existingEngine) {
                existingEngine.destroy();
            }

            renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
            engineRef.current = renderingEngine;

            const viewportInput = {
                viewportId: VIEWPORT_ID,
                element: elementRef.current,
                type: Enums.ViewportType.STACK,
            };

            renderingEngine.enableElement(viewportInput);
            const viewport = renderingEngine.getViewport(VIEWPORT_ID) as StackViewport;

            // Setup ToolGroup
            let toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
            if (toolGroup) {
                ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
            }
            toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

            if (toolGroup) {
                toolGroup.addTool(StackScrollTool.toolName);
                toolGroup.addTool(PanTool.toolName);
                toolGroup.addTool(ZoomTool.toolName);
                toolGroup.addTool(LengthTool.toolName);
                toolGroup.addTool(AngleTool.toolName);
                toolGroup.addTool(CobbAngleTool.toolName);
                toolGroup.addTool(ProbeTool.toolName);

                toolGroup.setToolActive(StackScrollTool.toolName);
                toolGroup.setToolActive(LengthTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }], // Right Click usually, but Aux is middle? Setup Right.
                });
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }], // Right Click
                });

                // Set default tool
                toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
            }

            // LOAD IMAGE IDS
            let imageIds: string[] = [];

            if (file) {
                // Local File Mode
                const imageId = await cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
                imageIds = [imageId];
            } else if (studyInstanceUid && seriesInstanceUid && wadoUrl) {
                // WADO-RS Mode
                // We need to fetch the instance list first via QIDO-RS (Proxy)
                // Then construct WADO-RS imageIds
                try {
                    // 1. Get Instances for Series
                    const { supabase } = await import('@/integrations/supabase/client');
                    const path = `studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`;
                    // Fix: Pass path in x-dicom-path header to avoid Supabase invoke URL limits
                    const { data: instances, error } = await supabase.functions.invoke('dicom-proxy', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/dicom+json',
                            'x-dicom-path': path
                        }
                    });

                    if (error) {
                        throw error;
                    }

                    // 2. Construct ImageIDs
                    if (instances && instances.length > 0) {
                        const baseUrl = wadoUrl; // https://.../dicom-proxy
                        imageIds = instances.map((inst: any) => {
                            const sopUid = inst['00080018']?.Value?.[0]; // SOPInstanceUID
                            const dicomWebPath = `studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopUid}/frames/1`;

                            // For local proxy, we use query param 'path' if using simple GET/WADO-URI style
                            // BUT our proxy logic now expects header or query.
                            // Since WADOURI Loader puts everything in URL, we MUST support query param in PROXY for WADO requests.
                            // We will update proxy to support BOTH header (for API calls) and query param (for WADO loader).
                            return `wadors:${baseUrl}?path=${encodeURIComponent(dicomWebPath)}`;
                        });
                    }
                } catch (e) {
                    console.error("WADO Init Error", e);
                }
            }

            if (imageIds.length > 0) {
                const viewport = renderingEngine.getViewport(VIEWPORT_ID) as StackViewport; // Cast for safety
                await viewport.setStack(imageIds);
                viewport.render();
            }
        };

        setupViewer();

        return () => {
            // cleanup
            try {
                if (engineRef.current) {
                    engineRef.current.destroy();
                }
                const tg = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
                if (tg) {
                    ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
                }
            } catch (e) { console.error(e) }
        };
    }, [file, studyInstanceUid, seriesInstanceUid, wadoUrl, isCornerstoneInitialized]);

    // 3. Load File
    useEffect(() => {
        if (!file || !engineRef.current) return;

        const loadFile = async () => {
            try {
                // WADO-URI Manager
                const imageId = await cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);

                const viewport = engineRef.current?.getViewport(VIEWPORT_ID) as StackViewport;
                if (viewport) {
                    await viewport.setStack([imageId]);
                    viewport.render();
                }
            } catch (err) {
                console.error("Error loading DICOM:", err);
            }
        };

        loadFile();
    }, [file, isCornerstoneInitialized]);

    // 4. Toolbar Helpers
    const activateTool = (toolName: string, binding: string = 'Primary') => {
        const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
        if (!toolGroup) return;

        // Deactivate current primary tool
        // toolGroup.setToolPassive(activeTool); // Or just set new one active?
        // Best to disable previously active Primary tool to avoid conflict if both use Left Click

        const primaryTools = [LengthTool.toolName, AngleTool.toolName, CobbAngleTool.toolName, ProbeTool.toolName, 'Eraser'];

        primaryTools.forEach(t => {
            toolGroup.setToolPassive(t);
        });

        toolGroup.setToolActive(toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }]
        });
        setActiveTool(toolName);
    };

    return (
        <Card className="flex flex-col w-full h-full bg-black">
            <div className="flex gap-2 p-2 bg-slate-800 border-b border-slate-700">
                <Button
                    variant={activeTool === LengthTool.toolName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTool(LengthTool.toolName)}
                >
                    <Ruler className="w-4 h-4 mr-2" /> Medir (Régua)
                </Button>
                <Button
                    variant={activeTool === AngleTool.toolName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTool(AngleTool.toolName)}
                >
                    <Activity className="w-4 h-4 mr-2" /> Ângulo
                </Button>
                <Button
                    variant={activeTool === CobbAngleTool.toolName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTool(CobbAngleTool.toolName)}
                >
                    <Activity className="w-4 h-4 mr-2" /> Cobb (Escoliose)
                </Button>
                <Button
                    variant={activeTool === ProbeTool.toolName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTool(ProbeTool.toolName)}
                >
                    <MousePointer2 className="w-4 h-4 mr-2" /> Probe (HU)
                </Button>
                <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" title="Pan: Scroll Click / Right Click">
                        <Move className="w-4 h-4" /> Pan
                    </Button>
                    <Button variant="ghost" size="sm" title="Zoom: Right Click">
                        <ZoomIn className="w-4 h-4" /> Zoom
                    </Button>
                </div>
            </div>

            <div
                ref={elementRef}
                className="flex-1 w-full h-[500px] bg-black relative"
                onContextMenu={e => e.preventDefault()}
            >
                {!file && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Arraste um arquivo DICOM para visualizar
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DicomViewer;
