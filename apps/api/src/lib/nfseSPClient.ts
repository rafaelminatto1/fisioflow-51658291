/**
 * NFS-e São Paulo — SOAP Client direto para a Prefeitura
 *
 * Webservice síncrono: https://nfews.prefeitura.sp.gov.br/lotenfe.asmx
 * Usa mTLS binding (env.NFSE_SP_CERT) para autenticação TLS com certificado digital.
 * Layout v1 (schemas v01-1) — pré-Reforma Tributária.
 *
 * Simples Nacional Anexo III: tpOpcaoSimples = 4
 */
import type { Env } from '../types/env';
import { signXmlEnveloped, signRps, extractCertB64 } from './nfseXmlSigner';

const SP_WS_URL = 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx';
const SOAP_ACTION_NS = 'http://www.prefeitura.sp.gov.br/nfe';

export interface SPNfseResult {
	success: boolean;
	numeroLote?: string;
	numeroNfse?: string;
	codigoVerificacao?: string;
	dataEmissao?: string;
	linkNfse?: string;
	linkDanfse?: string;
	erros?: Array<{ codigo: string; descricao: string }>;
	alertas?: Array<{ codigo: string; descricao: string }>;
}

export function hasSPCertConfig(env: Env): boolean {
	return !!(env.NFSE_SP_CERT && env.NFSE_SP_CERT_PEM && env.NFSE_SP_KEY_PEM);
}

function escapeXml(s: string): string {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function buildSoapEnvelope(method: string, xmlBody: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap12:Body><${method} xmlns="${SOAP_ACTION_NS}">${xmlBody}</${method}></soap12:Body></soap12:Envelope>`;
}

async function soapCall(env: Env, method: string, xmlBody: string): Promise<string> {
	const url = SP_WS_URL;
	const soapXml = buildSoapEnvelope(method, xmlBody);
	const fetchFn = env.NFSE_SP_CERT!.fetch.bind(env.NFSE_SP_CERT);

	const resp = await fetchFn(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/soap+xml; charset=utf-8',
		},
		body: soapXml,
	});

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`SP NFSe SOAP ${method} falhou (${resp.status}): ${text.slice(0, 500)}`);
	}

	return resp.text();
}

function parseXmlValue(xml: string, tag: string): string | undefined {
	const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
	const match = xml.match(regex);
	return match ? match[1].trim() : undefined;
}

function parseErros(xml: string): Array<{ codigo: string; descricao: string }> {
	const erros: Array<{ codigo: string; descricao: string }> = [];
	const erroBlocks = xml.split(/<Erro>/i).slice(1);
	for (const block of erroBlocks) {
		const codigo = parseXmlValue(block, 'Codigo') ?? '';
		const descricao = parseXmlValue(block, 'Descricao') ?? '';
		if (codigo || descricao) {
			erros.push({ codigo, descricao });
		}
	}
	return erros;
}

function parseAlertas(xml: string): Array<{ codigo: string; descricao: string }> {
	const alertas: Array<{ codigo: string; descricao: string }> = [];
	const alertaBlocks = xml.split(/<Alerta>/i).slice(1);
	for (const block of alertaBlocks) {
		const codigo = parseXmlValue(block, 'Codigo') ?? '';
		const descricao = parseXmlValue(block, 'Descricao') ?? '';
		if (codigo || descricao) {
			alertas.push({ codigo, descricao });
		}
	}
	return alertas;
}

function buildNfseLink(numeroNfse: string, codigoVerificacao: string): string {
	return `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${numeroNfse}&c=${codigoVerificacao}`;
}

function parseNfseFromResponse(xml: string): SPNfseResult {
	const erros = parseErros(xml);
	if (erros.length > 0) {
		return { success: false, erros, alertas: parseAlertas(xml) };
	}

	const numeroNfse = parseXmlValue(xml, 'NumeroNFe') ?? parseXmlValue(xml, 'Numero');
	const codigoVerificacao = parseXmlValue(xml, 'CodigoVerificacao');
	const dataEmissao = parseXmlValue(xml, 'DataEmissaoNFe') ?? parseXmlValue(xml, 'DataEmissao');
	const linkNfse = numeroNfse && codigoVerificacao ? buildNfseLink(numeroNfse, codigoVerificacao) : undefined;

	return {
		success: true,
		numeroNfse,
		codigoVerificacao,
		dataEmissao,
		linkNfse,
		alertas: parseAlertas(xml),
	};
}

export async function envioRPS(
	env: Env,
	rpsParams: {
		numero: string;
		serie: string;
		tipo: string;
		dataEmissao: string;
		cnpjPrestador: string;
		inscricaoMunicipal: string;
		codigoServico: string;
		codigoCnae: string;
		discriminacao: string;
		valorServicos: string;
		valorDeducoes: string;
		valorIss: string;
		aliquota: string;
		issRetido: string;
		tomadorCpfCnpj: string;
		tomadorInscricaoMunicipal: string;
		tomadorRazaoSocial: string;
		tomadorEmail: string;
		tpOpcaoSimples: number;
		codigoMunicipio: string;
	},
): Promise<SPNfseResult> {
	const p = rpsParams;

	const assinatura = await signRps(
		{
			numero: p.numero,
			serie: p.serie,
			tipo: p.tipo,
			dataEmissao: p.dataEmissao,
			issRetido: p.issRetido,
			valorServicos: p.valorServicos,
			valorDeducoes: p.valorDeducoes,
			codigoServico: p.codigoServico,
			tomadorCpfCnpj: p.tomadorCpfCnpj,
			tomadorInscricaoMunicipal: p.tomadorInscricaoMunicipal,
			atividadeAssinada: p.codigoCnae.replace(/[^0-9]/g, ''),
			codigoMunicipio: p.codigoMunicipio,
		},
		env.NFSE_SP_KEY_PEM!,
	);

	const tomadorCpfCnpjTag = p.tomadorCpfCnpj
		? `<CpfCnpj>${p.tomadorCpfCnpj.length <= 11 ? `<Cpf>${escapeXml(p.tomadorCpfCnpj)}</Cpf>` : `<Cnpj>${escapeXml(p.tomadorCpfCnpj)}</Cnpj>`}</CpfCnpj>`
		: '';

	const rpsXml = `<RPS><IdentificacaoRPS><NumeroRPS>${escapeXml(p.numero)}</NumeroRPS><SerieRPS>${escapeXml(p.serie)}</SerieRPS><TipoRPS>${escapeXml(p.tipo)}</TipoRPS></IdentificacaoRPS><DataEmissao>${escapeXml(p.dataEmissao.slice(0, 10))}</DataEmissao><StatusRPS>N</StatusRPS><TributacaoRPS>${String(p.tpOpcaoSimples).padStart(2, '0')}</TributacaoRPS><ValorServicos>${p.valorServicos}</ValorServicos><ValorDeducoes>${p.valorDeducoes}</ValorDeducoes><ValorPIS>0</ValorPIS><ValorCOFINS>0</ValorCOFINS><ValorINSS>0</ValorINSS><ValorIR>0</ValorIR><ValorCSLL>0</ValorCSLL><CodigoServico>${escapeXml(p.codigoServico)}</CodigoServico><AliquotaServicos>${p.aliquota}</AliquotaServicos><ISSRetido>${p.issRetido}</ISSRetido><CodigoCNAE>${escapeXml(p.codigoCnae)}</CodigoCNAE><CodigoMunicipio>${escapeXml(p.codigoMunicipio)}</CodigoMunicipio><MunicipioPrestacao>${escapeXml(p.codigoMunicipio)}</MunicipioPrestacao><Operacao>1</Operacao><Prestador><CpfCnpj><Cnpj>${escapeXml(p.cnpjPrestador)}</Cnpj></CpfCnpj><InscricaoMunicipal>${escapeXml(p.inscricaoMunicipal)}</InscricaoMunicipal></Prestador><Tomador>${tomadorCpfCnpjTag}<InscricaoMunicipal>${escapeXml(p.tomadorInscricaoMunicipal)}</InscricaoMunicipal><RazaoSocial>${escapeXml(p.tomadorRazaoSocial)}</RazaoSocial>${p.tomadorEmail ? `<Email>${escapeXml(p.tomadorEmail)}</Email>` : ''}</Tomador><Discriminacao>${escapeXml(p.discriminacao)}</Discriminacao><ValorISS>${p.valorIss}</ValorISS><Assinatura>${assinatura}</Assinatura></RPS>`;

	const certB64 = extractCertB64(env.NFSE_SP_CERT_PEM!);
	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(p.cnpjPrestador)}</CNPJ></CPFCNPJRemetente><tpOpcaoSimples>${p.tpOpcaoSimples}</tpOpcaoSimples>`;

	const signedRps = await signXmlEnveloped(rpsXml, env.NFSE_SP_CERT_PEM!, env.NFSE_SP_KEY_PEM!, '');

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>${signedRps}`;

	const raw = await soapCall(env, 'EnvioRPS', xmlBody);
	return parseNfseFromResponse(raw);
}

export async function testeEnvioLoteRPS(
	env: Env,
	rpsParams: Parameters<typeof envioRPS>[1],
): Promise<SPNfseResult> {
	const p = rpsParams;

	const assinatura = await signRps(
		{
			numero: p.numero,
			serie: p.serie,
			tipo: p.tipo,
			dataEmissao: p.dataEmissao,
			issRetido: p.issRetido,
			valorServicos: p.valorServicos,
			valorDeducoes: p.valorDeducoes,
			codigoServico: p.codigoServico,
			tomadorCpfCnpj: p.tomadorCpfCnpj,
			tomadorInscricaoMunicipal: p.tomadorInscricaoMunicipal,
			atividadeAssinada: p.codigoCnae.replace(/[^0-9]/g, ''),
			codigoMunicipio: p.codigoMunicipio,
		},
		env.NFSE_SP_KEY_PEM!,
	);

	const rpsXml = `<RPS><IdentificacaoRPS><NumeroRPS>${escapeXml(p.numero)}</NumeroRPS><SerieRPS>${escapeXml(p.serie)}</SerieRPS><TipoRPS>${escapeXml(p.tipo)}</TipoRPS></IdentificacaoRPS><DataEmissao>${escapeXml(p.dataEmissao.slice(0, 10))}</DataEmissao><StatusRPS>N</StatusRPS><TributacaoRPS>${String(p.tpOpcaoSimples).padStart(2, '0')}</TributacaoRPS><ValorServicos>${p.valorServicos}</ValorServicos><ValorDeducoes>${p.valorDeducoes}</ValorDeducoes><ValorPIS>0</ValorPIS><ValorCOFINS>0</ValorCOFINS><ValorINSS>0</ValorINSS><ValorIR>0</ValorIR><ValorCSLL>0</ValorCSLL><CodigoServico>${escapeXml(p.codigoServico)}</CodigoServico><AliquotaServicos>${p.aliquota}</AliquotaServicos><ISSRetido>${p.issRetido}</ISSRetido><CodigoCNAE>${escapeXml(p.codigoCnae)}</CodigoCNAE><CodigoMunicipio>${escapeXml(p.codigoMunicipio)}</CodigoMunicipio><MunicipioPrestacao>${escapeXml(p.codigoMunicipio)}</MunicipioPrestacao><Operacao>1</Operacao><Prestador><CpfCnpj><Cnpj>${escapeXml(p.cnpjPrestador)}</Cnpj></CpfCnpj><InscricaoMunicipal>${escapeXml(p.inscricaoMunicipal)}</InscricaoMunicipal></Prestador><Tomador>${p.tomadorCpfCnpj ? `<CpfCnpj>${p.tomadorCpfCnpj.length <= 11 ? `<Cpf>${escapeXml(p.tomadorCpfCnpj)}</Cpf>` : `<Cnpj>${escapeXml(p.tomadorCpfCnpj)}</Cnpj>`}</CpfCnpj>` : ''}<InscricaoMunicipal>${escapeXml(p.tomadorInscricaoMunicipal)}</InscricaoMunicipal><RazaoSocial>${escapeXml(p.tomadorRazaoSocial)}</RazaoSocial>${p.tomadorEmail ? `<Email>${escapeXml(p.tomadorEmail)}</Email>` : ''}</Tomador><Discriminacao>${escapeXml(p.discriminacao)}</Discriminacao><ValorISS>${p.valorIss}</ValorISS><Assinatura>${assinatura}</Assinatura></RPS>`;

	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(p.cnpjPrestador)}</CNPJ></CPFCNPJRemetente><tpOpcaoSimples>${p.tpOpcaoSimples}</tpOpcaoSimples>`;

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>${rpsXml}`;

	const raw = await soapCall(env, 'TesteEnvioLoteRPS', xmlBody);
	const erros = parseErros(raw);
	if (erros.length > 0) {
		return { success: false, erros, alertas: parseAlertas(raw) };
	}
	return { success: true, alertas: parseAlertas(raw) };
}

export async function consultaNFe(
	env: Env,
	params: {
		cnpjRemetente: string;
		inscricaoMunicipal: string;
		numeroNfse?: string;
		codigoVerificacao?: string;
		dataEmissaoInicio?: string;
		dataEmissaoFim?: string;
	},
): Promise<SPNfseResult> {
	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(params.cnpjRemetente)}</CNPJ></CPFCNPJRemetente><InscricaoMunicipalPrestador>${escapeXml(params.inscricaoMunicipal)}</InscricaoMunicipalPrestador>${params.numeroNfse ? `<NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>` : ''}${params.codigoVerificacao ? `<CodigoVerificacao>${escapeXml(params.codigoVerificacao)}</CodigoVerificacao>` : ''}${params.dataEmissaoInicio ? `<DataEmissaoNFeInicial>${escapeXml(params.dataEmissaoInicio)}</DataEmissaoNFeInicial>` : ''}${params.dataEmissaoFim ? `<DataEmissaoNFeFinal>${escapeXml(params.dataEmissaoFim)}</DataEmissaoNFeFinal>` : ''}`;

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>`;
	const raw = await soapCall(env, 'ConsultaNFe', xmlBody);
	return parseNfseFromResponse(raw);
}

export async function consultaLote(
	env: Env,
	params: {
		cnpjRemetente: string;
		inscricaoMunicipal: string;
		numeroLote: string;
	},
): Promise<SPNfseResult> {
	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(params.cnpjRemetente)}</CNPJ></CPFCNPJRemetente><InscricaoMunicipalPrestador>${escapeXml(params.inscricaoMunicipal)}</InscricaoMunicipalPrestador><NumeroLote>${escapeXml(params.numeroLote)}</NumeroLote>`;

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>`;
	const raw = await soapCall(env, 'ConsultaLote', xmlBody);
	return parseNfseFromResponse(raw);
}

export async function cancelamentoNFe(
	env: Env,
	params: {
		cnpjRemetente: string;
		inscricaoMunicipal: string;
		numeroNfse: string;
	},
): Promise<SPNfseResult> {
	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(params.cnpjRemetente)}</CNPJ></CPFCNPJRemetente><InscricaoMunicipalPrestador>${escapeXml(params.inscricaoMunicipal)}</InscricaoMunicipalPrestador><NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>`;

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>`;
	const raw = await soapCall(env, 'CancelamentoNFe', xmlBody);
	const erros = parseErros(raw);
	if (erros.length > 0) {
		return { success: false, erros };
	}
	return { success: true };
}

export async function consultaCNPJ(
	env: Env,
	cnpj: string,
): Promise<SPNfseResult & { inscricoes?: Array<{ inscricaoMunicipal: string; razaoSocial: string; autorizado: boolean }> }> {
	const cabecalho = `<Versao>1</Versao><CPFCNPJRemetente><CNPJ>${escapeXml(cnpj)}</CNPJ></CPFCNPJRemetente><CNPJContribuinte><CNPJ>${escapeXml(cnpj)}</CNPJ></CNPJContribuinte>`;

	const xmlBody = `<Cabecalho>${cabecalho}</Cabecalho>`;
	const raw = await soapCall(env, 'ConsultaCNPJ', xmlBody);

	const erros = parseErros(raw);
	if (erros.length > 0) {
		return { success: false, erros };
	}

	const inscricoes: Array<{ inscricaoMunicipal: string; razaoSocial: string; autorizado: boolean }> = [];
	const ccmBlocks = raw.split(/<CCM>/i).slice(1);
	for (const block of ccmBlocks) {
		const im = parseXmlValue(block, 'InscricaoMunicipal') ?? '';
		const rz = parseXmlValue(block, 'RazaoSocial') ?? '';
		const auth = parseXmlValue(block, 'Autorizado') === 'true';
		if (im) inscricoes.push({ inscricaoMunicipal: im, razaoSocial: rz, autorizado: auth });
	}

	return { success: true, inscricoes };
}
