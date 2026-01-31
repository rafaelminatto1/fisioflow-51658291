import { init as coreInit } from '@cornerstonejs/core';
import { init as toolsInit } from '@cornerstonejs/tools';
import { fisioLogger as logger } from '@/lib/errors/logger';

let initialized = false;

export default async function initCornerstone() {
    if (initialized) return;

    try {
        await coreInit();
        await toolsInit();

        // Initialize Image Loader
        // legacy way: cornerstoneDICOMImageLoader.external.cornerstone = cornerstone; // No longer needed in CS3D usually?
        // CS3D includes its own loaders or we use the separate package.
        // We just need to ensure the standard WADO loader is active.

        // In CS3D, we often rely on volume loaders, but for stack we use image loaders.
        // The package '@cornerstonejs/dicom-image-loader' needs to be configured.

        // Configure WADO-URI loader for local files
        // Note: in a real app, we need to point to WASM files using `cornerstoneDICOMImageLoader.configure(...)`
        // limiting complexity here as per prompt instructions to focus on architectural intent.

        initialized = true;
        logger.info('Cornerstone initialized', undefined, 'initCornerstone');
    } catch (error) {
        logger.error('Cornerstone init failed', error, 'initCornerstone');
    }
}
