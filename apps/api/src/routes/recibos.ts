import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { limit = "100", offset = "0" } = c.req.query();
  const limitNum = Math.min(500, Math.max(1, Number(limit) || 100));
  const offsetNum = Math.max(0, Number(offset) || 0);

  try {
    if (!(await hasTable(pool, "recibos"))) {
      return c.json({ data: [] });
    }

    const result = await pool.query(
      `SELECT * FROM recibos WHERE organization_id = $1 ORDER BY numero_recibo DESC LIMIT $2 OFFSET $3`,
      [user.organizationId, limitNum, offsetNum],
    );
    return c.json({ data: result.rows || result });
  } catch (error) {
    console.error("[Recibos] Failed to list receipts:", error);
    return c.json({ data: [] });
  }
});

app.get("/last-number", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    if (!(await hasTable(pool, "recibos"))) {
      return c.json({ data: { last_number: 0 } });
    }

    const result = await pool.query(
      "SELECT MAX(numero_recibo)::bigint AS last_number FROM recibos WHERE organization_id = $1",
      [user.organizationId],
    );
    return c.json({ data: { last_number: result.rows[0]?.last_number ?? 0 } });
  } catch (error) {
    console.error("[Recibos] Failed to fetch last number:", error);
    return c.json({ data: { last_number: 0 } });
  }
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, "recibos"))) {
    return c.json({ error: "Tabela recibos indisponível" }, 501);
  }

  const lastNumberRes = await pool.query(
    "SELECT MAX(numero_recibo)::bigint AS last_number FROM recibos WHERE organization_id = $1",
    [user.organizationId],
  );
  const nextNumber = (lastNumberRes.rows[0]?.last_number ?? 0) + 1;

  const result = await pool.query(
    `INSERT INTO recibos
       (organization_id, numero_recibo, patient_id, valor, valor_extenso, referente, data_emissao,
        emitido_por, cpf_cnpj_emitente, assinado, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      nextNumber,
      body.patient_id ?? null,
      Number(body.valor ?? 0),
      body.valor_extenso ?? null,
      body.referente ?? null,
      body.data_emissao ?? new Date().toISOString(),
      body.emitido_por ?? user.email ?? "Sistema",
      body.cpf_cnpj_emitente ?? null,
      body.assinado === true,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// ===== ENVIAR RECIBO VIA WHATSAPP =====

app.post("/:id/send-whatsapp", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "recibos"))) {
    return c.json({ error: "Tabela recibos indisponível" }, 501);
  }

  const reciboResult = await pool.query(
    `SELECT r.*, p.phone AS patient_phone, p.full_name AS patient_name
     FROM recibos r
     LEFT JOIN patients p ON p.id = r.patient_id
     WHERE r.id = $1 AND r.organization_id = $2`,
    [id, user.organizationId],
  );

  if (!reciboResult.rows.length) {
    return c.json({ error: "Recibo não encontrado" }, 404);
  }

  const recibo = reciboResult.rows[0];
  if (!recibo.patient_phone) {
    return c.json({ error: "Paciente sem telefone cadastrado" }, 422);
  }

  if (!c.env.BACKGROUND_QUEUE) {
    return c.json({ error: "Fila de mensagens não configurada" }, 503);
  }

  const valor = Number(recibo.valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const messageText = [
    `Olá, ${recibo.patient_name}! 👋`,
    `Segue o comprovante de pagamento referente a: ${recibo.referente || "sessão de fisioterapia"}.`,
    `Valor: ${valor}`,
    `Recibo nº ${recibo.numero_recibo} — emitido em ${new Date(recibo.data_emissao).toLocaleDateString("pt-BR")}.`,
    `Obrigado pela confiança!`,
  ].join("\n");

  await c.env.BACKGROUND_QUEUE.send({
    type: "SEND_WHATSAPP",
    payload: {
      to: recibo.patient_phone,
      templateName: "receipt_confirmation",
      languageCode: "pt_BR",
      bodyParameters: [{ type: "text", text: messageText }],
      organizationId: user.organizationId,
      patientId: recibo.patient_id,
      messageText,
      appointmentId: "",
    },
  });

  await pool.query(
    `UPDATE recibos SET whatsapp_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );

  return c.json({ data: { sent: true, phone: recibo.patient_phone } });
});

// ===== QR CODE PIX DINÂMICO =====

app.get("/:id/pix-qr", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "recibos"))) {
    return c.json({ error: "Tabela recibos indisponível" }, 501);
  }

  const reciboResult = await pool.query(
    `SELECT r.valor, r.referente, r.numero_recibo, o.pix_key, o.name AS org_name, o.city AS org_city
     FROM recibos r
     LEFT JOIN organizations o ON o.id = r.organization_id
     WHERE r.id = $1 AND r.organization_id = $2`,
    [id, user.organizationId],
  );

  if (!reciboResult.rows.length) {
    return c.json({ error: "Recibo não encontrado" }, 404);
  }

  const recibo = reciboResult.rows[0];
  const pixKey = recibo.pix_key;

  if (!pixKey) {
    return c.json({ error: "Chave Pix não configurada para esta organização" }, 422);
  }

  // Build Pix Copia e Cola payload (EMV/QRCPS-MPM spec)
  const valor = Number(recibo.valor).toFixed(2);
  const nome = (recibo.org_name ?? "Fisioterapeuta").substring(0, 25);
  const cidade = (recibo.org_city ?? "SAO PAULO").substring(0, 15).toUpperCase();
  const txid = `RECIBO${recibo.numero_recibo}`.substring(0, 25).replace(/\s/g, "");
  const desc = (recibo.referente ?? "Sessao fisioterapia").substring(0, 30);

  function pixField(id: string, value: string): string {
    const len = String(value.length).padStart(2, "0");
    return `${id}${len}${value}`;
  }

  function crc16(str: string): string {
    let crc = 0xffff;
    for (const char of str) {
      crc ^= char.charCodeAt(0) << 8;
      for (let i = 0; i < 8; i++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      }
    }
    return ((crc & 0xffff).toString(16).toUpperCase().padStart(4, "0"));
  }

  const merchantAccountInfo = pixField("00", "BR.GOV.BCB.PIX") + pixField("01", pixKey) + pixField("02", desc);
  const payload =
    pixField("00", "01") +
    pixField("26", merchantAccountInfo) +
    pixField("52", "0000") +
    pixField("53", "986") +
    pixField("54", valor) +
    pixField("58", "BR") +
    pixField("59", nome) +
    pixField("60", cidade) +
    pixField("62", pixField("05", txid)) +
    "6304";

  const pixCopiaECola = payload + crc16(payload);

  return c.json({ data: { pixCopiaECola, valor: recibo.valor, txid } });
});

export const recibosRoutes = app;
