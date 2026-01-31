import {
    init as csRenderInit,
} from '@cornerstonejs/core';
import {
    init as csToolsInit,
    addTool,
    ToolGroupManager,
    WindowLevelTool,
    PanTool,
    ZoomTool,
    StackScrollMouseWheelTool,
    LengthTool,
    ProbeTool,
    RectangleROITool,
    EllipticalROITool,
    CircleROITool,
    AngleTool,
    MagnifyTool,
} from '@cornerstonejs/tools';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const TOOLS = {
    WindowLevelTool,
    PanTool,
    ZoomTool,
    StackScrollMouseWheelTool,
    LengthTool,
    ProbeTool,
    RectangleROITool,
    EllipticalROITool,
    CircleROITool,
    AngleTool,
    MagnifyTool,
};

let isInitialized = false;

export default async function initCornerstone() {
    if (isInitialized) return;

    // Initialize Cornerstone Render
    await csRenderInit();

    // Initialize Cornerstone Tools
    await csToolsInit();

    // Add tools to Cornerstone3D
    addTool(WindowLevelTool);
    addTool(PanTool);
    addTool(ZoomTool);
    addTool(StackScrollMouseWheelTool);
    addTool(LengthTool);
    addTool(ProbeTool);
    addTool(RectangleROITool);
    addTool(EllipticalROITool);
    addTool(CircleROITool);
    addTool(AngleTool);
    addTool(MagnifyTool);

    isInitialized = true;
    logger.info('Cornerstone3D initialized', undefined, 'initCornerstone');
}

export function createToolGroup(toolGroupId: string) {
    let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

    if (!toolGroup) {
        toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    }

    // Add tools to the tool group
    toolGroup?.addTool(WindowLevelTool.toolName);
    toolGroup?.addTool(PanTool.toolName);
    toolGroup?.addTool(ZoomTool.toolName);
    toolGroup?.addTool(StackScrollMouseWheelTool.toolName);
    toolGroup?.addTool(LengthTool.toolName);
    toolGroup?.addTool(ProbeTool.toolName);
    toolGroup?.addTool(RectangleROITool.toolName);
    toolGroup?.addTool(EllipticalROITool.toolName);
    toolGroup?.addTool(CircleROITool.toolName);
    toolGroup?.addTool(AngleTool.toolName);
    toolGroup?.addTool(MagnifyTool.toolName);

    // Set initial tool state
    toolGroup?.setToolActive(WindowLevelTool.toolName, {
        bindings: [
            {
                mouseButton: 1, // Left Click
            },
        ],
    });

    toolGroup?.setToolActive(PanTool.toolName, {
        bindings: [
            {
                mouseButton: 2, // Middle Click
            },
        ],
    });

    toolGroup?.setToolActive(ZoomTool.toolName, {
        bindings: [
            {
                mouseButton: 3, // Right Click
            },
        ],
    });

    toolGroup?.setToolActive(StackScrollMouseWheelTool.toolName);

    return toolGroup;
}
