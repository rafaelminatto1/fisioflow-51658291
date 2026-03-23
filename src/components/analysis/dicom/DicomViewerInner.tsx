/**
 * DicomViewerInner - Componente interno com implementação do Cornerstone
 * Este arquivo contém as importações pesadas do Cornerstone.js
 * É carregado sob demanda pelo DicomViewer
 */

import React, { useEffect, useRef, useState } from "react";
import type { RenderingEngine, StackViewport } from "@cornerstonejs/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler, MousePointer2, ZoomIn, Move } from "lucide-react";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { dicomWebClient } from "@/services/dicom/dicomWebClient";
import { loadCornerstoneRuntime } from "./cornerstoneRuntime";
import { trackTransferSyntax } from "./transferSyntaxTracker";

interface DicomViewerProps {
	file?: File;
	studyInstanceUid?: string;
	seriesInstanceUid?: string;
	wadoUrl?: string;
}

const VIEWPORT_ID = "DICOM_VIEWPORT_ID";
const TOOL_GROUP_ID = "DICOM_TOOL_GROUP_ID";
const RENDERING_ENGINE_ID = "DICOM_RENDERING_ENGINE_ID";

type CornerstoneRuntime = Awaited<ReturnType<typeof loadCornerstoneRuntime>>;

/**
 * Componente interno do DicomViewer
 * Contém toda a lógica do Cornerstone.js
 * Carregado via lazy loading pelo DicomViewer
 */
export const DicomViewerInner: React.FC<DicomViewerProps> = ({
	file,
	studyInstanceUid,
	seriesInstanceUid,
	wadoUrl,
}) => {
	const elementRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<RenderingEngine | null>(null);
	const runtimeRef = useRef<CornerstoneRuntime | null>(null);
	const [activeTool, setActiveTool] = useState<string>("Length");
	const [isCornerstoneInitialized, setIsCornerstoneInitialized] =
		useState(false);
	const [viewerMessage, setViewerMessage] = useState<string | null>(
		file || (studyInstanceUid && seriesInstanceUid)
			? "Carregando imagens DICOM..."
			: "Selecione um estudo remoto ou arraste um arquivo DICOM para visualizar",
	);

	// Initialize Cornerstone and Tools
	useEffect(() => {
		const setup = async () => {
			const runtime = await loadCornerstoneRuntime();
			runtimeRef.current = runtime;
			await runtime.initCornerstone();
			const { tools } = runtime;

			try {
				tools.addTool(tools.PanTool);
				tools.addTool(tools.ZoomTool);
				tools.addTool(tools.LengthTool);
				tools.addTool(tools.ProbeTool);
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
			if (!elementRef.current || !runtimeRef.current) return;
			const { core, tools } = runtimeRef.current;

			const existingEngine = core.getRenderingEngine(RENDERING_ENGINE_ID);
			if (existingEngine) {
				existingEngine.destroy();
			}

			renderingEngine = new core.RenderingEngine(RENDERING_ENGINE_ID);
			engineRef.current = renderingEngine;

			const viewportInput = {
				viewportId: VIEWPORT_ID,
				element: elementRef.current,
				type: core.Enums.ViewportType.STACK,
			};

			renderingEngine.enableElement(viewportInput);

			// Setup ToolGroup
			let toolGroup = tools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
			if (toolGroup) {
				tools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
			}
			toolGroup = tools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

			if (toolGroup) {
				toolGroup.addTool(tools.PanTool.toolName);
				toolGroup.addTool(tools.ZoomTool.toolName);
				toolGroup.addTool(tools.LengthTool.toolName);
				toolGroup.addTool(tools.ProbeTool.toolName);

				toolGroup.setToolActive(tools.LengthTool.toolName, {
					bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
				});
				toolGroup.setToolActive(tools.PanTool.toolName, {
					bindings: [{ mouseButton: tools.Enums.MouseBindings.Auxiliary }],
				});
				toolGroup.setToolActive(tools.ZoomTool.toolName, {
					bindings: [{ mouseButton: tools.Enums.MouseBindings.Secondary }],
				});

				toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
			}

			// LOAD IMAGE IDS
			let imageIds: string[] = [];

			if (file) {
				try {
					const { extractTransferSyntaxFromFile } = await import(
						"./extractTransferSyntax"
					);
					const syntax = await extractTransferSyntaxFromFile(file);
					trackTransferSyntax(syntax);
				} catch (error) {
					logger.warn(
						"Falha ao extrair Transfer Syntax do arquivo DICOM local",
						error,
						"DicomViewerInner",
					);
				}
				const imageId = runtimeRef.current.dicomImageLoader.wadouri.fileManager.add(
					file,
				);
				imageIds = [imageId];
			} else if (studyInstanceUid && seriesInstanceUid && wadoUrl) {
				try {
					const instances = await dicomWebClient.getInstances(
						studyInstanceUid,
						seriesInstanceUid,
					);
					if (instances) {
						const baseUrl = wadoUrl;
						imageIds = instances.map((inst) => {
							const sopUid = inst["00080018"]?.Value?.[0];
							const dicomWebPath = `studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopUid}/frames/1`;
							return `wadors:${baseUrl}?path=${encodeURIComponent(dicomWebPath)}`;
						});
					}
				} catch (e) {
					setViewerMessage("Falha ao carregar série DICOM remota.");
					logger.error("WADO Init Error", e, "DicomViewerInner");
				}
			}

			if (imageIds.length > 0) {
				const viewport = renderingEngine.getViewport(
					VIEWPORT_ID,
				) as StackViewport;
				await viewport.setStack(imageIds);
				viewport.render();
				setViewerMessage(null);
			} else if (!file && !(studyInstanceUid && seriesInstanceUid)) {
				setViewerMessage(
					"Selecione um estudo remoto ou arraste um arquivo DICOM para visualizar",
				);
			} else {
				setViewerMessage("Nenhuma imagem DICOM encontrada para exibição.");
			}
		};

		setupViewer();

		return () => {
			try {
				if (file && runtimeRef.current) {
					runtimeRef.current.dicomImageLoader.wadouri.fileManager.purge();
				}
				if (engineRef.current) {
					engineRef.current.destroy();
				}
				const tg = runtimeRef.current?.tools.ToolGroupManager.getToolGroup(
					TOOL_GROUP_ID,
				);
				if (tg) {
					runtimeRef.current?.tools.ToolGroupManager.destroyToolGroup(
						TOOL_GROUP_ID,
					);
				}
			} catch {
				/* ignore cleanup errors */
			}
		};
	}, [
		file,
		studyInstanceUid,
		seriesInstanceUid,
		wadoUrl,
		isCornerstoneInitialized,
	]);

	// Activate tool helper
	const activateTool = (toolName: string) => {
		const runtime = runtimeRef.current;
		if (!runtime) return;
		const toolGroup = runtime.tools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
		if (!toolGroup) return;

		const primaryTools = [
			runtime.tools.LengthTool.toolName,
			runtime.tools.ProbeTool.toolName,
		];

		primaryTools.forEach((t) => {
			toolGroup.setToolPassive(t);
		});

		toolGroup.setToolActive(toolName, {
			bindings: [{ mouseButton: runtime.tools.Enums.MouseBindings.Primary }],
		});
		setActiveTool(toolName);
	};

	return (
		<Card className="flex flex-col w-full h-full bg-black">
			<div className="flex gap-2 p-2 bg-slate-800 border-b border-slate-700">
				<Button
					variant={
						activeTool === runtimeRef.current?.tools.LengthTool.toolName
							? "default"
							: "ghost"
					}
					size="sm"
					onClick={() =>
						runtimeRef.current &&
						activateTool(runtimeRef.current.tools.LengthTool.toolName)
					}
				>
					<Ruler className="w-4 h-4 mr-2" /> Medir
				</Button>
				<Button
					variant={
						activeTool === runtimeRef.current?.tools.ProbeTool.toolName
							? "default"
							: "ghost"
					}
					size="sm"
					onClick={() =>
						runtimeRef.current &&
						activateTool(runtimeRef.current.tools.ProbeTool.toolName)
					}
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
				onContextMenu={(e) => e.preventDefault()}
			>
				{viewerMessage && (
					<div className="absolute inset-0 flex items-center justify-center text-slate-500">
						{viewerMessage}
					</div>
				)}
			</div>
		</Card>
	);
};

export default DicomViewerInner;
