#!/usr/bin/env node
/**
 * scripts/mobile-onboard-patients.mjs
 *
 * Envia WhatsApp para todos os pacientes ativos convidando-os a baixar o app.
 * Usa a API do Worker para disparar templates via WhatsApp Business.
 *
 * Uso:
 *   node scripts/mobile-onboard-patients.mjs --dry-run   # Simula sem enviar
 *   node scripts/mobile-onboard-patients.mjs             # Envia de verdade
 *
 * Pré-requisito: WORKERS_API_URL e WORKERS_API_TOKEN no ambiente.
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    limit: { type: "string", default: "0" },
  },
});

const DRY_RUN = values["dry-run"];
const LIMIT = parseInt(values.limit, 10) || 0;

const API_URL = process.env.WORKERS_API_URL || "https://api-pro.moocafisio.com.br";
const API_TOKEN = process.env.WORKERS_API_TOKEN;

const APP_STORE_URL = "https://apps.apple.com/app/fisioflow-paciente/id6504123457";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.fisioflow.patient";

if (!API_TOKEN) {
  console.error("❌ Defina WORKERS_API_TOKEN no ambiente.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchPatients() {
  const res = await fetch(`${API_URL}/api/patients?limit=500&status=active`, { headers });
  if (!res.ok) throw new Error(`Erro ao buscar pacientes: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function sendWhatsApp(patient) {
  const phone = patient.phone?.replace(/\D/g, "");
  if (!phone || phone.length < 10) {
    console.log(`  ⚠️  ${patient.name} — sem telefone válido, pulando.`);
    return false;
  }

  const message =
    `Olá, ${patient.name.split(" ")[0]}! 👋\n\n` +
    `O *FisioFlow Paciente* chegou às lojas! Agora você pode acompanhar seus exercícios, ` +
    `ver sua agenda e receber lembretes direto no celular.\n\n` +
    `📱 *iOS (iPhone):* ${APP_STORE_URL}\n` +
    `🤖 *Android:* ${PLAY_STORE_URL}\n\n` +
    `Qualquer dúvida, é só falar! 💪`;

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] → ${patient.name} (${phone}): mensagem preparada.`);
    return true;
  }

  const res = await fetch(`${API_URL}/api/whatsapp/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({ to: `55${phone}`, message }),
  });

  return res.ok;
}

async function main() {
  console.log(`\n📲 FisioFlow — Onboarding Mobile de Pacientes`);
  console.log(`   Modo: ${DRY_RUN ? "DRY-RUN (sem envio real)" : "PRODUÇÃO"}\n`);

  const patients = await fetchPatients();
  const targets = LIMIT > 0 ? patients.slice(0, LIMIT) : patients;

  console.log(`👥 ${targets.length} pacientes para processar...`);

  let sent = 0;
  let skipped = 0;

  for (const patient of targets) {
    const ok = await sendWhatsApp(patient);
    if (ok) { sent++; } else { skipped++; }
    // Rate limit: 1 mensagem por segundo
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✅ Concluído: ${sent} enviados, ${skipped} pulados.`);
  if (DRY_RUN) console.log("\n💡 Rode sem --dry-run para enviar de verdade.");
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
