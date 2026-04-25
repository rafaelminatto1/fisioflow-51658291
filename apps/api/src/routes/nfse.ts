/**
 * NFS-e Routes — Nota Fiscal de Serviços Eletrônica (Prefeitura de São Paulo)
 *
 * Emissão direta via webservice SOAP com mTLS (certificado digital ICP-Brasil).
 * Sem dependência de Focus NFe. PDF DANFSe salvo no Cloudflare R2.
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";
import {
  envioRPS,
  testeEnvioLoteRPS,
  consultaNFe,
  consultaLote,
  cancelamentoNFe,
  hasSPCertConfig,
} from "../lib/nfseSPClient";
import { generateAndSaveDanfse, getDanfsePresignedUrl, getDanfseR2Key } from "../lib/nfseDanfse";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ===== CONFIGURAÇÃO DO PRESTADOR =====

app.get("/config", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT id, organization_id, razao_social, cnpj_prestador AS cnpj, inscricao_municipal,
		        municipio_codigo AS codigo_municipio, regime_tributario, optante_simples, tp_opcao_simples,
		        incentivo_fiscal, aliquota_iss AS aliquota_padrao, codigo_servico_padrao, cnae,
		        discriminacao_padrao, ambiente, created_at, updated_at
		 FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.put("/config", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  const fields = [
    { apiKey: "razao_social", column: "razao_social" },
    { apiKey: "cnpj", column: "cnpj_prestador" },
    { apiKey: "inscricao_municipal", column: "inscricao_municipal" },
    { apiKey: "codigo_municipio", column: "municipio_codigo" },
    { apiKey: "regime_tributario", column: "regime_tributario" },
    { apiKey: "optante_simples", column: "optante_simples" },
    { apiKey: "tp_opcao_simples", column: "tp_opcao_simples" },
    { apiKey: "incentivo_fiscal", column: "incentivo_fiscal" },
    { apiKey: "aliquota_padrao", column: "aliquota_iss" },
    { apiKey: "codigo_servico_padrao", column: "codigo_servico_padrao" },
    { apiKey: "cnae", column: "cnae" },
    { apiKey: "discriminacao_padrao", column: "discriminacao_padrao" },
    { apiKey: "ambiente", column: "ambiente" },
  ];

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [user.organizationId];
  const providedFields: string[] = [];

  for (const field of fields) {
    const value = body[field.apiKey] ?? body[field.column];
    if (value !== undefined) {
      params.push(value);
      providedFields.push(field.column);
      sets.push(`${field.column} = $${params.length}`);
    }
  }

  if (!providedFields.length) {
    return c.json({ error: "Nenhum campo informado para atualização" }, 400);
  }

  const result = await pool.query(
    `INSERT INTO nfse_config (organization_id, ${providedFields.join(", ")})
		 VALUES ($1, ${providedFields.map((_, i) => `$${i + 2}`).join(", ")})
		 ON CONFLICT (organization_id) DO UPDATE SET ${sets.join(", ")}
		 RETURNING *`,
    params,
  );

  return c.json({ data: result.rows[0] });
});

// ===== LISTAGEM E DETALHE =====

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { patientId, month, status, limit: lim } = c.req.query();

  const conditions = ["organization_id = $1"];
  const params: unknown[] = [user.organizationId];

  if (patientId && isUuid(patientId)) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    params.push(`${month}-01`);
    conditions.push(`data_emissao >= $${params.length}::date`);
    const [y, m] = month.split("-");
    const end = new Date(Number(y), Number(m), 0).toISOString().split("T")[0];
    params.push(end);
    conditions.push(`data_emissao <= $${params.length}::date`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(Math.min(Number(lim) || 50, 200));

  const result = await pool.query(
    `SELECT id, patient_id, appointment_id, numero_nfse, numero_rps, serie_rps,
		        data_emissao, valor_servico, aliquota_iss, valor_iss, status,
		        codigo_verificacao, link_nfse, link_danfse, tomador_nome, created_at
		 FROM nfse_records
		 WHERE ${conditions.join(" AND ")}
		 ORDER BY data_emissao DESC
		 LIMIT $${params.length}`,
    params,
  );

  return c.json({ data: result.rows || [] });
});

app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM nfse_records WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: "NFS-e não encontrada" }, 404);
  return c.json({ data: result.rows[0] });
});

// ===== GERAÇÃO DE RASCUNHO =====

app.post("/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as {
    patient_id?: string;
    appointment_id?: string;
    valor_servico: number;
    discriminacao: string;
    tomador_nome: string;
    tomador_cpf_cnpj?: string;
    tomador_email?: string;
    aliquota_iss?: number;
  };

  if (!body.valor_servico || !body.discriminacao || !body.tomador_nome) {
    return c.json({ error: "valor_servico, discriminacao e tomador_nome são obrigatórios" }, 400);
  }

  const pool = createPool(c.env);
  const cfgResult = await pool.query(
    `SELECT * FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );

  if (!cfgResult.rows.length) {
    return c.json(
      { error: "Configure os dados do prestador em Configurações > NFS-e antes de gerar" },
      422,
    );
  }

  const cfg = cfgResult.rows[0];
  const seqResult = await pool.query(
    `SELECT COALESCE(MAX(CAST(numero_rps AS INTEGER)), 0) + 1 AS next_rps
		 FROM nfse_records WHERE organization_id = $1`,
    [user.organizationId],
  );
  const numeroRps = String(seqResult.rows[0]?.next_rps ?? 1);

  const aliquota = body.aliquota_iss ?? Number(cfg.aliquota_iss ?? cfg.aliquota_padrao ?? 0.02);
  const valorIss = Number((body.valor_servico * aliquota).toFixed(2));
  const dataEmissao = new Date().toISOString();
  const tpOpcaoSimples = cfg.tp_opcao_simples ?? 4;

  const result = await pool.query(
    `INSERT INTO nfse_records
		  (organization_id, patient_id, appointment_id, numero_rps, serie_rps, data_emissao,
		   valor_servico, aliquota_iss, valor_iss, codigo_servico, discriminacao,
		   tomador_nome, tomador_cpf_cnpj, tomador_email, status, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,'RPS',$5,$6,$7,$8,$9,$10,$11,$12,$13,'rascunho',NOW(),NOW())
		 RETURNING *`,
    [
      user.organizationId,
      body.patient_id && isUuid(body.patient_id) ? body.patient_id : null,
      body.appointment_id && isUuid(body.appointment_id) ? body.appointment_id : null,
      numeroRps,
      dataEmissao,
      body.valor_servico,
      aliquota,
      valorIss,
      cfg.codigo_servico_padrao ?? "14.01",
      body.discriminacao,
      body.tomador_nome,
      body.tomador_cpf_cnpj ?? null,
      body.tomador_email ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// ===== ENVIO DIRETO — PREFEITURA DE SÃO PAULO =====

app.post("/send/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const nfseResult = await pool.query(
    `SELECT n.*, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal, cfg.municipio_codigo AS codigo_municipio,
		        cfg.optante_simples, cfg.tp_opcao_simples, cfg.incentivo_fiscal,
		        cfg.aliquota_iss AS aliquota_padrao, cfg.codigo_servico_padrao, cfg.cnae,
		        cfg.razao_social, cfg.ambiente
		 FROM nfse_records n
		 JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
		 WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!nfseResult.rows.length)
    return c.json({ error: "NFS-e não encontrada ou configuração pendente" }, 404);

  const nfse = nfseResult.rows[0];
  if (nfse.status !== "rascunho") {
    return c.json({ error: `NFS-e não pode ser enviada no status "${nfse.status}"` }, 422);
  }

  const ambiente = (nfse.ambiente ?? "homologacao") as "homologacao" | "producao";

  if (hasSPCertConfig(c.env)) {
    try {
      const result = await envioRPS(c.env, {
        numero: nfse.numero_rps,
        serie: "RPS",
        tipo: "1",
        dataEmissao: nfse.data_emissao,
        cnpjPrestador: nfse.cnpj?.replace(/\D/g, "") || "",
        inscricaoMunicipal: nfse.inscricao_municipal?.replace(/\D/g, "") || "",
        codigoServico: nfse.codigo_servico_padrao ?? "14.01",
        codigoCnae: nfse.cnae ?? "86500-4/04",
        discriminacao: nfse.discriminacao,
        valorServicos: Number(nfse.valor_servico).toFixed(2),
        valorDeducoes: "0.00",
        valorIss: Number(nfse.valor_iss).toFixed(2),
        aliquota: Number(nfse.aliquota_iss ?? nfse.aliquota_padrao ?? 0.02).toFixed(4),
        issRetido: "2",
        tomadorCpfCnpj: nfse.tomador_cpf_cnpj?.replace(/\D/g, "") || "",
        tomadorInscricaoMunicipal: "",
        tomadorRazaoSocial: nfse.tomador_nome || "",
        tomadorEmail: nfse.tomador_email || "",
        tpOpcaoSimples: nfse.tp_opcao_simples ?? 4,
        codigoMunicipio: nfse.codigo_municipio ?? "3550308",
      });

      if (result.success && result.numeroNfse) {
        await pool.query(
          `UPDATE nfse_records
					 SET status = 'autorizado', numero_nfse = $1, codigo_verificacao = $2,
					     link_nfse = $3, updated_at = NOW()
					 WHERE id = $4`,
          [result.numeroNfse, result.codigoVerificacao, result.linkNfse, id],
        );

        const updated = await pool.query(`SELECT * FROM nfse_records WHERE id = $1`, [id]);
        const updatedNfse = updated.rows[0];

        try {
          const danfseUrl = await generateAndSaveDanfse(c.env, updatedNfse, nfse);
          if (danfseUrl) {
            await pool.query(`UPDATE nfse_records SET link_danfse = $1 WHERE id = $2`, [
              danfseUrl,
              id,
            ]);
            updatedNfse.link_danfse = danfseUrl;
          }
        } catch (danfseErr) {
          console.error("[NFSe] Erro ao gerar DANFSe:", danfseErr);
        }

        return c.json({ data: { id, ...result, link_danfse: updatedNfse.link_danfse } });
      }

      if (result.erros && result.erros.length > 0) {
        await pool.query(
          `UPDATE nfse_records SET status = 'erro', updated_at = NOW() WHERE id = $1`,
          [id],
        );
        const msgs = result.erros.map((e) => `${e.codigo}: ${e.descricao}`).join("; ");
        return c.json({ error: `Prefeitura recusou: ${msgs}` }, 422);
      }

      await pool.query(
        `UPDATE nfse_records SET status = 'enviado', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      return c.json({
        data: { id, status: "enviado", message: "NFS-e enviada — aguardando processamento" },
      });
    } catch (err: any) {
      console.error("[NFSe] Erro envio SP:", err);
      return c.json({ error: `Falha no envio: ${err.message}` }, 500);
    }
  }

  // Sem certificado → simulação homologação
  if (ambiente === "homologacao") {
    const numeroNfse = String(Date.now()).slice(-8);
    const codigoVerificacao = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    await pool.query(
      `UPDATE nfse_records
			 SET status = 'autorizado', numero_nfse = $1, codigo_verificacao = $2,
			     link_nfse = $3, updated_at = NOW()
			 WHERE id = $4`,
      [
        numeroNfse,
        codigoVerificacao,
        `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${numeroNfse}&c=${codigoVerificacao}`,
        id,
      ],
    );

    const updated = await pool.query(`SELECT * FROM nfse_records WHERE id = $1`, [id]);
    const updatedNfse = updated.rows[0];

    try {
      const danfseUrl = await generateAndSaveDanfse(c.env, updatedNfse, nfse);
      if (danfseUrl) {
        await pool.query(`UPDATE nfse_records SET link_danfse = $1 WHERE id = $2`, [danfseUrl, id]);
        updatedNfse.link_danfse = danfseUrl;
      }
    } catch (_) {}

    return c.json({
      data: {
        id,
        status: "autorizado",
        numero_nfse: numeroNfse,
        codigo_verificacao: codigoVerificacao,
        ambiente: "homologacao (simulado)",
        link_danfse: updatedNfse.link_danfse,
      },
    });
  }

  return c.json(
    {
      error: "Certificado digital não configurado. Configure NFSE_SP_CERT para envio em produção.",
    },
    422,
  );
});

// ===== TESTE DE ENVIO (valida sem gerar nota) =====

app.post("/test/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  if (!hasSPCertConfig(c.env)) return c.json({ error: "Certificado digital não configurado" }, 422);

  const pool = createPool(c.env);
  const nfseResult = await pool.query(
    `SELECT n.*, cfg.razao_social, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal,
		        cfg.municipio_codigo AS codigo_municipio, cfg.regime_tributario,
		        cfg.optante_simples, cfg.tp_opcao_simples, cfg.incentivo_fiscal,
		        cfg.aliquota_iss AS aliquota_padrao, cfg.codigo_servico_padrao,
		        cfg.cnae, cfg.discriminacao_padrao, cfg.ambiente
		 FROM nfse_records n
		 JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
		 WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!nfseResult.rows.length) return c.json({ error: "NFS-e não encontrada" }, 404);
  const nfse = nfseResult.rows[0];

  try {
    const result = await testeEnvioLoteRPS(c.env, {
      numero: nfse.numero_rps,
      serie: "RPS",
      tipo: "1",
      dataEmissao: nfse.data_emissao,
      cnpjPrestador: nfse.cnpj_prestador?.replace(/\D/g, "") || "",
      inscricaoMunicipal: nfse.inscricao_municipal?.replace(/\D/g, "") || "",
      codigoServico: nfse.codigo_servico ?? "14.01",
      codigoCnae: nfse.cnae ?? "86500-4/04",
      discriminacao: nfse.discriminacao,
      valorServicos: Number(nfse.valor_servico).toFixed(2),
      valorDeducoes: "0.00",
      valorIss: Number(nfse.valor_iss).toFixed(2),
      aliquota: Number(nfse.aliquota_iss ?? 0.02).toFixed(4),
      issRetido: "2",
      tomadorCpfCnpj: nfse.tomador_cpf_cnpj?.replace(/\D/g, "") || "",
      tomadorInscricaoMunicipal: "",
      tomadorRazaoSocial: nfse.tomador_nome || "",
      tomadorEmail: nfse.tomador_email || "",
      tpOpcaoSimples: nfse.tp_opcao_simples ?? 4,
      codigoMunicipio: nfse.municipio_prestacao ?? "3550308",
    });

    return c.json({ data: result });
  } catch (err: any) {
    return c.json({ error: `Teste falhou: ${err.message}` }, 500);
  }
});

// ===== CONSULTA NFSE NA PREFEITURA =====

app.get("/consulta-nfse/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  if (!hasSPCertConfig(c.env)) return c.json({ error: "Certificado digital não configurado" }, 422);

  const pool = createPool(c.env);
  const nfseResult = await pool.query(
    `SELECT n.numero_nfse, n.codigo_verificacao, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal
		 FROM nfse_records n
		 JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
		 WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!nfseResult.rows.length) return c.json({ error: "NFS-e não encontrada" }, 404);
  const nfse = nfseResult.rows[0];

  if (!nfse.numero_nfse) return c.json({ error: "NFS-e ainda não foi autorizada" }, 422);

  try {
    const result = await consultaNFe(c.env, {
      cnpjRemetente: nfse.cnpj_prestador?.replace(/\D/g, ""),
      inscricaoMunicipal: nfse.inscricao_municipal?.replace(/\D/g, ""),
      numeroNfse: nfse.numero_nfse,
    });

    return c.json({ data: result });
  } catch (err: any) {
    return c.json({ error: `Consulta falhou: ${err.message}` }, 500);
  }
});

// ===== CONSULTA LOTE =====

app.get("/consulta-lote/:numeroLote", requireAuth, async (c) => {
  const { numeroLote } = c.req.param();
  if (!hasSPCertConfig(c.env)) return c.json({ error: "Certificado digital não configurado" }, 422);

  const user = c.get("user");
  const pool = createPool(c.env);
  const cfgResult = await pool.query(
    `SELECT cnpj_prestador AS cnpj, inscricao_municipal, municipio_codigo AS codigo_municipio FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );

  if (!cfgResult.rows.length) return c.json({ error: "Configuração não encontrada" }, 404);
  const cfg = cfgResult.rows[0];

  try {
    const result = await consultaLote(c.env, {
      cnpjRemetente: cfg.cnpj?.replace(/\D/g, ""),
      inscricaoMunicipal: cfg.inscricao_municipal?.replace(/\D/g, ""),
      numeroLote,
    });

    return c.json({ data: result });
  } catch (err: any) {
    return c.json({ error: `Consulta lote falhou: ${err.message}` }, 500);
  }
});

// ===== CANCELAMENTO NA PREFEITURA =====

app.post("/cancel/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const nfseResult = await pool.query(
    `SELECT n.*, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal FROM nfse_records n
		 JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
		 WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!nfseResult.rows.length) return c.json({ error: "NFS-e não encontrada" }, 404);
  const nfse = nfseResult.rows[0];

  if (nfse.status === "cancelado") return c.json({ error: "NFS-e já está cancelada" }, 422);
  if (!nfse.numero_nfse)
    return c.json({ error: "NFS-e não possui número — não pode ser cancelada" }, 422);

  if (hasSPCertConfig(c.env)) {
    try {
      const result = await cancelamentoNFe(c.env, {
        cnpjRemetente: nfse.cnpj?.replace(/\D/g, ""),
        inscricaoMunicipal: nfse.inscricao_municipal?.replace(/\D/g, ""),
        numeroNfse: nfse.numero_nfse,
      });

      if (!result.success) {
        const msgs =
          result.erros?.map((e) => `${e.codigo}: ${e.descricao}`).join("; ") ?? "Erro desconhecido";
        return c.json({ error: `Prefeitura recusou cancelamento: ${msgs}` }, 422);
      }
    } catch (err: any) {
      return c.json({ error: `Cancelamento falhou: ${err.message}` }, 500);
    }
  }

  await pool.query(
    `UPDATE nfse_records SET status = 'cancelado', updated_at = NOW() WHERE id = $1`,
    [id],
  );

  return c.json({ data: { id, status: "cancelado" } });
});

// ===== DANFSe PDF (download) =====

app.get("/danfse/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT id, organization_id, numero_nfse, link_danfse, status FROM nfse_records WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: "NFS-e não encontrada" }, 404);
  const nfse = result.rows[0];

  if (!nfse.link_danfse) {
    const cfgResult = await pool.query(
      `SELECT * FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
      [user.organizationId],
    );
    if (!cfgResult.rows.length) return c.json({ error: "Configuração não encontrada" }, 404);

    const fullResult = await pool.query(`SELECT * FROM nfse_records WHERE id = $1`, [id]);
    const danfseUrl = await generateAndSaveDanfse(c.env, fullResult.rows[0], cfgResult.rows[0]);

    if (danfseUrl) {
      await pool.query(`UPDATE nfse_records SET link_danfse = $1 WHERE id = $2`, [danfseUrl, id]);
    } else {
      return c.json({ error: "Não foi possível gerar o DANFSe" }, 500);
    }

    nfse.link_danfse = danfseUrl;
  }

  const key = getDanfseR2Key(nfse.organization_id, nfse.id, "");
  const presignedUrl = await getDanfsePresignedUrl(c.env, key);

  if (presignedUrl) {
    return c.redirect(presignedUrl);
  }

  return c.json({ data: { url: nfse.link_danfse } });
});

// ===== DELETE LOCAL (sem cancelar na prefeitura) =====

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `UPDATE nfse_records SET status = 'cancelado', updated_at = NOW()
		 WHERE id = $1 AND organization_id = $2 AND status != 'cancelado'
		 RETURNING id, status`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: "NFS-e não encontrada ou já cancelada" }, 404);
  return c.json({ data: result.rows[0] });
});

export { app as nfseRoutes };
