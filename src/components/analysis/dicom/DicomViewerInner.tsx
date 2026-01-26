/**
 * DicomViewerInner - Componente interno com implementação do Cornerstone
 * Este arquivo contém as importações pesadas do Cornerstone.js
 * É carregado sob demanda pelo DicomViewer
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    RenderingEngine,
    Enums,
    StackViewport,
    getRenderingEngine,
} from '@cornerstonejs/core';
import { getFirebaseFunctions } from '@/integrations/firebase/app';
import { httpsCallable } from 'firebase/functions';
import {
    ToolGroupManager,
    PanTool,
    ZoomTool,
    LengthTool,
    ProbeTool,
    addTool,
    Enums as ToolEnums,
} from '@cornerstonejs/tools';
import initCornerstone from './initCornerstone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ruler, MousePointer2, ZoomIn, Move } from 'lucide-react';

interface DicomViewerProps {
    file?: File;
    studyInstanceUid?: string;
    seriesInstanceUid?: string;
    wadoUrl?: string;
}

const VIEWPORT_ID = 'DICOM_VIEWPORT_ID';
const TOOL_GROUP_ID = 'DICOM_TOOL_GROUP_ID';
const RENDERING_ENGINE_ID = 'DICOM_RENDERING_ENGINE_ID';

/**
 * Componente interno do DicomViewer
 * Contém toda a lógica do Cornerstone.js
 * Carregado via lazy loading pelo DicomViewer
 */
export const DicomViewerInner: React.FC<DicomViewerProps> = ({
    file,
    studyInstanceUid,
    seriesInstanceUid,
    wadoUrl
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<RenderingEngine | null>(null);
    const [activeTool, setActiveTool] = useState<string>('Length');
    const [isCornerstoneInitialized, setIsCornerstoneInitialized] = useState(false);

    // Initialize Cornerstone and Tools
    useEffect(() => {
        const setup = async () => {
            await initCornerstone();

            try {
                addTool(PanTool);
                addTool(ZoomTool);
                addTool(LengthTool);
                addTool(ProbeTool);
            } catch {
                // Tools might be already added
            }

            setIsCornerstoneInitialized(true);
        };

        setup();
    }, []);

    // Setup Rendering Engine & Viewport
    useEffect(() => {
        if (!isCornerstoneInitialized || !elementRef.current) return;

        let renderingEngine: RenderingEngine | null = null;

        const setupViewer = async () => {
            if (!elementRef.current) return;

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

            // Setup ToolGroup
            let toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
            if (toolGroup) {
                ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
            }
            toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

            if (toolGroup) {
                toolGroup.addTool(PanTool.toolName);
                toolGroup.addTool(ZoomTool.toolName);
                toolGroup.addTool(LengthTool.toolName);
                toolGroup.addTool(ProbeTool.toolName);

                toolGroup.setToolActive(LengthTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
                });
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
                });

                toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
            }

            // LOAD IMAGE IDS
            let imageIds: string[] = [];

            if (file) {
                // Local File Mode - placeholder for implementation
                console.warn("DICOM Loader disabled for build verification");
            } else if (studyInstanceUid && seriesInstanceUid && wadoUrl) {
                try {
                    const functions = getFirebaseFunctions();
                    const dicomProxyFunction = httpsCallable(functions, 'dicom-proxy');

                    const path = `studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`;
                    const result = await dicomProxyFunction({
                        method: 'GET',
                        headers: {
                            'Accept': 'application/dicom+json',
                            'x-dicom-path': path
                        }
                    });

                    if (result.data) {
                        const instances = result.data as Array<Record<string, { Value?: string[] }>>;
                        const baseUrl = wadoUrl;
                        imageIds = instances.map((inst) => {
                            const sopUid = inst['00080018']?.Value?.[0];
                            const dicomWebPath = `studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopUid}/frames/1`;
                            return `wadors:${baseUrl}?path=${encodeURIComponent(dicomWebPath)}`;
                        });
                    }
                } catch (e) {
                    console.error("WADO Init Error", e);
                }
            }

            if (imageIds.length > 0) {
                const viewport = renderingEngine.getViewport(VIEWPORT_ID) as StackViewport;
                await viewport.setStack(imageIds);
                viewport.render();
            }
        };

        setupViewer();

        return () => {
            try {
                if (engineRef.current) {
                    engineRef.current.destroy();
                }
                const tg = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
                if (tg) {
                    ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
                }
            } catch { /* ignore cleanup errors */ }
        };
    }, [file, studyInstanceUid, seriesInstanceUid, wadoUrl, isCornerstoneInitialized]);

    // Activate tool helper
    const activateTool = (toolName: string) => {
        const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
        if (!toolGroup) return;

        const primaryTools = [LengthTool.toolName, ProbeTool.toolName];

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
                    <Ruler className="w-4 h-4 mr-2" /> Medir
                </Button>
                <Button
                    variant={activeTool === ProbeTool.toolName ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTool(ProbeTool.toolName)}
                >
                    <MousePointer2 className="w-4 h-4 mr-2" /> Probe
                </Button>
                <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" title="Pan">
                        <Move className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Zoom">
                        <ZoomIn className="w-4 h-4" />
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

export default DicomViewerInner;
