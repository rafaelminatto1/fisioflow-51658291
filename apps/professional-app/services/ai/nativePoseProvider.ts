import { PoseDetection, PoseProvider, AnalysisType } from "../../types/pose";
import { Platform } from "react-native";

let VisionPoseDetector: any = null;

try {
	VisionPoseDetector = require("../../modules/expo-vision-pose-detector");
} catch {
	console.warn(
		"[NativePoseProvider] expo-vision-pose-detector não disponível neste ambiente",
	);
}

export class NativePoseProvider implements PoseProvider {
	private isLoaded: boolean = false;

	async initialize(): Promise<void> {
		if (Platform.OS === "web") {
			console.warn(
				"[NativePoseProvider] Este provedor é apenas para iOS/Android.",
			);
			return;
		}

		if (!VisionPoseDetector) {
			console.warn(
				"[NativePoseProvider] Módulo nativo não disponível. Funcionalidade desabilitada.",
			);
			return;
		}

		this.isLoaded = true;
		console.log(
			"[NativePoseProvider] Inicializado com VisionPoseDetector (iOS Native)",
		);
	}

	async detect(image: any): Promise<PoseDetection> {
		if (!this.isLoaded || !VisionPoseDetector) {
			throw new Error(
				"NativePoseProvider não inicializado ou módulo não disponível",
			);
		}

		if (Platform.OS === "ios") {
			try {
				const results = await VisionPoseDetector.detectPoseAsync(image);
				if (results && results.length > 0) {
					const mainPose = results[0];
					return {
						landmarks: mainPose.landmarks,
						confidence: mainPose.confidence,
						timestamp: Date.now(),
						analysisType: AnalysisType.FORM,
					};
				}
			} catch (error) {
				console.error(
					"[NativePoseProvider] Erro na detecção nativa iOS:",
					error,
				);
			}
		}

		return {
			landmarks: [],
			confidence: 0,
			timestamp: Date.now(),
			analysisType: AnalysisType.FORM,
		};
	}

	startStream(_video: any, _callback: (result: PoseDetection) => void): void {
		if (!this.isLoaded) return;
		console.log("[NativePoseProvider] Stream iniciado (simulado)");
	}

	stopStream(): void {
		console.log("[NativePoseProvider] Stream parado");
	}

	close(): void {
		this.isLoaded = false;
	}

	isInitialized(): boolean {
		return this.isLoaded;
	}
}

export const nativePoseProvider = new NativePoseProvider();
