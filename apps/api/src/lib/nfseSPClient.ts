import type { Env } from "../types/env";
import { signXmlEnveloped, signRps } from "./nfseXmlSigner";

const SP_WS_URL = "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
const NFE_NS = "http://www.prefeitura.sp.gov.br/nfe";

/**
 * Layout configuration for São Paulo NFS-e.
 * For Simples Nacional, Layout 1 is mandatory as of 2026.
 */
export const NFSE_LAYOUTS = {
  V1: "1",
  V2: "2",
} as const;

const SOAP_ACTIONS: Record<string, string> = {
  EnvioRPS: "http://www.prefeitura.sp.gov.br/nfe/ws/envioRPS",
  EnvioLoteRPS: "http://www.prefeitura.sp.gov.br/nfe/ws/envioLoteRPS",
  TesteEnvioLoteRPS: "http://www.prefeitura.sp.gov.br/nfe/ws/testeenvio",
  CancelamentoNFe: "http://www.prefeitura.sp.gov.br/nfe/ws/cancelamentoNFe",
  ConsultaNFe: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFe",
  ConsultaNFeEmitidas: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeEmitidas",
  ConsultaNFeRecebidas: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeRecebidas",
  ConsultaLote: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaLote",
  ConsultaInformacoesLote: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaInformacoesLote",
  ConsultaCNPJ: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaCNPJ",
};

export interface RpsParams {
  numero: string;
  serie: string;
  tipo: string;
  dataEmissao: string;
  cnpjPrestador: string;
  inscricaoMunicipal: string;
  tributacaoRps: string;
  codigoServico: string;
  codigoCnae: string;
  codigoNBS: string;
  discriminacao: string;
  valorServicos: string;
  valorDeducoes: string;
  aliquota: string;
  issRetido: boolean;
  tomadorCpfCnpj: string;
  tomadorInscricaoMunicipal: string;
  tomadorRazaoSocial: string;
  tomadorEmail: string;
  codigoMunicipio: string;
  isSimplesNacional?: boolean;
  tpOpcaoSimples?: number;
  layout?: keyof typeof NFSE_LAYOUTS;
}

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
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlContent(s: string): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSoapEnvelope(method: string, mensagemXml: string, schemaVersion: string): string {
  const escapedMsg = escapeXmlContent(mensagemXml);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">`,
    `<soap:Body>`,
    `<${method}Request xmlns="${NFE_NS}">`,
    `<VersaoSchema>${schemaVersion}</VersaoSchema>`,
    `<MensagemXML>${escapedMsg}</MensagemXML>`,
    `</${method}Request>`,
    `</soap:Body>`,
    `</soap:Envelope>`,
  ].join("");
}

async function soapCall(env: Env, method: string, mensagemXml: string, schemaVersion: string): Promise<string> {
  const soapXml = buildSoapEnvelope(method, mensagemXml, schemaVersion);
  
  if (!env.NFSE_SP_CERT) {
    throw new Error("Certificado NFSE_SP_CERT não configurado no Cloudflare.");
  }

  const fetchFn = env.NFSE_SP_CERT.fetch.bind(env.NFSE_SP_CERT);

  const resp = await fetchFn(SP_WS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${SOAP_ACTIONS[method]}"`,
    },
    body: soapXml,
  });

  if (!resp.ok) {
    const text = await resp.text();
    // 520 errors sometimes happen on PMSP side during maintenance
    if (resp.status === 520) {
      throw new Error(`A prefeitura de São Paulo (PMSP) retornou um erro 520. Isso geralmente ocorre durante instabilidades momentâneas no servidor deles.`);
    }
    throw new Error(`SP NFSe SOAP ${method} falhou (${resp.status}): ${text.slice(0, 500)}`);
  }

  const rawBody = await resp.text();
  
  // Extract content from RetornoXML
  const retornoMatch = rawBody.match(/<RetornoXML>([\s\S]*?)<\/RetornoXML>/i);
  if (retornoMatch) {
    return retornoMatch[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  // Handle SOAP Faults
  const faultMatch = rawBody.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
  if (faultMatch) {
    throw new Error(`SP NFSe SOAP Fault: ${faultMatch[1].trim()}`);
  }

  return rawBody;
}

function parseXmlValue(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

function parseErros(xml: string): Array<{ codigo: string; descricao: string }> {
  const erros: Array<{ codigo: string; descricao: string }> = [];
  // Split by <Erro> tag regardless of namespace
  const blocks = xml.split(/<Erro[^>]*>/i).slice(1);
  for (const block of blocks) {
    const codigo = parseXmlValue(block, "Codigo") || parseXmlValue(block, "codigo") || "";
    const descricao = parseXmlValue(block, "Descricao") || parseXmlValue(block, "descricao") || "";
    if (codigo || descricao) {
      erros.push({ codigo, descricao });
    }
  }
  return erros;
}

function parseAlertas(xml: string): Array<{ codigo: string; descricao: string }> {
  const alertas: Array<{ codigo: string; descricao: string }> = [];
  const blocks = xml.split(/<Alerta[^>]*>/i).slice(1);
  for (const block of blocks) {
    const codigo = parseXmlValue(block, "Codigo") || "";
    const descricao = parseXmlValue(block, "Descricao") || "";
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

  const numeroNfse = parseXmlValue(xml, "NumeroNFe") ?? parseXmlValue(xml, "Numero");
  const codigoVerificacao = parseXmlValue(xml, "CodigoVerificacao");
  const dataEmissao = parseXmlValue(xml, "DataEmissaoNFe") ?? parseXmlValue(xml, "DataEmissao");
  const linkNfse =
    numeroNfse && codigoVerificacao ? buildNfseLink(numeroNfse, codigoVerificacao) : undefined;

  return {
    success: true,
    numeroNfse,
    codigoVerificacao,
    dataEmissao,
    linkNfse,
    alertas: parseAlertas(xml),
  };
}

export function padLeft(s: string, len: number, ch: string): string {
  return (s || "").padStart(len, ch);
}

export function formatValorSemDecimal(valor: string): string {
  const num = Number(valor || 0);
  const semDecimal = Math.round(num * 100);
  return padLeft(String(semDecimal), 15, "0");
}

async function buildSignedMessage(
  env: Env,
  rootElementName: string,
  innerXml: string,
): Promise<string> {
  const unsignedXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<${rootElementName} xmlns="${NFE_NS}">`,
    innerXml,
    `</${rootElementName}>`,
  ].join("");

  const signedXml = await signXmlEnveloped(
    unsignedXml,
    env.NFSE_SP_CERT_PEM!,
    env.NFSE_SP_KEY_PEM!,
    "",
  );

  // Return without XML declaration for inclusion in SOAP MensagemXML
  return signedXml.replace(/<\?xml[^?]*\?>\s*/, "");
}

/**
 * Builds the RPS XML parts following the mandatory order of the schema.
 */
async function buildRpsXml(
  p: RpsParams,
  assinatura: string,
): Promise<string> {
  const issRetidoStr = p.issRetido ? "true" : "false";
  const layout = p.layout ?? "V1";
  
  const tomadorParts: string[] = [];
  if (p.tomadorCpfCnpj) {
    const digits = p.tomadorCpfCnpj.replace(/\D/g, "");
    if (digits.length <= 11) {
      tomadorParts.push(`<CPFCNPJTomador><CPF>${escapeXml(digits)}</CPF></CPFCNPJTomador>`);
    } else {
      tomadorParts.push(`<CPFCNPJTomador><CNPJ>${escapeXml(digits)}</CNPJ></CPFCNPJTomador>`);
    }
  }
  if (p.tomadorInscricaoMunicipal) {
    tomadorParts.push(`<InscricaoMunicipalTomador>${escapeXml(p.tomadorInscricaoMunicipal)}</InscricaoMunicipalTomador>`);
  }
  if (p.tomadorRazaoSocial) {
    tomadorParts.push(`<RazaoSocialTomador>${escapeXml(p.tomadorRazaoSocial)}</RazaoSocialTomador>`);
  }
  if (p.tomadorEmail) {
    tomadorParts.push(`<EmailTomador>${escapeXml(p.tomadorEmail)}</EmailTomador>`);
  }

  const dataEmissaoDate = p.dataEmissao.slice(0, 10);

  // Common parts for both layouts
  const headerParts = [
    `<Assinatura>${escapeXml(assinatura)}</Assinatura>`,
    `<ChaveRPS>`,
    `<InscricaoPrestador>${escapeXml(p.inscricaoMunicipal)}</InscricaoPrestador>`,
    `<SerieRPS>${escapeXml(p.serie)}</SerieRPS>`,
    `<NumeroRPS>${escapeXml(p.numero)}</NumeroRPS>`,
    `</ChaveRPS>`,
    `<TipoRPS>${escapeXml(p.tipo)}</TipoRPS>`,
    `<DataEmissao>${dataEmissaoDate}</DataEmissao>`,
    `<StatusRPS>N</StatusRPS>`,
    `<TributacaoRPS>${escapeXml(p.tributacaoRps)}</TributacaoRPS>`,
  ];

  const financialParts = [
    `<ValorServicos>${p.valorServicos}</ValorServicos>`,
    `<ValorDeducoes>${p.valorDeducoes}</ValorDeducoes>`,
    `<ValorPIS>0</ValorPIS>`,
    `<ValorCOFINS>0</ValorCOFINS>`,
    `<ValorINSS>0</ValorINSS>`,
    `<ValorIR>0</ValorIR>`,
    `<ValorCSLL>0</ValorCSLL>`,
    `<CodigoServico>${p.codigoServico}</CodigoServico>`,
    `<AliquotaServicos>${p.aliquota}</AliquotaServicos>`,
    `<ISSRetido>${issRetidoStr}</ISSRetido>`,
  ];

  const footerParts = [
    ...tomadorParts,
    `<Discriminacao>${escapeXml(p.discriminacao)}</Discriminacao>`,
  ];

  if (layout === "V1") {
    // Layout 1 (Classic/Simples Nacional)
    return [
      ...headerParts,
      ...financialParts,
      ...footerParts,
      `<ValorCargaTributaria>0</ValorCargaTributaria>`,
      `<PercentualCargaTributaria>0</PercentualCargaTributaria>`,
      `<FonteCargaTributaria>1</FonteCargaTributaria>`,
      `<CodigoCEI>0</CodigoCEI>`,
      `<MatriculaObra>0</MatriculaObra>`,
      // Note: for layout 1, some services might require ValorTotalRecebido, but for 04391 it's forbidden.
    ].join("");
  } else {
    // Layout 2 (2026+)
    return [
      ...headerParts,
      ...financialParts,
      ...footerParts,
      `<ValorCargaTributaria>0</ValorCargaTributaria>`,
      `<PercentualCargaTributaria>0</PercentualCargaTributaria>`,
      `<FonteCargaTributaria>1</FonteCargaTributaria>`,
      `<CodigoCEI>0</CodigoCEI>`,
      `<MatriculaObra>0</MatriculaObra>`,
      `<MunicipioPrestacao>${escapeXml(p.codigoMunicipio)}</MunicipioPrestacao>`,
      `<NumeroEncapsulamento>0</NumeroEncapsulamento>`,
      `<ValorTotalRecebido>${p.valorServicos}</ValorTotalRecebido>`,
      `<ValorInicialCobrado>${p.valorServicos}</ValorInicialCobrado>`,
      `<ValorMulta>0</ValorMulta>`,
      `<ValorJuros>0</ValorJuros>`,
      `<ValorIPI>0</ValorIPI>`,
      `<ExigibilidadeSuspensa>1</ExigibilidadeSuspensa>`,
      `<PagamentoParceladoAntecipado>1</PagamentoParceladoAntecipado>`,
      `<NBS>${p.codigoNBS || "0"}</NBS>`,
      `<cLocPrestacao>${escapeXml(p.codigoMunicipio)}</cLocPrestacao>`,
      `<cPaisPrestacao>1058</cPaisPrestacao>`,
      `<IBSCBS>`,
      `<finNFSe>0</finNFSe>`,
      `<indFinal>0</indFinal>`,
      `<cIndOp>000000</cIndOp>`,
      `<indDest>0</indDest>`,
      `<valores><trib><gIBSCBS><cClassTrib>000000</cClassTrib></gIBSCBS></trib></valores>`,
      `</IBSCBS>`,
      `<ValorFinalCobrado>${p.valorServicos}</ValorFinalCobrado>`,
    ].join("");
  }
}

async function prepareEmissionMessage(env: Env, rpsParams: RpsParams): Promise<{ innerXml: string; schemaVersion: string }> {
  const p = rpsParams;
  const layout = p.layout ?? "V1";
  const schemaVersion = NFSE_LAYOUTS[layout];
  
  const cnpjDigits = p.cnpjPrestador.replace(/\D/g, "");
  const imDigits = p.inscricaoMunicipal.replace(/\D/g, "");
  const tomadorDigits = (p.tomadorCpfCnpj || "").replace(/\D/g, "");
  const codigoServicoDigits = p.codigoServico.replace(/\D/g, "");
  const indicador = tomadorDigits ? (tomadorDigits.length <= 11 ? "1" : "2") : "3";
  
  const assinatura = await signRps(
    {
      inscricaoMunicipal: imDigits,
      serie: p.serie,
      numero: p.numero,
      dataEmissao: p.dataEmissao,
      tributacao: p.tributacaoRps,
      status: "N",
      issRetido: p.issRetido ? "S" : "N",
      valorServicos: formatValorSemDecimal(p.valorServicos),
      valorDeducoes: formatValorSemDecimal(p.valorDeducoes),
      codigoServico: padLeft(codigoServicoDigits, 5, "0"),
      indicadorCpfCnpj: indicador,
      cpfCnpjTomador: indicador === "3" ? "" : tomadorDigits,
    },
    env.NFSE_SP_KEY_PEM!,
  );

  const rpsXml = await buildRpsXml(p, assinatura);

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<RPS xmlns="">${rpsXml}</RPS>`,
  ].join("");

  return { innerXml, schemaVersion };
}

export async function envioRPS(
  env: Env,
  rpsParams: RpsParams,
): Promise<SPNfseResult> {
  const { innerXml, schemaVersion } = await prepareEmissionMessage(env, rpsParams);
  const signed = await buildSignedMessage(env, "PedidoEnvioRPS", innerXml);
  const raw = await soapCall(env, "EnvioRPS", signed, schemaVersion);
  return parseNfseFromResponse(raw);
}

export async function testeEnvioLoteRPS(
  env: Env,
  rpsParams: RpsParams,
): Promise<SPNfseResult> {
  const { innerXml, schemaVersion } = await prepareEmissionMessage(env, rpsParams);
  // Add transacao/qtd for Lote
  const today = new Date().toISOString().slice(0, 10);
  const innerXmlLote = innerXml
    .replace("</Cabecalho>", `<transacao>true</transacao><dtInicio>${today}</dtInicio><dtFim>${today}</dtFim><QtdRPS>1</QtdRPS></Cabecalho>`)
    .replace("<RPS", "<LoteRPS><RPS")
    .replace("</RPS>", "</RPS></LoteRPS>");

  const signed = await buildSignedMessage(env, "PedidoEnvioLoteRPS", innerXmlLote);
  const raw = await soapCall(env, "TesteEnvioLoteRPS", signed, schemaVersion);
  
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
    layout?: keyof typeof NFSE_LAYOUTS;
  },
): Promise<SPNfseResult> {
  const schemaVersion = NFSE_LAYOUTS[params.layout ?? "V1"];
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const filtroParts: string[] = [];
  if (params.numeroNfse) {
    filtroParts.push(`<NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>`);
  }
  if (params.codigoVerificacao) {
    filtroParts.push(`<CodigoVerificacao>${escapeXml(params.codigoVerificacao)}</CodigoVerificacao>`);
  }
  if (params.dataEmissaoInicio) {
    filtroParts.push(`<DataEmissaoNFeInicial>${escapeXml(params.dataEmissaoInicio)}</DataEmissaoNFeInicial>`);
  }
  if (params.dataEmissaoFim) {
    filtroParts.push(`<DataEmissaoNFeFinal>${escapeXml(params.dataEmissaoFim)}</DataEmissaoNFeFinal>`);
  }

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<ChaveRPS>`,
    `<InscricaoPrestador>${escapeXml(imDigits)}</InscricaoPrestador>`,
    `</ChaveRPS>`,
    ...filtroParts,
  ].join("");

  const signedXml = await buildSignedMessage(env, "PedidoConsultaNFe", innerXml);
  const raw = await soapCall(env, "ConsultaNFe", signedXml, schemaVersion);
  return parseNfseFromResponse(raw);
}

export async function cancelamentoNFe(
  env: Env,
  params: {
    cnpjRemetente: string;
    inscricaoMunicipal: string;
    numeroNfse: string;
    layout?: keyof typeof NFSE_LAYOUTS;
  },
): Promise<SPNfseResult> {
  const schemaVersion = NFSE_LAYOUTS[params.layout ?? "V1"];
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<ChaveNFe>`,
    `<InscricaoPrestador>${escapeXml(imDigits)}</InscricaoPrestador>`,
    `<NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>`,
    `</ChaveNFe>`,
  ].join("");

  const signedXml = await buildSignedMessage(env, "PedidoCancelamentoNFe", innerXml);
  const raw = await soapCall(env, "CancelamentoNFe", signedXml, schemaVersion);
  const erros = parseErros(raw);
  if (erros.length > 0) {
    return { success: false, erros };
  }
  return { success: true };
}

export async function consultaLote(
  env: Env,
  params: {
    cnpjRemetente: string;
    inscricaoMunicipal: string;
    numeroLote: string;
    layout?: keyof typeof NFSE_LAYOUTS;
  },
): Promise<SPNfseResult> {
  const schemaVersion = NFSE_LAYOUTS[params.layout ?? "V1"];
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<NumeroLote>${escapeXml(params.numeroLote)}</NumeroLote>`,
    `<InscricaoPrestador>${escapeXml(imDigits)}</InscricaoPrestador>`,
  ].join("");

  const signedXml = await buildSignedMessage(env, "PedidoConsultaLote", innerXml);
  const raw = await soapCall(env, "ConsultaLote", signedXml, schemaVersion);
  return parseNfseFromResponse(raw);
}

export async function debugBuildXmlMessage(
  env: Env,
  rpsParams: RpsParams,
): Promise<{ xml: string; rpsXml: string }> {
  const { innerXml } = await prepareEmissionMessage(env, rpsParams);
  return { xml: innerXml, rpsXml: "" };
}

export async function consultaCNPJ(
  env: Env,
  cnpj: string,
): Promise<
  SPNfseResult & {
    inscricoes?: Array<{ inscricaoMunicipal: string; razaoSocial: string; autorizado: boolean; emiteNfe?: boolean }>;
  }
> {
  const cnpjDigits = cnpj.replace(/\D/g, "");
  const schemaVersion = "1"; // Consultation usually works on v1

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<CNPJContribuinte><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CNPJContribuinte>`,
  ].join("");

  const signedXml = await buildSignedMessage(env, "PedidoConsultaCNPJ", innerXml);
  const raw = await soapCall(env, "ConsultaCNPJ", signedXml, schemaVersion);

  const erros = parseErros(raw);
  if (erros.length > 0) {
    return { success: false, erros };
  }

  const inscricoes: Array<{
    inscricaoMunicipal: string;
    razaoSocial: string;
    autorizado: boolean;
    emiteNfe?: boolean;
  }> = [];
  const detalheBlocks = raw.split(/<Detalhe[^>]*>/i).slice(1);
  for (const block of detalheBlocks) {
    const im = parseXmlValue(block, "InscricaoMunicipal") ?? "";
    const rz = parseXmlValue(block, "RazaoSocial") ?? "";
    const auth = parseXmlValue(block, "Autorizado") === "true";
    const emite = parseXmlValue(block, "EmiteNFe") === "true";
    if (im) inscricoes.push({ inscricaoMunicipal: im, razaoSocial: rz, autorizado: auth, emiteNfe: emite });
  }

  return { success: true, inscricoes };
}
