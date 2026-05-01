import type { Env } from "../types/env";
import { signXmlEnveloped, signRps } from "./nfseXmlSigner";

const SP_WS_URL = "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
const NFE_NS = "http://www.prefeitura.sp.gov.br/nfe";

const SCHEMA_VERSION = "2";

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
  isSimplesNacional: boolean,
): Promise<string> {
  const issRetidoStr = p.issRetido ? "true" : "false";
  
  const tomadorParts: string[] = [];
  if (p.tomadorCpfCnpj) {
    const digits = p.tomadorCpfCnpj.replace(/\D/g, "");
    if (digits.length <= 11) {
      tomadorParts.push(`<CPFCNPJTomador xmlns=""><CPF>${escapeXml(digits)}</CPF></CPFCNPJTomador>`);
    } else {
      tomadorParts.push(`<CPFCNPJTomador xmlns=""><CNPJ>${escapeXml(digits)}</CNPJ></CPFCNPJTomador>`);
    }
  }
  if (p.tomadorInscricaoMunicipal) {
    tomadorParts.push(`<InscricaoMunicipalTomador xmlns="">${escapeXml(p.tomadorInscricaoMunicipal)}</InscricaoMunicipalTomador>`);
  }
  if (p.tomadorRazaoSocial) {
    tomadorParts.push(`<RazaoSocialTomador xmlns="">${escapeXml(p.tomadorRazaoSocial)}</RazaoSocialTomador>`);
  }
  if (p.tomadorEmail) {
    tomadorParts.push(`<EmailTomador xmlns="">${escapeXml(p.tomadorEmail)}</EmailTomador>`);
  }

  const dataEmissaoDate = p.dataEmissao.slice(0, 10);

  const rpsParts = [
    `<Assinatura xmlns="">${escapeXml(assinatura)}</Assinatura>`,
    `<ChaveRPS xmlns="">`,
    `<InscricaoPrestador>${escapeXml(p.inscricaoMunicipal)}</InscricaoPrestador>`,
    `<SerieRPS>${escapeXml(p.serie)}</SerieRPS>`,
    `<NumeroRPS>${escapeXml(p.numero)}</NumeroRPS>`,
    `</ChaveRPS>`,
    `<TipoRPS xmlns="">${escapeXml(p.tipo)}</TipoRPS>`,
    `<DataEmissao xmlns="">${dataEmissaoDate}</DataEmissao>`,
    `<StatusRPS xmlns="">N</StatusRPS>`,
    `<TributacaoRPS xmlns="">${escapeXml(p.tributacaoRps)}</TributacaoRPS>`,
    `<ValorDeducoes xmlns="">${p.valorDeducoes}</ValorDeducoes>`,
    `<ValorPIS xmlns="">0</ValorPIS>`,
    `<ValorCOFINS xmlns="">0</ValorCOFINS>`,
    `<ValorINSS xmlns="">0</ValorINSS>`,
    `<ValorIR xmlns="">0</ValorIR>`,
    `<ValorCSLL xmlns="">0</ValorCSLL>`,
    `<CodigoServico xmlns="">${Math.round(Number(p.codigoServico.replace(/\D/g, "")))}</CodigoServico>`,
    `<AliquotaServicos xmlns="">${p.aliquota}</AliquotaServicos>`,
    `<ISSRetido xmlns="">${issRetidoStr}</ISSRetido>`,
    ...tomadorParts,
    `<Discriminacao xmlns="">${escapeXml(p.discriminacao)}</Discriminacao>`,
    `<ValorCargaTributaria xmlns="">0</ValorCargaTributaria>`,
    `<PercentualCargaTributaria xmlns="">0</PercentualCargaTributaria>`,
    `<FonteCargaTributaria xmlns="">1</FonteCargaTributaria>`,
    `<CodigoCEI xmlns="">0</CodigoCEI>`,
    `<MatriculaObra xmlns="">0</MatriculaObra>`,
    `<MunicipioPrestacao xmlns="">${escapeXml(p.codigoMunicipio)}</MunicipioPrestacao>`,
    `<NumeroEncapsulamento xmlns="">0</NumeroEncapsulamento>`,
    `<ValorTotalRecebido xmlns="">${p.valorServicos}</ValorTotalRecebido>`,
    `<ValorInicialCobrado xmlns="">${p.valorServicos}</ValorInicialCobrado>`,
    `<ValorMulta xmlns="">0</ValorMulta>`,
    `<ValorJuros xmlns="">0</ValorJuros>`,
    `<ValorIPI xmlns="">0</ValorIPI>`,
    `<ExigibilidadeSuspensa xmlns="">1</ExigibilidadeSuspensa>`,
    `<PagamentoParceladoAntecipado xmlns="">1</PagamentoParceladoAntecipado>`,
    `<ValorFinalCobrado xmlns="">${p.valorServicos}</ValorFinalCobrado>`,
    `<IBSCBS xmlns="">`,
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
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
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
  const mensagem = await buildEnvioRpsMessage(env, rpsParams);
  const raw = await soapCall(env, "EnvioRPS", mensagem);
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
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
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
  const raw = await soapCall(env, "TesteEnvioLoteRPS", mensagem);
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

  const innerXml = [
    `<Cabecalho xmlns="" Versao="${SCHEMA_VERSION}">`,
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
    filtroParts.push(`<NumeroNFe xmlns="">${escapeXml(params.numeroNfse)}</NumeroNFe>`);
  }
  if (params.codigoVerificacao) {
    filtroParts.push(
      `<CodigoVerificacao xmlns="">${escapeXml(params.codigoVerificacao)}</CodigoVerificacao>`,
    );
  }
  if (params.dataEmissaoInicio) {
    filtroParts.push(
      `<DataEmissaoNFeInicial xmlns="">${escapeXml(params.dataEmissaoInicio)}</DataEmissaoNFeInicial>`,
    );
  }
  if (params.dataEmissaoFim) {
    filtroParts.push(
      `<DataEmissaoNFeFinal xmlns="">${escapeXml(params.dataEmissaoFim)}</DataEmissaoNFeFinal>`,
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

  const signedXml = await buildSignedMessage(env, "PedidoConsultaNFe", innerXml);
  const raw = await soapCall(env, "ConsultaNFe", signedXml);
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

  const signedXml = await buildSignedMessage(env, "PedidoConsultaLote", innerXml);
  const raw = await soapCall(env, "ConsultaLote", signedXml);
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

  const signedXml = await buildSignedMessage(env, "PedidoCancelamentoNFe", innerXml);
  const raw = await soapCall(env, "CancelamentoNFe", signedXml);
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

  const signedXml = await buildSignedMessage(env, "PedidoConsultaCNPJ", innerXml);
  const raw = await soapCall(env, "ConsultaCNPJ", signedXml);

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
