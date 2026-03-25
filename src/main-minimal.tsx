// Versão mínima do main.tsx para debug
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

console.log("[main.tsx MINIMAL] Loaded successfully!");

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<div style={{ padding: "20px", backgroundColor: "#f0f0f0", color: "#fff" }}>
			<h1>main.tsx MINIMAL - DEBUG</h1>
			<p>
				Se você está vendo esta mensagem, o React app foi inicializado com
				sucesso!
			</p>
			<p>Arquivo: /src/main.tsx</p>
			<p>Timestamp: {new Date().toISOString()}</p>
		</div>
	</StrictMode>,
);
