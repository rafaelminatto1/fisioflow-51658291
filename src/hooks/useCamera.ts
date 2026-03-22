import { useCallback, useMemo, useState } from "react";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { getCameraPhoto, type CameraPhoto } from "@/lib/platform/native";

export interface CameraOptions {
	quality?: number;
	allowEditing?: boolean;
	correctOrientation?: boolean;
	saveToGallery?: boolean;
}

/**
 * Hook para acessar a câmera do dispositivo
 * @returns Estado e funções para capturar e selecionar fotos
 */
export function useCamera(options: CameraOptions = {}) {
	const [photo, setPhoto] = useState<CameraPhoto | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const defaultOptions: CameraOptions = useMemo(
		() => ({
			quality: 90,
			allowEditing: true,
			correctOrientation: true,
			saveToGallery: false,
			...options,
		}),
		[options],
	);

	/**
	 * Tira uma foto usando a câmera do dispositivo
	 * @returns URL da foto ou null se cancelado
	 */
	const takePhoto = useCallback(async (): Promise<string | null> => {
		setIsLoading(true);

		try {
			const image = await getCameraPhoto({
				quality: defaultOptions.quality,
				allowEditing: defaultOptions.allowEditing,
				correctOrientation: defaultOptions.correctOrientation,
				saveToGallery: defaultOptions.saveToGallery,
				source: "camera",
			});

			setPhoto(image);
			setIsLoading(false);

			return image.webPath ?? null;
		} catch (error) {
			logger.error("Erro ao tirar foto", error, "useCamera");
			setIsLoading(false);
			return null;
		}
	}, [defaultOptions]);

	/**
	 * Seleciona uma foto da galeria do dispositivo
	 * @returns URL da foto ou null se cancelado
	 */
	const pickFromGallery = useCallback(async (): Promise<string | null> => {
		setIsLoading(true);

		try {
			const image = await getCameraPhoto({
				quality: defaultOptions.quality,
				allowEditing: defaultOptions.allowEditing,
				saveToGallery: defaultOptions.saveToGallery,
				source: "photos",
			});

			setPhoto(image);
			setIsLoading(false);

			return image.webPath ?? null;
		} catch (error) {
			logger.error("Erro ao selecionar foto da galeria", error, "useCamera");
			setIsLoading(false);
			return null;
		}
	}, [defaultOptions]);

	/**
	 * Limpa a foto selecionada
	 */
	const clearPhoto = useCallback(() => {
		setPhoto(null);
	}, []);

	return {
		photo,
		isLoading,
		takePhoto,
		pickFromGallery,
		clearPhoto,
	};
}

/**
 * Hook específico para capturar fotos de exercícios
 */
export function useExerciseCamera() {
	const { photo, isLoading, takePhoto, pickFromGallery, clearPhoto } =
		useCamera({
			quality: 90,
			allowEditing: true,
			saveToGallery: true, // Salvar automaticamente na galeria
		});

	return {
		photo,
		isLoading,
		captureExercisePhoto: takePhoto,
		selectFromGallery: pickFromGallery,
		clearPhoto,
	};
}
