import type { Env } from "../types/env";
import { signXmlEnveloped, signRps, extractCertB64 } from "./nfseXmlSigner";

const SP_WS_URL = "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
const NFE_NS = "http://www.prefeitura.sp.gov.br/nfe";
const DSIG_NS = "http://www.w3.org/2000/09/xmldsig#";

const SCHEMA_VERSION = "2";
const SCHEMA_VERSION_SIMPLES = "1";

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
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlContent(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSoapEnvelope(method: string, mensagemXml: string, schemaVersion: string = SCHEMA_VERSION): string {
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

async function soapCall(env: Env, method: string, mensagemXml: string, schemaVersion?: string): Promise<string> {
  const soapXml = buildSoapEnvelope(method, mensagemXml, schemaVersion);
  const fetchFn = env.NFSE_SP_CERT!.fetch.bind(env.NFSE_SP_CERT);

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
    throw new Error(`SP NFSe SOAP ${method} falhou (${resp.status}): ${text.slice(0, 500)}`);
  }

  const rawBody = await resp.text();
  const retornoMatch = rawBody.match(/<RetornoXML>([\s\S]*?)<\/RetornoXML>/i);
  if (retornoMatch) {
    return retornoMatch[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

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
  const erroBlocks = xml.split(/<Erro[^>]*>/i).slice(1);
  for (const block of erroBlocks) {
    const codigo = parseXmlValue(block, "Codigo") ?? "";
    const descricao = parseXmlValue(block, "Descricao") ?? "";
    if (codigo || descricao) {
      erros.push({ codigo, descricao });
    }
  }
  return erros;
}

function parseAlertas(xml: string): Array<{ codigo: string; descricao: string }> {
  const alertas: Array<{ codigo: string; descricao: string }> = [];
  const alertaBlocks = xml.split(/<Alerta[^>]*>/i).slice(1);
  for (const block of alertaBlocks) {
    const codigo = parseXmlValue(block, "Codigo") ?? "";
    const descricao = parseXmlValue(block, "Descricao") ?? "";
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
  return s.padStart(len, ch);
}

export function formatValorSemDecimal(valor: string): string {
  const num = Number(valor);
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

  return signedXml.replace(/<\?xml[^?]*\?>\s*/, "");
}

async function buildRpsXml(
  p: {
    numero: string;
    serie: string;
    tipo: string;
    dataEmissao: string;
    inscricaoMunicipal: string;
    cnpjPrestador: string;
    tributacaoRps: string;
    codigoServico: string;
    aliquota: string;
    issRetido: boolean;
    valorServicos: string;
    valorDeducoes: string;
    codigoCnae: string;
    discriminacao: string;
    tomadorCpfCnpj: string;
    tomadorInscricaoMunicipal: string;
    tomadorRazaoSocial: string;
    tomadorEmail: string;
    codigoMunicipio: string;
    codigoNBS: string;
  },
  assinatura: string,
  isSimplesNacional: boolean = false,
): Promise<string> {
  const issRetidoStr = p.issRetido ? "true" : "false";
  
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

  // Layout v2 order (versão 002 - obrigatório 2026)
  const rpsParts = [
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
    `<ValorServicos>${p.valorServicos}</ValorServicos>`,
    `<ValorDeducoes>${p.valorDeducoes}</ValorDeducoes>`,
    `<ValorPIS>0</ValorPIS>`,
    `<ValorCOFINS>0</ValorCOFINS>`,
    `<ValorINSS>0</ValorINSS>`,
    `<ValorIR>0</ValorIR>`,
    `<ValorCSLL>0</ValorCSLL>`,
    `<CodigoServico>${Math.round(Number(p.codigoServico.replace(/\D/g, "")))}</CodigoServico>`,
    `<AliquotaServicos>${p.aliquota}</AliquotaServicos>`,
    `<ISSRetido>${issRetidoStr}</ISSRetido>`,
    ...tomadorParts,
    `<Discriminacao>${escapeXml(p.discriminacao)}</Discriminacao>`,
    `<ValorCargaTributaria>0</ValorCargaTributaria>`,
    `<PercentualCargaTributaria>0</PercentualCargaTributaria>`,
    `<FonteCargaTributaria>1</FonteCargaTributaria>`,
    `<CodigoCEI>0</CodigoCEI>`,
    `<MatriculaObra>0</MatriculaObra>`,
    `<cLocPrestacao>${escapeXml(p.codigoMunicipio)}</cLocPrestacao>`,
    `<NumeroEncapsulamento>0</NumeroEncapsulamento>`,
    `<IBSCBS>`,
    `<finNFSe>0</finNFSe>`,
    `<indFinal>0</indFinal>`,
    `<cIndOp>000000</cIndOp>`,
    `<indDest>0</indDest>`,
    `<valores>`,
    `<trib>`,
    `<gIBSCBS>`,
    `<cClassTrib>000000</cClassTrib>`,
    `</gIBSCBS>`,
    `</trib>`,
    `</valores>`,
    `</IBSCBS>`,
    `<ValorTotalRecebido>${p.valorServicos}</ValorTotalRecebido>`,
    `<ValorFinalCobrado>${p.valorServicos}</ValorFinalCobrado>`,
  ];

  return rpsParts.join("");
}

async function buildEnvioRpsMessage(env: Env, rpsParams: RpsParams): Promise<string> {
  const p = rpsParams;
  const cnpjDigits = p.cnpjPrestador.replace(/\D/g, "");
  const imDigits = p.inscricaoMunicipal.replace(/\D/g, "");
  const tomadorDigits = (p.tomadorCpfCnpj || "").replace(/\D/g, "");
  const codigoServicoDigits = p.codigoServico.replace(/\D/g, "");
  const indicador = tomadorDigits ? (tomadorDigits.length <= 11 ? "1" : "2") : "3";
  // Em 2026, forçar SCHEMA_VERSION = "2" mesmo para Simples Nacional
  const schemaVersion = SCHEMA_VERSION;
  
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

  const rpsXml = await buildRpsXml(
    {
      numero: p.numero,
      serie: p.serie,
      tipo: p.tipo,
      dataEmissao: p.dataEmissao,
      inscricaoMunicipal: imDigits,
      cnpjPrestador: cnpjDigits,
      tributacaoRps: p.tributacaoRps,
      codigoServico: codigoServicoDigits,
      aliquota: p.aliquota,
      issRetido: p.issRetido,
      valorServicos: p.valorServicos,
      valorDeducoes: p.valorDeducoes,
      codigoCnae: p.codigoCnae,
      discriminacao: p.discriminacao,
      tomadorCpfCnpj: p.tomadorCpfCnpj,
      tomadorInscricaoMunicipal: p.tomadorInscricaoMunicipal,
      tomadorRazaoSocial: p.tomadorRazaoSocial,
      tomadorEmail: p.tomadorEmail,
      codigoMunicipio: p.codigoMunicipio,
      codigoNBS: p.codigoNBS,
    },
    assinatura,
    p.isSimplesNacional ?? false,
  );

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<RPS xmlns="">${rpsXml}</RPS>`,
  ].join("");

  return buildSignedMessage(env, "PedidoEnvioRPS", innerXml);
}

export async function envioRPS(
  env: Env,
  rpsParams: RpsParams,
): Promise<SPNfseResult> {
  const schemaVersion = SCHEMA_VERSION;
  const mensagem = await buildEnvioRpsMessage(env, rpsParams);
  const raw = await soapCall(env, "EnvioRPS", mensagem, schemaVersion);
  return parseNfseFromResponse(raw);
}

async function buildEnvioLoteRpsMessage(
  env: Env,
  rpsParams: RpsParams,
): Promise<string> {
  const p = rpsParams;
  const cnpjDigits = p.cnpjPrestador.replace(/\D/g, "");
  const imDigits = p.inscricaoMunicipal.replace(/\D/g, "");
  const tomadorDigits = (p.tomadorCpfCnpj || "").replace(/\D/g, "");
  const codigoServicoDigits = p.codigoServico.replace(/\D/g, "");
  const indicador = tomadorDigits ? (tomadorDigits.length <= 11 ? "1" : "2") : "3";
  const schemaVersion = SCHEMA_VERSION;

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

  const rpsXml = await buildRpsXml(
    {
      numero: p.numero,
      serie: p.serie,
      tipo: p.tipo,
      dataEmissao: p.dataEmissao,
      inscricaoMunicipal: imDigits,
      cnpjPrestador: cnpjDigits,
      tributacaoRps: p.tributacaoRps,
      codigoServico: codigoServicoDigits,
      aliquota: p.aliquota,
      issRetido: p.issRetido,
      valorServicos: p.valorServicos,
      valorDeducoes: p.valorDeducoes,
      codigoCnae: p.codigoCnae,
      discriminacao: p.discriminacao,
      tomadorCpfCnpj: p.tomadorCpfCnpj,
      tomadorInscricaoMunicipal: p.tomadorInscricaoMunicipal,
      tomadorRazaoSocial: p.tomadorRazaoSocial,
      tomadorEmail: p.tomadorEmail,
      codigoMunicipio: p.codigoMunicipio,
      codigoNBS: p.codigoNBS,
    },
    assinatura,
    p.isSimplesNacional ?? false,
  );

  const today = new Date().toISOString().slice(0, 10);

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CNPJRemetente>`,
    `<transacao>true</transacao>`,
    `<dtInicio>${today}</dtInicio>`,
    `<dtFim>${today}</dtFim>`,
    `<QtdRPS>1</QtdRPS>`,
    `</Cabecalho>`,
    `<LoteRPS xmlns="">`,
    `<RPS>${rpsXml}</RPS>`,
    `</LoteRPS>`,
  ].join("");

  return buildSignedMessage(env, "PedidoEnvioLoteRPS", innerXml);
}

export async function testeEnvioLoteRPS(
  env: Env,
  rpsParams: RpsParams,
): Promise<SPNfseResult> {
  const mensagem = await buildEnvioLoteRpsMessage(env, rpsParams);
  const schemaVersion = SCHEMA_VERSION;
  const raw = await soapCall(env, "TesteEnvioLoteRPS", mensagem, schemaVersion);
  const erros = parseErros(raw);
  if (erros.length > 0) {
    return { success: false, erros, alertas: parseAlertas(raw) };
  }
  return { success: true, alertas: parseAlertas(raw) };
}

export async function debugBuildXmlMessage(
  env: Env,
  rpsParams: RpsParams,
): Promise<{ xml: string; rpsXml: string }> {
  const p = rpsParams;
  const cnpjDigits = p.cnpjPrestador.replace(/\D/g, "");
  const imDigits = p.inscricaoMunicipal.replace(/\D/g, "");
  const tomadorDigits = (p.tomadorCpfCnpj || "").replace(/\D/g, "");
  const codigoServicoDigits = p.codigoServico.replace(/\D/g, "");
  
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
      indicadorCpfCnpj: tomadorDigits ? (tomadorDigits.length <= 11 ? "1" : "2") : "3",
      cpfCnpjTomador: tomadorDigits ? tomadorDigits : "",
    },
    env.NFSE_SP_KEY_PEM!,
  );

  const rpsXml = await buildRpsXml(
    {
      numero: p.numero,
      serie: p.serie,
      tipo: p.tipo,
      dataEmissao: p.dataEmissao,
      inscricaoMunicipal: imDigits,
      cnpjPrestador: cnpjDigits,
      tributacaoRps: p.tributacaoRps,
      codigoServico: codigoServicoDigits,
      aliquota: p.aliquota,
      issRetido: p.issRetido,
      valorServicos: p.valorServicos,
      valorDeducoes: p.valorDeducoes,
      codigoCnae: p.codigoCnae,
      discriminacao: p.discriminacao,
      tomadorCpfCnpj: p.tomadorCpfCnpj,
      tomadorInscricaoMunicipal: p.tomadorInscricaoMunicipal,
      tomadorRazaoSocial: p.tomadorRazaoSocial,
      tomadorEmail: p.tomadorEmail,
      codigoMunicipio: p.codigoMunicipio,
      codigoNBS: p.codigoNBS,
    },
    assinatura,
    p.isSimplesNacional ?? false,
  );

  const today = new Date().toISOString().slice(0, 10);
  const schemaVersion = SCHEMA_VERSION;

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${schemaVersion}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `<transacao>true</transacao>`,
    `<dtInicio>${today}</dtInicio>`,
    `<dtFim>${today}</dtFim>`,
    `<QtdRPS>1</QtdRPS>`,
    `</Cabecalho>`,
    `<RPS xmlns="">${rpsXml}</RPS>`,
  ].join("");

  return { xml: innerXml, rpsXml };
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
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const filtroParts: string[] = [];
  if (params.numeroNfse) {
    filtroParts.push(`<NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>`);
  }
  if (params.codigoVerificacao) {
    filtroParts.push(
      `<CodigoVerificacao>${escapeXml(params.codigoVerificacao)}</CodigoVerificacao>`,
    );
  }
  if (params.dataEmissaoInicio) {
    filtroParts.push(
      `<DataEmissaoNFeInicial>${escapeXml(params.dataEmissaoInicio)}</DataEmissaoNFeInicial>`,
    );
  }
  if (params.dataEmissaoFim) {
    filtroParts.push(
      `<DataEmissaoNFeFinal>${escapeXml(params.dataEmissaoFim)}</DataEmissaoNFeFinal>`,
    );
  }

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<ChaveRPS xmlns="">`,
    `<InscricaoPrestador>${escapeXml(imDigits)}</InscricaoPrestador>`,
    `</ChaveRPS>`,
    ...filtroParts,
  ].join("");

  const mensagemXml = buildSoapEnvelope("ConsultaNFe", innerXml);
  const raw = await soapCall(env, "ConsultaNFe", mensagemXml);
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
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<NumeroLote xmlns="">${escapeXml(params.numeroLote)}</NumeroLote>`,
    `<InscricaoPrestador xmlns="">${escapeXml(imDigits)}</InscricaoPrestador>`,
  ].join("");

  const mensagemXml = buildSoapEnvelope("ConsultaLote", innerXml);
  const raw = await soapCall(env, "ConsultaLote", mensagemXml);
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
  const cnpjDigits = params.cnpjRemetente.replace(/\D/g, "");
  const imDigits = params.inscricaoMunicipal.replace(/\D/g, "");

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<ChaveNFe xmlns="">`,
    `<InscricaoPrestador>${escapeXml(imDigits)}</InscricaoPrestador>`,
    `<NumeroNFe>${escapeXml(params.numeroNfse)}</NumeroNFe>`,
    `</ChaveNFe>`,
  ].join("");

  const mensagemXml = buildSoapEnvelope("CancelamentoNFe", innerXml);
  const raw = await soapCall(env, "CancelamentoNFe", mensagemXml);
  const erros = parseErros(raw);
  if (erros.length > 0) {
    return { success: false, erros };
  }
  return { success: true };
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

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
    `<CPFCNPJRemetente><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<CNPJContribuinte xmlns=""><CNPJ>${escapeXml(cnpjDigits)}</CNPJ></CNPJContribuinte>`,
  ].join("");

  const mensagemXml = buildSoapEnvelope("ConsultaCNPJ", innerXml);
  const raw = await soapCall(env, "ConsultaCNPJ", mensagemXml);

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
