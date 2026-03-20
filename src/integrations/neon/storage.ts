/**
 * Storage compatibility bridge.
 *
 * Leituras/escritas novas usam R2. Este módulo mantém a API antiga sem
 * carregar storage legado no bundle.
 */
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import { resolvePublicStorageUrl } from "@/lib/storage/public-url";

type StorageRef = { fullPath: string };

export const getStorageProvider = () => ({ provider: "r2" }) as const;

export const ref = (_storage: unknown, path: string): StorageRef => ({
	fullPath: path,
});

export async function getDownloadURL(storageRef: StorageRef): Promise<string> {
	return resolvePublicStorageUrl(storageRef.fullPath);
}

export async function listAll(): Promise<{
	items: StorageRef[];
	prefixes: StorageRef[];
}> {
	return { items: [], prefixes: [] };
}

export async function uploadFile(
	path: string,
	file: File | Blob,
): Promise<string> {
	const parts = path.split("/");
	const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "uploads";
	const fileObj =
		file instanceof File ? file : new File([file], parts.at(-1) ?? "file");
	const result = await uploadToR2(fileObj, folder);
	return result.url;
}

export async function deleteFile(path: string): Promise<void> {
	await deleteFromR2(path);
}

export async function getFileUrl(path: string): Promise<string> {
	return resolvePublicStorageUrl(path);
}
