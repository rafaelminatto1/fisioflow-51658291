import React from "react";
import { getBuildEnvironment } from "@/utils/environment";
import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function BiomechanicsScreen() {
	const env = getBuildEnvironment();

	if (env.isExpoGo) {
		return (
			<FeatureUnavailable
				featureName="Análise Biomecânica em Tempo Real"
				description="Câmera ao vivo e detecção de pose nativa"
				customMessage={
					"A análise biomecânica com câmera ao vivo requer o módulo react-native-vision-camera, que não está disponível no Expo Go.\n\n" +
					"Você pode testar todo o resto do aplicativo no Expo Go, incluindo:\n" +
					"• Gestão de pacientes e prontuários\n" +
					"• Agendamentos e check-in\n" +
					"• Protocolos e exercícios\n" +
					"• Financeiro e relatórios\n\n" +
					"Para testar a análise biomecânica completa, use o workflow do GitHub para criar um build customizado."
				}
			/>
		);
	}

	const BiomechanicsImpl = require("./biomechanics-impl").default;
	return <BiomechanicsImpl />;
}
