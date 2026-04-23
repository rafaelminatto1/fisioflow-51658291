/**
 * DANFSe — Geração de PDF da Nota Fiscal de Serviços Eletrônica
 *
 * Gera HTML formatado, converte para PDF via Quick Actions,
 * e salva no Cloudflare R2 para download permanente.
 */
import type { Env } from '../types/env';
import { generatePdfFromHtml } from './pdf';

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatCurrency(value: number): string {
	return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
	if (!dateStr) return '';
	try {
		const d = new Date(dateStr);
		return d.toLocaleDateString('pt-BR');
	} catch {
		return dateStr;
	}
}

export function generateDanfseHtml(nfse: Record<string, any>, cfg: Record<string, any>): string {
	const valorServico = Number(nfse.valor_servico) || 0;
	const aliquota = Number(nfse.aliquota_iss) || 0;
	const valorIss = Number(nfse.valor_iss) || 0;

	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DANFSe - NFS-e ${escapeHtml(nfse.numero_nfse || '')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; padding: 10mm; }
  .header { border: 2px solid #000; padding: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .header .title { font-size: 14px; font-weight: bold; text-align: center; }
  .header .nfse-info { text-align: right; }
  .section { border: 1px solid #000; margin-bottom: 6px; }
  .section-title { background: #eee; padding: 4px 8px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; }
  .section-body { padding: 6px 8px; }
  .row { display: flex; margin-bottom: 2px; }
  .label { width: 160px; font-weight: bold; flex-shrink: 0; }
  .value { flex: 1; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
  .footer { border: 1px solid #000; padding: 6px 8px; margin-top: 6px; font-size: 9px; text-align: center; }
  . watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,0.05); font-weight: bold; pointer-events: none; }
  ${nfse.status === 'cancelado' ? '.cancel-stamp { border: 3px solid red; color: red; font-size: 24px; font-weight: bold; padding: 10px; text-align: center; margin: 10px 0; transform: rotate(-15deg); }' : ''}
</style>
</head>
<body>
${nfse.status === 'cancelado' ? '<div class="cancel-stamp">CANCELADA</div>' : ''}

<div class="header">
  <div style="flex:1;">
    <div class="title">NOTA FISCAL DE SERVIÇOS ELETRÔNICA - DANFSE</div>
    <div style="text-align:center; font-size:10px; margin-top:4px;">Prefeitura do Município de São Paulo</div>
  </div>
  <div class="nfse-info" style="flex:1;">
    <div>NFS-e: <strong>${escapeHtml(nfse.numero_nfse || '---')}</strong></div>
    <div>Código Verificação: <strong>${escapeHtml(nfse.codigo_verificacao || '---')}</strong></div>
    <div>Data Emissão: <strong>${formatDate(nfse.data_emissao)}</strong></div>
    <div>RPS: ${escapeHtml(nfse.numero_rps || '---')} / Série: ${escapeHtml(nfse.serie_rps || 'RPS')}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">PRESTADOR DE SERVIÇOS</div>
  <div class="section-body">
    <div class="grid">
      <div><span class="label">Razão Social:</span> ${escapeHtml(cfg.razao_social || '')}</div>
      <div><span class="label">CNPJ:</span> ${escapeHtml(cfg.cnpj || '')}</div>
      <div><span class="label">Insc. Municipal:</span> ${escapeHtml(cfg.inscricao_municipal || '')}</div>
      <div><span class="label">Município:</span> São Paulo - SP</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">TOMADOR DE SERVIÇOS</div>
  <div class="section-body">
    <div class="grid">
      <div><span class="label">Razão Social / Nome:</span> ${escapeHtml(nfse.tomador_nome || '')}</div>
      <div><span class="label">CPF/CNPJ:</span> ${escapeHtml(nfse.tomador_cpf_cnpj || '---')}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">DISCRIMINAÇÃO DOS SERVIÇOS</div>
  <div class="section-body">
    <div style="white-space: pre-wrap;">${escapeHtml(nfse.discriminacao || '')}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">CÁLCULO DO IMPOSTO</div>
  <div class="section-body">
    <div class="grid">
      <div><span class="label">Código Serviço:</span> ${escapeHtml(nfse.codigo_servico || cfg.codigo_servico_padrao || '14.01')}</div>
      <div><span class="label">CNAE:</span> ${escapeHtml(cfg.cnae || '8650-0/04')}</div>
      <div><span class="label">Valor Serviços:</span> <strong>${formatCurrency(valorServico)}</strong></div>
      <div><span class="label">Alíquota ISS:</span> ${(aliquota * 100).toFixed(2)}%</div>
      <div><span class="label">Valor ISS:</span> ${formatCurrency(valorIss)}</div>
      <div><span class="label">ISS Retido:</span> Não</div>
      <div><span class="label">Valor Líquido:</span> <strong>${formatCurrency(valorServico)}</strong></div>
      <div><span class="label">Regime Tributação:</span> Simples Nacional (Anexo III)</div>
    </div>
  </div>
</div>

${nfse.link_nfse ? `<div class="footer">Consulta em: ${escapeHtml(nfse.link_nfse)}</div>` : ''}
</body>
</html>`;
}

export function getDanfseR2Key(orgId: string, nfseId: string, dataEmissao: string): string {
	const d = dataEmissao ? new Date(dataEmissao) : new Date();
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	return `nfse/${orgId}/${year}/${month}/${nfseId}.pdf`;
}

export async function generateAndSaveDanfse(
	env: Env,
	nfse: Record<string, any>,
	cfg: Record<string, any>,
): Promise<string | null> {
	if (!env.BROWSER) {
		console.warn('[DANFSe] Browser binding não disponível, pulando geração de PDF');
		return null;
	}

	const html = generateDanfseHtml(nfse, cfg);
	const pdfBytes = await generatePdfFromHtml(env, html);

	const key = getDanfseR2Key(nfse.organization_id, nfse.id, nfse.data_emissao);

	await env.MEDIA_BUCKET.put(key, pdfBytes, {
		httpMetadata: { contentType: 'application/pdf' },
		customMetadata: {
			nfse_id: nfse.id,
			organization_id: nfse.organization_id,
			numero_nfse: nfse.numero_nfse || '',
			type: 'danfse',
		},
	});

	const publicUrl = env.R2_PUBLIC_URL?.replace(/\/$/, '');
	return publicUrl ? `${publicUrl}/${key}` : key;
}

export async function getDanfsePresignedUrl(
	env: Env,
	key: string,
	expiresIn = 3600,
): Promise<string | null> {
	if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		const publicUrl = env.R2_PUBLIC_URL?.replace(/\/$/, '');
		return publicUrl ? `${publicUrl}/${key}` : null;
	}

	const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
	const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

	const s3 = new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
	});

	const command = new GetObjectCommand({
		Bucket: 'fisioflow-media',
		Key: key,
	});

	return getSignedUrl(s3, command, { expiresIn });
}
