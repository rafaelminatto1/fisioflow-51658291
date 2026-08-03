import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";
import { converterParaMarkdown } from "../../lib/ai/toMarkdown";
import {
  CONFIANCA_MINIMA_REVISAO,
  candidatosParaRevisao,
  extractIntakeFields,
} from "../../lib/clinical/intakeExtraction";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/** Limite defensivo: ficha fotografada acima disso é foto de página inteira. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/clinical/intake/scan
 *
 * Recebe a foto/PDF da ficha física, converte com `AI.toMarkdown()` e devolve
 * os candidatos a dado cadastral para revisão.
 *
 * NÃO grava em `patients`. Telefone lido por OCR e escrito direto no cadastro
 * seria dado não verificado apresentado como fato — um dígito trocado vira
 * mensagem para a pessoa errada. A gravação exige confirmação explícita em
 * `/intake/apply`.
 */
app.post("/intake/scan", requireAuth, async (c) => {
  // `requireAuth` já barra anônimo; o scan não toca no banco, então não há
  // organização a isolar aqui — o isolamento acontece no `apply`.
  if (!c.env.AI?.toMarkdown) {
    return c.json({ error: "Conversão de documentos indisponível neste ambiente" }, 503);
  }

  const form = await c.req.formData().catch(() => null);
  const arquivo = form?.get("file");
  const patientId = String(form?.get("patientId") ?? "").trim();

  if (!(arquivo instanceof File)) {
    return c.json({ error: "Envie o arquivo da ficha no campo `file`" }, 400);
  }
  if (arquivo.size > MAX_BYTES) {
    return c.json({ error: "Arquivo acima de 8 MB" }, 413);
  }

  try {
    const { texto } = await converterParaMarkdown(c.env, {
      name: arquivo.name || "ficha",
      blob: arquivo,
    });

    const candidatos = candidatosParaRevisao(extractIntakeFields(texto));

    // O texto do OCR volta junto para a revisão poder conferir o trecho de
    // origem de cada campo — confiança sem o contexto não é verificável.
    return c.json({
      data: {
        patientId: patientId || null,
        candidatos,
        textoOcr: texto.slice(0, 20_000),
        caracteresLidos: texto.length,
      },
      meta: {
        confiancaMinima: CONFIANCA_MINIMA_REVISAO,
        aviso:
          "Nada foi gravado no cadastro. Os valores vêm de leitura automática da imagem e precisam de conferência antes de serem aplicados.",
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Intake] scan:", error);
    return c.json({ error: "Falha ao processar a ficha", details: error.message }, 500);
  }
});

const applySchema = z.object({
  patientId: z.string().uuid(),
  /** Só os campos que a recepção conferiu; o resto é descartado. */
  telefone: z.string().min(8).max(20).nullish(),
  telefoneSecundario: z.string().min(8).max(20).nullish(),
  cpf: z.string().length(11).nullish(),
  dataNascimento: z.string().date().nullish(),
  email: z.string().email().nullish(),
});

/**
 * POST /api/clinical/intake/apply
 *
 * Grava no cadastro os campos que a pessoa conferiu.
 *
 * Só preenche campo VAZIO. Um dado digitado por alguém vale mais que um lido de
 * foto, e sobrescrever silenciosamente destruiria o que já foi conferido antes.
 * Campos já preenchidos voltam em `ignorados` para a recepção decidir na mão.
 *
 * Cada coluna tem seu próprio UPDATE literal em vez de interpolação de
 * identificador: nome de coluna montado em runtime é superfície de injeção sem
 * ganho nenhum, já que são cinco campos fixos.
 *
 * Nota de schema: a coluna de nascimento é `date_of_birth`, não `birth_date`; e
 * não existe coluna de CEP em `patients` — o endereço é um campo único, então
 * CEP fica fora do apply mesmo quando o OCR o encontra.
 */
app.post("/intake/apply", requireAuth, zValidator("json", applySchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const sql = getRawSql(c.env, "write");
  const org = user.organizationId;
  const id = body.patientId;

  const temValor = (v: unknown) => v != null && String(v).trim() !== "";
  if (![body.telefone, body.telefoneSecundario, body.cpf, body.dataNascimento, body.email].some(temValor)) {
    return c.json({ error: "Nenhum campo informado" }, 400);
  }

  try {
    const atual = await sql`
      SELECT phone, phone_secondary, cpf, date_of_birth, email
      FROM patients
      WHERE id = ${id}::uuid AND organization_id = ${org}::uuid
    `;
    const linha = atual.rows?.[0];
    if (!linha) return c.json({ error: "Paciente não encontrado" }, 404);

    const aplicados: string[] = [];
    const ignorados: string[] = [];
    const vazio = (coluna: string) => !temValor(linha[coluna]);

    if (temValor(body.telefone)) {
      if (vazio("phone")) {
        await sql`UPDATE patients SET phone = ${body.telefone}, updated_at = now()
                  WHERE id = ${id}::uuid AND organization_id = ${org}::uuid`;
        aplicados.push("telefone");
      } else ignorados.push("telefone");
    }

    if (temValor(body.telefoneSecundario)) {
      if (vazio("phone_secondary")) {
        await sql`UPDATE patients SET phone_secondary = ${body.telefoneSecundario}, updated_at = now()
                  WHERE id = ${id}::uuid AND organization_id = ${org}::uuid`;
        aplicados.push("telefoneSecundario");
      } else ignorados.push("telefoneSecundario");
    }

    if (temValor(body.cpf)) {
      if (vazio("cpf")) {
        await sql`UPDATE patients SET cpf = ${body.cpf}, updated_at = now()
                  WHERE id = ${id}::uuid AND organization_id = ${org}::uuid`;
        aplicados.push("cpf");
      } else ignorados.push("cpf");
    }

    if (temValor(body.dataNascimento)) {
      if (vazio("date_of_birth")) {
        await sql`UPDATE patients SET date_of_birth = ${body.dataNascimento}::date, updated_at = now()
                  WHERE id = ${id}::uuid AND organization_id = ${org}::uuid`;
        aplicados.push("dataNascimento");
      } else ignorados.push("dataNascimento");
    }

    if (temValor(body.email)) {
      if (vazio("email")) {
        await sql`UPDATE patients SET email = ${body.email}, updated_at = now()
                  WHERE id = ${id}::uuid AND organization_id = ${org}::uuid`;
        aplicados.push("email");
      } else ignorados.push("email");
    }

    return c.json({
      data: { patientId: id, aplicados, ignorados },
      meta: {
        aviso: ignorados.length
          ? "Campos já preenchidos não foram sobrescritos — dado digitado por uma pessoa vale mais que leitura de foto."
          : undefined,
      },
    });
  } catch (error: any) {
    console.error("[Clinical/Intake] apply:", error);
    return c.json({ error: "Falha ao aplicar dados", details: error.message }, 500);
  }
});

export default app;
