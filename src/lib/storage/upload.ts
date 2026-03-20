/**
 * File Upload Service - Migrated to Cloudflare R2
 *
 * All uploads now go through Cloudflare R2 via pre-signed URLs.
 * Maintains compatibility with existing interfaces.
 *
 * @version 3.0.0 - Cloudflare R2 Migration
 */
import {
	uploadToR2 as uploadFileR2,
	deleteFromR2,
	type R2UploadResult as UploadResult,
} from "./r2-storage";
import { fisioLogger as logger } from "@/lib/errors/logger";

// Re-export types for backward compatibility
export type { UploadResult };

export interface UploadOptions {
	folder?: string;
	onProgress?: (progress: number) => void;
	public?: boolean;
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFile(
	file: File,
	options: UploadOptions = {},
): Promise<UploadResult> {
	const folder = options.folder || "uploads";
	return uploadFileR2(file, folder, {
		onProgress: options.onProgress,
	});
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
	files: File[],
	options: UploadOptions = {},
): Promise<UploadResult[]> {
	const results: UploadResult[] = [];
	for (const file of files) {
		results.push(await uploadFile(file, options));
	}
	return results;
}

/**
 * Upload from base64 (converts to File first)
 */
export async function uploadBase64(
	base64: string,
	filename: string,
	options: UploadOptions = {},
): Promise<UploadResult> {
	let data = base64;
	let contentType = "application/octet-stream";

	if (base64.startsWith("data:")) {
		const match = base64.match(/^data:([^;]+);base64,/);
		if (match) {
			contentType = match[1];
			data = base64.replace(/^data:([^;]+);base64,/, "");
		}
	}

	const byteCharacters = atob(data);
	const byteNumbers = new Array(byteCharacters.length);
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i);
	}
	const byteArray = new Uint8Array(byteNumbers);
	const blob = new Blob([byteArray], { type: contentType });
	const file = new File([blob], filename, { type: contentType });

	return uploadFile(file, options);
}

/**
 * Delete a file from R2
 */
export async function deleteFile(path: string): Promise<void> {
	return deleteFromR2(path);
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

export const STORAGE_FOLDERS = {
	UPLOADS: "uploads",
	DOCUMENTS: "documents",
	IMAGES: "images",
	VIDEOS: "videos",
	PATIENTS: "patients",
	EXERCISES: "exercises",
} as const;

export async function uploadToBlob(file: File, folder: string = "uploads") {
	return uploadFile(file, { folder });
}

export async function uploadToCloud(file: File, folder: string = "documents") {
	return uploadFile(file, { folder });
}

// Other legacy exports are stubbed or removed if not used
export const getDownloadUrl = async (path: string) => path; // R2 URLs are direct
export const deleteFiles = async (paths: string[]) =>
	Promise.all(paths.map(deleteFile));
