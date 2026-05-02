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
  consultaCNPJ,
  hasSPCertConfig,
  debugBuildXmlMessage,
} from "../lib/nfseSPClient";
import { generateAndSaveDanfse, getDanfsePresignedUrl, getDanfseR2Key } from "../lib/nfseDanfse";
import { writeEvent } from "../lib/analytics";
import { sendNfseToAccounting, sendNfseCancellationToAccounting } from "../lib/email";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  }

// ===== DEBUG: Ver última assinatura gerada =====
app.get("/debug-signature", async (c) => {
  const lastSign = (globalThis as any).__lastSignString;
  return c.json({ 
    lastSignatureString: lastSign,
    last15Chars: lastSign ? lastSign.slice(-15) : null 
  });
});

// ===== TESTE DE ENVIO RPS (sem autenticação) =====

app.get("/test-rps", async (c) => {
  const hasCert = !!c.env.NFSE_SP_CERT;
  const hasCertPem = !!c.env.NFSE_SP_CERT_PEM;
  const hasKeyPem = !!c.env.NFSE_SP_KEY_PEM;
  
  if (!hasSPCertConfig(c.env)) {
    return c.json({ 
      error: "Certificado não configurado", 
      cert: hasCert, 
      mtls: hasCert,
      certPem: hasCertPem,
      keyPem: hasKeyPem,
    }, 422);
  }

  const { testeEnvioLoteRPS, consultaCNPJ } = await import("../lib/nfseSPClient");

  try {
    const rpsParams = {
      numero: "777",
      serie: "RPS",
      tipo: "RPS",
      dataEmissao: new Date(Date.now() - 3 * 3600000).toISOString(),
      cnpjPrestador: "54836577000167",
      inscricaoMunicipal: "13534157",
      tributacaoRps: "T",
      codigoServico: "04391",
      codigoCnae: "865004",
      codigoNBS: "117240800",
      discriminacao: "Sessao de fisioterapia - teste",
      valorServicos: "100.00",
      valorDeducoes: "0.00",
      aliquota: "0.0200",
      issRetido: false,
      tomadorCpfCnpj: "11144477735",
      tomadorInscricaoMunicipal: "",
      tomadorRazaoSocial: "Paciente Teste",
      tomadorEmail: "",
      codigoMunicipio: "3550308",
      isSimplesNacional: true,
    };
    
    // Import the format function to see what it produces
    const { formatValorSemDecimal } = await import("../lib/nfseSPClient");
    const formattedValor = formatValorSemDecimal(rpsParams.valorServicos);
    const formattedDed = formatValorSemDecimal(rpsParams.valorDeducoes);
    
    const tomadorDigits = (rpsParams.tomadorCpfCnpj || "").replace(/\D/g, "");
    const indicadorCalc = tomadorDigits ? (tomadorDigits.length <= 11 ? "1" : "2") : "3";
    const cpfCalc = indicadorCalc === "3" ? "" : tomadorDigits;
    
    const result = await envioRPS(c.env, rpsParams);

    return c.json({
      cert: true,
      debug: {
        tomadorDigits,
        indicadorCalc,
        cpfCalc,
        codigoServico: rpsParams.codigoServico,
        valorServicos: rpsParams.valorServicos,
        formattedValor,
        formattedDed,
        expectedLast15: indicadorCalc + cpfCalc.padStart(14, "0"),
      },
      mtls: true,
      success: result.success,
      alertas: result.alertas,
      erros: result.erros,
    });
  } catch (err: any) {
    return c.json({ cert: true, mtls: false, error: err.message }, 502);
  }
});

app.get("/debug-xml", async (c) => {
  try {
    const rpsParams = {
      numero: "999",
      serie: "RPS",
      tipo: "RPS",
      dataEmissao: new Date(Date.now() - 3 * 3600000).toISOString(),
      cnpjPrestador: "54836577000167",
      inscricaoMunicipal: "13534157",
      tributacaoRps: "T",
      codigoServico: "04391",
      codigoCnae: "865004",
      codigoNBS: "117240800",
      discriminacao: "Sessao de fisioterapia - debug",
      valorServicos: "100.00",
      valorDeducoes: "0.00",
      aliquota: "0.0200",
      issRetido: false,
      tomadorCpfCnpj: "11144477735",
      tomadorInscricaoMunicipal: "",
      tomadorRazaoSocial: "Paciente Teste",
      tomadorEmail: "",
      codigoMunicipio: "3550308",
      isSimplesNacional: true,
    };
    
    const result = await debugBuildXmlMessage(c.env, rpsParams);
    return c.json({
      rpsXml: result.rpsXml,
      innerXml: result.xml,
      rpsXmlEnd: result.rpsXml.slice(-100),
      innerXmlEnd: result.xml.slice(-100),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
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
    { apiKey: "contabilidade_email", column: "contabilidade_email" },
    { apiKey: "contabilidade_automacao_ativa", column: "contabilidade_automacao_ativa" },
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
		        codigo_verificacao, link_nfse, link_danfse, tomador_nome, created_at,
            enviado_contabilidade_at
		 FROM nfse_records
		 WHERE ${conditions.join(" AND ")}
		 ORDER BY data_emissao DESC
		 LIMIT $${params.length}`,
    params,
  );

  return c.json({ data: result.rows || [] });
});

app.get("/test-connection", async (c) => {
  if (!hasSPCertConfig(c.env)) {
    return c.json({ error: "Certificado não configurado", cert: false, mtls: false }, 422);
  }

  const { consultaCNPJ } = await import("../lib/nfseSPClient");

  try {
    const result = await consultaCNPJ(c.env, "54836577000167");
    return c.json({
      cert: true,
      mtls: true,
      success: result.success,
      inscricoes: result.inscricoes,
      erros: result.erros,
    });
  } catch (err: any) {
    return c.json({ cert: true, mtls: false, error: err.message }, 502);
  }
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
    discriminacao?: string;
    tomador_nome: string;
    tomador_cpf_cnpj?: string;
    tomador_email?: string;
    aliquota_iss?: number;
  };

  if (!body.valor_servico || !body.tomador_nome) {
    return c.json({ error: "valor_servico e tomador_nome são obrigatórios" }, 400);
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
  
  // Horário de Brasília (UTC-3)
  const dataEmissao = new Date(Date.now() - 3 * 3600000);

  // Build default discrimination if not provided
  let discriminacao = body.discriminacao;
  if (!discriminacao) {
    const dateStr = dataEmissao.toLocaleDateString("pt-BR");
    discriminacao = `Paciente ${body.tomador_nome}`;
    if (body.tomador_cpf_cnpj) {
      const cleanCpf = body.tomador_cpf_cnpj.replace(/\D/g, "");
      const formattedCpf = cleanCpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
      discriminacao += `, CPF ${formattedCpf}`;
    }
    discriminacao += `, realizou sessão de fisioterapia no dia ${dateStr}.\n`;
    discriminacao += `Efetuou o pagamento no valor de R$ ${body.valor_servico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para a empresa ${cfg.razao_social || "Mooca Fisioterapia RA Ltda"}, CNPJ: ${cfg.cnpj_prestador || "54.836.577/0001-67"}.\n`;
    discriminacao += `- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 8,98%`;
  }

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
      dataEmissao.toISOString(),
      body.valor_servico,
      aliquota,
      valorIss,
      cfg.codigo_servico_padrao ?? "04391",
      discriminacao,
      body.tomador_nome,
      body.tomador_cpf_cnpj?.replace(/\D/g, "") || null,
      body.tomador_email || null,
    ],
  );

  return c.json({ data: result.rows[0] });
});

// ===== ENVIO DIRETO — PREFEITURA DE SÃO PAULO =====

app.post("/send/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const pool = createPool(c.env);
  const nfseResult = await pool.query(
    `SELECT status FROM nfse_records WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );
  if (!nfseResult.rows.length)
    return c.json({ error: "NFS-e não encontrada" }, 404);

  const nfse = nfseResult.rows[0];
  if (nfse.status !== "rascunho" && nfse.status !== "falhou") {
    return c.json({ error: `NFS-e não pode ser enviada no status "${nfse.status}"` }, 422);
  }

  try {
    // Trigger Durable Workflow for robust emission
    const workflow = await c.env.WORKFLOW_NFSE.create({
      params: {
        nfseId: id,
        organizationId: user.organizationId,
      }
    });

    await pool.query(
      `UPDATE nfse_records SET status = 'aguardando_prefeitura', workflow_id = $1 WHERE id = $2`,
      [workflow.id, id]
    );

    return c.json({ 
      success: true, 
      message: "Emissão iniciada em segundo plano. O sistema tentará transmitir até que a prefeitura responda.",
      workflowId: workflow.id 
    });
  } catch (err: any) {
    console.error("[NFSe] Erro ao iniciar workflow:", err);
    return c.json({ error: `Falha ao iniciar processo: ${err.message}` }, 500);
  }
});

// ===== TESTE DE ENVIO (valida sem gerar nota) =====

app.post("/test/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  if (!hasSPCertConfig(c.env))
    return c.json(
      {
        error:
          "Certificado digital não configurado. Configure NFSE_SP_CERT, NFSE_SP_CERT_PEM e NFSE_SP_KEY_PEM.",
      },
      422,
    );

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
      tipo: "RPS",
      dataEmissao: nfse.data_emissao,
      cnpjPrestador: nfse.cnpj_prestador?.replace(/\D/g, "") || "",
      inscricaoMunicipal: nfse.inscricao_municipal?.replace(/\D/g, "") || "",
      tributacaoRps: "T",
      codigoServico: nfse.codigo_servico ?? "1401",
      codigoCnae: nfse.cnae ?? "865004",
      codigoNBS: "117240800",
      discriminacao: nfse.discriminacao,
      valorServicos: Number(nfse.valor_servico).toFixed(2),
      valorDeducoes: "0.00",
      aliquota: Number(nfse.aliquota_iss ?? 0.02).toFixed(4),
      issRetido: false,
      tomadorCpfCnpj: nfse.tomador_cpf_cnpj?.replace(/\D/g, "") || "",
      tomadorInscricaoMunicipal: "",
      tomadorRazaoSocial: nfse.tomador_nome || "",
      tomadorEmail: nfse.tomador_email || "",
      codigoMunicipio: nfse.municipio_prestacao ?? "3550308",
      isSimplesNacional: !!nfse.optante_simples,
      tpOpcaoSimples: nfse.tp_opcao_simples,
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
  if (!hasSPCertConfig(c.env))
    return c.json(
      {
        error:
          "Certificado digital não configurado. Configure NFSE_SP_CERT, NFSE_SP_CERT_PEM e NFSE_SP_KEY_PEM.",
      },
      422,
    );

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
  if (!hasSPCertConfig(c.env))
    return c.json(
      {
        error:
          "Certificado digital não configurado. Configure NFSE_SP_CERT, NFSE_SP_CERT_PEM e NFSE_SP_KEY_PEM.",
      },
      422,
    );

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
    `SELECT n.*, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal, cfg.razao_social,
            cfg.contabilidade_email, cfg.contabilidade_automacao_ativa
		 FROM nfse_records n
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

  // --- AUTOMAÇÃO CONTABILIDADE (Cancelamento) ---
  if (nfse.contabilidade_automacao_ativa && nfse.contabilidade_email) {
    try {
      await sendNfseCancellationToAccounting(c.env, nfse.contabilidade_email, {
        numeroNfse: nfse.numero_nfse,
        tomadorNome: nfse.tomador_nome,
        valor: Number(nfse.valor_servico),
        razaoSocialPrestador: nfse.razao_social || "FisioFlow Client",
      });
      console.log(`[NFSe] Cancelamento enviado para contabilidade: ${nfse.contabilidade_email}`);
    } catch (mailErr) {
      console.error("[NFSe] Falha ao notificar cancelamento para contabilidade:", mailErr);
    }
  }

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

// ===== EMISSÃO EM LOTE =====

app.post("/batch", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as {
    start_date: string;
    end_date: string;
    dry_run?: boolean;
  };

  if (!body.start_date || !body.end_date) {
    return c.json({ error: "start_date e end_date são obrigatórios (YYYY-MM-DD)" }, 400);
  }

  const pool = createPool(c.env);

  // Find sessions in period without an NFS-e record
  const sessionsResult = await pool.query(
    `SELECT s.id, s.patient_id, s.date, p.full_name AS patient_name, p.phone AS patient_phone,
            p.cpf AS patient_cpf
     FROM sessions s
     LEFT JOIN patients p ON p.id = s.patient_id
     LEFT JOIN nfse_records nr ON nr.appointment_id = s.appointment_id
       AND nr.organization_id = $1 AND nr.status != 'cancelado'
     WHERE s.organization_id = $1
       AND s.status = 'finalized'
       AND s.date BETWEEN $2 AND $3
       AND nr.id IS NULL
     ORDER BY s.date ASC
     LIMIT 100`,
    [user.organizationId, body.start_date, body.end_date],
  );

  const sessions = sessionsResult.rows;

  if (body.dry_run) {
    return c.json({ data: { count: sessions.length, sessions } });
  }

  if (!sessions.length) {
    return c.json({ data: { queued: 0, message: "Nenhuma sessão sem NFS-e no período." } });
  }

  // Queue each session for async NFS-e generation
  const queued: string[] = [];
  if (c.env.BACKGROUND_QUEUE) {
    for (const session of sessions) {
      await c.env.BACKGROUND_QUEUE.send({
        type: "GENERATE_NFSE",
        payload: {
          sessionId: session.id,
          patientId: session.patient_id,
          patientName: session.patient_name,
          patientCpf: session.patient_cpf,
          patientPhone: session.patient_phone,
          organizationId: user.organizationId,
          date: session.date,
        },
      }).catch(() => {});
      queued.push(session.id);
    }
  }

  // Push notification to user when batch is kicked off
  if (c.env.VAPID_PRIVATE_KEY) {
    const { sendPushToUser } = await import("../lib/webpush");
    c.executionCtx.waitUntil(
      sendPushToUser(user.uid, {
        title: `NFS-e em lote iniciada — ${queued.length} notas`,
        body: `Período ${body.start_date} → ${body.end_date}. As notas serão processadas em segundo plano.`,
        url: "/financeiro/nfse",
        tag: "nfse-batch",
      }, c.env).catch(() => {}),
    );
  }

  return c.json({ data: { queued: queued.length, sessionIds: queued } });
});

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
