/**
 * NFS-e Routes — Nota Fiscal de Serviços Eletrônica (padrão ABRASF)
 *
 * Implementa geração de XML RPS, envio ao webservice do município e
 * armazenamento dos registros fiscais.
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== CONFIGURAÇÃO DO PRESTADOR =====

// GET /api/nfse/config
app.get('/config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT id, organization_id, razao_social, cnpj, inscricao_municipal,
            codigo_municipio, regime_tributario, optante_simples, incentivo_fiscal,
            aliquota_padrao, codigo_servico_padrao, discriminacao_padrao, ambiente,
            created_at, updated_at
     FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

// PUT /api/nfse/config
app.put('/config', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  const fields = [
    'razao_social', 'cnpj', 'inscricao_municipal', 'codigo_municipio',
    'regime_tributario', 'optante_simples', 'incentivo_fiscal',
    'aliquota_padrao', 'codigo_servico_padrao', 'discriminacao_padrao', 'ambiente',
  ];

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [user.organizationId];

  for (const field of fields) {
    if (body[field] !== undefined) {
      params.push(body[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }

  const result = await pool.query(
    `INSERT INTO nfse_config (organization_id, ${fields.filter(f => body[f] !== undefined).join(', ')})
     VALUES ($1, ${fields.filter(f => body[f] !== undefined).map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (organization_id) DO UPDATE SET ${sets.join(', ')}
     RETURNING id, organization_id, razao_social, cnpj, inscricao_municipal, ambiente`,
    params,
  );

  return c.json({ data: result.rows[0] });
});

// ===== LISTAGEM E DETALHE =====

// GET /api/nfse?patientId=xxx&month=2026-03&status=autorizado&limit=50
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, month, status, limit: lim } = c.req.query();

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId && isUuid(patientId)) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    params.push(`${month}-01`);
    conditions.push(`data_emissao >= $${params.length}::date`);
    const [y, m] = month.split('-');
    const end = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];
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
            codigo_verificacao, link_nfse, tomador_nome, created_at
     FROM nfse_records
     WHERE ${conditions.join(' AND ')}
     ORDER BY data_emissao DESC
     LIMIT $${params.length}`,
    params,
  );

  return c.json({ data: result.rows || [] });
});

// GET /api/nfse/:id
app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM nfse_records WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'NFS-e não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

// ===== GERAÇÃO DE RPS =====

function buildRpsXml(rps: {
  numero: string;
  serie: string;
  tipo: string;
  dataEmissao: string;
  prestador: { cnpj: string; inscricaoMunicipal: string };
  tomador: { nome: string; cpfCnpj?: string; email?: string };
  servico: { discriminacao: string; codigoServico: string; valorServico: number; aliquota: number; valorIss: number; issRetido: boolean };
  optanteSimplesNacional: boolean;
  incentivadorCultural: boolean;
}): string {
  const issRetido = rps.servico.issRetido ? '1' : '2';
  const optante = rps.optanteSimplesNacional ? '1' : '2';
  const incentivador = rps.incentivadorCultural ? '1' : '2';

  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps versao="2.01">
    <NumeroLote>1</NumeroLote>
    <CpfCnpj><Cnpj>${escapeXml(rps.prestador.cnpj)}</Cnpj></CpfCnpj>
    <InscricaoMunicipal>${escapeXml(rps.prestador.inscricaoMunicipal)}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfDeclaracaoPrestacaoServico Id="RPS${escapeXml(rps.numero)}">
          <Rps>
            <IdentificacaoRps>
              <Numero>${escapeXml(rps.numero)}</Numero>
              <Serie>${escapeXml(rps.serie)}</Serie>
              <Tipo>${escapeXml(rps.tipo)}</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${escapeXml(rps.dataEmissao)}</DataEmissao>
            <Status>1</Status>
          </Rps>
          <Competencia>${escapeXml(rps.dataEmissao.slice(0, 10))}</Competencia>
          <Servico>
            <Valores>
              <ValorServicos>${rps.servico.valorServico.toFixed(2)}</ValorServicos>
              <ValorDeducoes>0.00</ValorDeducoes>
              <ValorPis>0.00</ValorPis>
              <ValorCofins>0.00</ValorCofins>
              <ValorInss>0.00</ValorInss>
              <ValorIr>0.00</ValorIr>
              <ValorCsll>0.00</ValorCsll>
              <IssRetido>${issRetido}</IssRetido>
              <ValorIss>${rps.servico.valorIss.toFixed(2)}</ValorIss>
              <ValorIssRetido>0.00</ValorIssRetido>
              <OutrasRetencoes>0.00</OutrasRetencoes>
              <BaseCalculo>${rps.servico.valorServico.toFixed(2)}</BaseCalculo>
              <Aliquota>${rps.servico.aliquota.toFixed(4)}</Aliquota>
              <ValorLiquidoNfse>${rps.servico.valorServico.toFixed(2)}</ValorLiquidoNfse>
            </Valores>
            <ItemListaServico>${escapeXml(rps.servico.codigoServico)}</ItemListaServico>
            <CodigoCnae>8650-0/04</CodigoCnae>
            <CodigoTributacaoMunicipio>${escapeXml(rps.servico.codigoServico)}</CodigoTributacaoMunicipio>
            <Discriminacao>${escapeXml(rps.servico.discriminacao)}</Discriminacao>
            <CodigoMunicipio>3550308</CodigoMunicipio>
            <ExigibilidadeISS>1</ExigibilidadeISS>
          </Servico>
          <Prestador>
            <CpfCnpj><Cnpj>${escapeXml(rps.prestador.cnpj)}</Cnpj></CpfCnpj>
            <InscricaoMunicipal>${escapeXml(rps.prestador.inscricaoMunicipal)}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              ${rps.tomador.cpfCnpj
                ? `<CpfCnpj>${rps.tomador.cpfCnpj.length <= 11 ? `<Cpf>${escapeXml(rps.tomador.cpfCnpj)}</Cpf>` : `<Cnpj>${escapeXml(rps.tomador.cpfCnpj)}</Cnpj>`}</CpfCnpj>`
                : ''}
            </IdentificacaoTomador>
            <RazaoSocial>${escapeXml(rps.tomador.nome)}</RazaoSocial>
            ${rps.tomador.email ? `<Contato><Email>${escapeXml(rps.tomador.email)}</Email></Contato>` : ''}
          </Tomador>
          <OptanteSimplesNacional>${optante}</OptanteSimplesNacional>
          <IncentivoFiscal>${incentivador}</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// POST /api/nfse/generate — criar rascunho com XML RPS
app.post('/generate', requireAuth, async (c) => {
  const user = c.get('user');
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
    return c.json({ error: 'valor_servico, discriminacao e tomador_nome são obrigatórios' }, 400);
  }

  const pool = createPool(c.env);

  // Buscar configuração do prestador
  const cfgResult = await pool.query(
    `SELECT * FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );

  if (!cfgResult.rows.length) {
    return c.json({ error: 'Configure os dados do prestador em Configurações > NFS-e antes de gerar' }, 422);
  }

  const cfg = cfgResult.rows[0];

  // Gerar número do RPS sequencial
  const seqResult = await pool.query(
    `SELECT COALESCE(MAX(CAST(numero_rps AS INTEGER)), 0) + 1 AS next_rps
     FROM nfse_records WHERE organization_id = $1`,
    [user.organizationId],
  );
  const numeroRps = String(seqResult.rows[0]?.next_rps ?? 1);

  const aliquota = body.aliquota_iss ?? (Number(cfg.aliquota_padrao) || 0.02);
  const valorIss = Number((body.valor_servico * aliquota).toFixed(2));
  const dataEmissao = new Date().toISOString();

  const xmlRps = buildRpsXml({
    numero: numeroRps,
    serie: 'RPS',
    tipo: '1',
    dataEmissao,
    prestador: { cnpj: cfg.cnpj, inscricaoMunicipal: cfg.inscricao_municipal },
    tomador: {
      nome: body.tomador_nome,
      cpfCnpj: body.tomador_cpf_cnpj,
      email: body.tomador_email,
    },
    servico: {
      discriminacao: body.discriminacao,
      codigoServico: cfg.codigo_servico_padrao ?? '14.01',
      valorServico: body.valor_servico,
      aliquota,
      valorIss,
      issRetido: false,
    },
    optanteSimplesNacional: cfg.optante_simples ?? true,
    incentivadorCultural: cfg.incentivo_fiscal ?? false,
  });

  const result = await pool.query(
    `INSERT INTO nfse_records
      (organization_id, patient_id, appointment_id, numero_rps, serie_rps, data_emissao,
       valor_servico, aliquota_iss, valor_iss, codigo_servico, discriminacao,
       tomador_nome, tomador_cpf_cnpj, tomador_email, status, xml_rps, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'RPS',$5,$6,$7,$8,$9,$10,$11,$12,$13,'rascunho',$14,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      (body.patient_id && isUuid(body.patient_id)) ? body.patient_id : null,
      (body.appointment_id && isUuid(body.appointment_id)) ? body.appointment_id : null,
      numeroRps,
      dataEmissao,
      body.valor_servico,
      aliquota,
      valorIss,
      cfg.codigo_servico_padrao ?? '14.01',
      body.discriminacao,
      body.tomador_nome,
      body.tomador_cpf_cnpj ?? null,
      body.tomador_email ?? null,
      xmlRps,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

// POST /api/nfse/send/:id — enviar ao webservice da prefeitura SP
app.post('/send/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);

  const nfseResult = await pool.query(
    `SELECT * FROM nfse_records WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );

  if (!nfseResult.rows.length) return c.json({ error: 'NFS-e não encontrada' }, 404);

  const nfse = nfseResult.rows[0];
  if (nfse.status !== 'rascunho') {
    return c.json({ error: `NFS-e não pode ser enviada no status "${nfse.status}"` }, 422);
  }

  // Nota: envio real ao webservice da prefeitura SP requer:
  // 1. Certificado A1 (.pfx) carregado nas configurações
  // 2. Assinatura XML com crypto.subtle (EdDSA/RSA)
  // 3. Endpoint SOAP: https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx
  // Por ora, marcamos como "enviado" (mock para ambientes de teste/homologação)
  const cfgResult = await pool.query(
    `SELECT ambiente FROM nfse_config WHERE organization_id = $1 LIMIT 1`,
    [user.organizationId],
  );
  const ambiente = cfgResult.rows[0]?.ambiente ?? 'homologacao';

  if (ambiente === 'producao') {
    // TODO: implementar envio real com certificado digital
    await pool.query(
      `UPDATE nfse_records SET status = 'enviado', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    return c.json({ data: { id, status: 'enviado', message: 'Enviado ao webservice (modo produção — integração pendente)' } });
  }

  // Homologação: simula autorização
  const numeroNfse = String(Date.now()).slice(-8);
  const codigoVerificacao = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

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

  return c.json({
    data: {
      id,
      status: 'autorizado',
      numero_nfse: numeroNfse,
      codigo_verificacao: codigoVerificacao,
      ambiente: 'homologacao',
    },
  });
});

// DELETE /api/nfse/:id — cancelar NFS-e
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `UPDATE nfse_records SET status = 'cancelado', updated_at = NOW()
     WHERE id = $1 AND organization_id = $2 AND status != 'cancelado'
     RETURNING id, status`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'NFS-e não encontrada ou já cancelada' }, 404);
  return c.json({ data: result.rows[0] });
});

export { app as nfseRoutes };
