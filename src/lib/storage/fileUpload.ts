import { uploadToR2, deleteFromR2 } from "./r2-storage";

export type StorageBucket =
	| "avatars"
	| "comprovantes"
	| "prontuarios"
	| "evolucao";

export interface UploadOptions {
	bucket: StorageBucket;
	folder?: string;
	maxSize?: number;
	allowedTypes?: string[];
	onProgress?: (progress: number) => void;
}

export interface UploadResult {
	url: string;
	path: string;
	fullPath: string;
}

const BUCKET_LIMITS = {
	avatars: {
		maxSize: 2 * 1024 * 1024,
		allowedTypes: ["image/jpeg", "image/png", "image/webp"],
	},
	comprovantes: {
		maxSize: 5 * 1024 * 1024,
		allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
	},
	prontuarios: {
		maxSize: 10 * 1024 * 1024,
		allowedTypes: [
			"image/jpeg",
			"image/png",
			"image/webp",
			"application/pdf",
			"video/mp4",
			"video/quicktime",
		],
	},
	evolucao: {
		maxSize: 10 * 1024 * 1024,
		allowedTypes: ["image/jpeg", "image/png", "image/webp"],
	},
};

export async function uploadFile(
	file: File,
	options: UploadOptions,
): Promise<UploadResult> {
	const bucketLimits = BUCKET_LIMITS[options.bucket];

	// Validate file size
	const maxSize = options.maxSize || bucketLimits.maxSize;
	if (file.size > maxSize) {
		throw new Error(
			`Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
		);
	}

	// Validate file type
	const allowedTypes = options.allowedTypes || bucketLimits.allowedTypes;
	if (!allowedTypes.includes(file.type)) {
		throw new Error(
			`Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`,
		);
	}

	// O Worker já anexa userId no key; aqui enviamos apenas uma pasta lógica segura.
	const logicalFolderBase =
		options.bucket === "avatars"
			? "avatars"
			: `${options.bucket}_${options.folder || "geral"}`;
	const folder = logicalFolderBase.replace(/[^a-zA-Z0-9_-]/g, "_");

	const { url, path } = await uploadToR2(file, folder, {
		onProgress: (progress) => {
			if (options.onProgress) options.onProgress(progress);
		},
	});

	return {
		url,
		path,
		fullPath: path,
	};
}

export async function deleteFile(
	_bucket: StorageBucket,
	path: string,
): Promise<void> {
	await deleteFromR2(path);
}

/**
 * Get a temporary access URL.
 * R2 public URLs are returned by default.
 */
export async function getSignedUrl(
	_bucket: StorageBucket,
	path: string,
	_expiresIn: number = 3600,
): Promise<string> {
	// If the path is already a full URL, return it
	if (path.startsWith("http")) return path;

	// Otherwise, construct the R2 public URL
	const publicDomain =
		import.meta.env.VITE_R2_PUBLIC_DOMAIN || "https://media.moocafisio.com.br";
	return `${publicDomain}/${path}`;
}
