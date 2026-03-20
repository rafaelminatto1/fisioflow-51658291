/**
 * Cloud Cache Service
 *
 * Uses Cloudflare R2 to store a snapshot of appointments for cross-device persistence.
 */

import { uploadFile, deleteFile } from "@/lib/storage/upload";
import type { AppointmentBase } from "@/types/appointment";
import { fisioLogger as logger } from "@/lib/errors/logger";

const STORAGE_CACHE_PREFIX = "cache/appointments/";

export class CloudCacheService {
	/**
	 * Save appointments snapshot to Cloudflare R2
	 */
	async saveSnapshot(
		userId: string,
		appointments: AppointmentBase[],
	): Promise<void> {
		try {
			const filename = `${userId}.json`;
			const data = JSON.stringify({
				timestamp: Date.now(),
				userId,
				count: appointments.length,
				data: appointments,
			});

			const blob = new Blob([data], { type: "application/json" });
			const file = new File([blob], filename, { type: "application/json" });

			await uploadFile(file, { folder: STORAGE_CACHE_PREFIX });

			logger.info("Cloud snapshot saved to R2", {
				userId,
				count: appointments.length,
			});
		} catch (error) {
			logger.error("Failed to save cloud snapshot to R2", error);
		}
	}

	/**
	 * Fetch appointments snapshot from Cloudflare R2
	 */
	async getSnapshot(userId: string): Promise<AppointmentBase[] | null> {
		try {
			// R2 public bucket URL (from .env R2_PUBLIC_DOMAIN)
			const publicDomain =
				import.meta.env.VITE_R2_PUBLIC_DOMAIN ||
				"https://media.moocafisio.com.br";
			const url = `${publicDomain}/${STORAGE_CACHE_PREFIX}${userId}.json`;

			const response = await fetch(url);
			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
			}

			const snapshot = await response.json();

			// Basic validation
			if (snapshot.userId !== userId) return null;

			// Check age (e.g., ignore if older than 24h)
			if (Date.now() - snapshot.timestamp > 24 * 60 * 60 * 1000) {
				return null;
			}

			return snapshot.data;
		} catch (error) {
			logger.warn("Failed to fetch cloud snapshot from R2", error);
			return null;
		}
	}

	/**
	 * Clean up snapshot
	 */
	async deleteSnapshot(userId: string): Promise<void> {
		try {
			await deleteFile(`${STORAGE_CACHE_PREFIX}${userId}.json`);
		} catch (error) {
			logger.error("Failed to delete cloud snapshot", error);
		}
	}
}

export const cloudCacheService = new CloudCacheService();
