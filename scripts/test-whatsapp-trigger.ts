
import { Inngest } from "inngest";

// Initialize Inngest client (matches your project's setup)
const inngest = new Inngest({ id: "fisioflow-notifications" });

async function testWhatsApp() {
    console.log("🚀 Enviando evento de teste para o Inngest Dev Server...");

    try {
        // Send the event directly to the local Inngest Dev Server
        // Note: When running locally, we can just use the SDK if 'INNGEST_DEV' env var is handled,
        // or we can post to the local event URL. 
        // Using the SDK is cleaner if configured correctly, but a raw fetch to the dev server is more robust for a standalone script.

        // Default Inngest Dev Server Event API
        const response = await fetch("http://127.0.0.1:8288/v1/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "whatsapp/appointment.confirmation",
                data: {
                    to: "551158749885", // User provided number
                    patientName: "Rafael Minatto",
                    therapistName: "FisioFlow Bot",
                    date: new Date().toLocaleDateString('pt-BR'),
                    time: "10:00",
                    organizationName: "FisioFlow Test"
                }
            })
        });

        if (response.ok) {
            console.log("✅ Evento enviado com sucesso!");
            console.log("👉 Verifique o console do Inngest ou seu WhatsApp.");
        } else {
            console.error("❌ Erro ao enviar evento:", await response.text());
        }

    } catch (error) {
        console.error("❌ Falha ao conectar com Inngest Dev Server. Ele está rodando?", error);
    }
}

testWhatsApp();
