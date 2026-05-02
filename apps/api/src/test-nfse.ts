import { signXmlEnveloped, signRps } from "./lib/nfseXmlSigner";
import fs from "fs";

const SP_WS_URL = "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
const NFE_NS = "http://www.prefeitura.sp.gov.br/nfe";

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

async function test() {
  const certPem = fs.readFileSync("../../cert.pem", "utf-8");
  const keyPem = fs.readFileSync("../../key.pem", "utf-8");

  const p = {
    numero: "999",
    serie: "RPS",
    tipo: "RPS",
    dataEmissao: new Date().toISOString(),
    cnpjPrestador: "54836577000167",
    inscricaoMunicipal: "13534157",
    tributacaoRps: "T",
    codigoServico: "04391",
    codigoCnae: "865004",
    codigoNBS: "117240800",
    discriminacao: "Sessao de fisioterapia - teste local",
    valorServicos: "100.00",
    valorDeducoes: "0.00",
    aliquota: "0.0200",
    issRetido: false,
    tomadorCpfCnpj: "11144477735",
    tomadorInscricaoMunicipal: "",
    tomadorRazaoSocial: "Paciente Teste",
    tomadorEmail: "teste@example.com",
    codigoMunicipio: "3550308",
  };

  const issRetidoStr = p.issRetido ? "true" : "false";
  
  const tomadorParts: string[] = [];
  const digits = p.tomadorCpfCnpj.replace(/\D/g, "");
  tomadorParts.push(`<CPFCNPJTomador><CPF>${escapeXml(digits)}</CPF></CPFCNPJTomador>`);
  tomadorParts.push(`<RazaoSocialTomador>${escapeXml(p.tomadorRazaoSocial)}</RazaoSocialTomador>`);
  tomadorParts.push(`<EmailTomador>${escapeXml(p.tomadorEmail)}</EmailTomador>`);

  const dataEmissaoDate = p.dataEmissao.slice(0, 10);

  const assinatura = await signRps(
    {
      inscricaoMunicipal: p.inscricaoMunicipal,
      serie: p.serie,
      numero: p.numero,
      dataEmissao: p.dataEmissao,
      tributacao: p.tributacaoRps,
      status: "N",
      issRetido: p.issRetido ? "S" : "N",
      valorServicos: "000000000010000",
      valorDeducoes: "000000000000000",
      codigoServico: "04391",
      indicadorCpfCnpj: "1",
      cpfCnpjTomador: digits,
    },
    keyPem,
  );

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
    `<CodigoServico>${p.codigoServico}</CodigoServico>`,
    `<AliquotaServicos>${p.aliquota}</AliquotaServicos>`,
    `<ISSRetido>${issRetidoStr}</ISSRetido>`,
    ...tomadorParts,
    `<Discriminacao>${escapeXml(p.discriminacao)}</Discriminacao>`,
    `<ValorCargaTributaria>0</ValorCargaTributaria>`,
    `<PercentualCargaTributaria>0</PercentualCargaTributaria>`,
    `<FonteCargaTributaria>1</FonteCargaTributaria>`,
    `<CodigoCEI>0</CodigoCEI>`,
    `<MatriculaObra>0</MatriculaObra>`,
    `<MunicipioPrestacao>${escapeXml(p.codigoMunicipio)}</MunicipioPrestacao>`,
    `<NumeroEncapsulamento>0</NumeroEncapsulamento>`,
    `<ValorTotalRecebido>${p.valorServicos}</ValorTotalRecebido>`,
  ];

  const rpsXml = rpsParts.join("");

  const innerXml = [
    `<Cabecalho xmlns="" Versao="1">`,
    `<CPFCNPJRemetente><CNPJ>54836577000167</CNPJ></CPFCNPJRemetente>`,
    `</Cabecalho>`,
    `<RPS xmlns="">${rpsXml}</RPS>`,
  ].join("");

  const unsignedXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<PedidoEnvioRPS xmlns="${NFE_NS}">`,
    innerXml,
    `</PedidoEnvioRPS>`,
  ].join("");

  const signedXml = await signXmlEnveloped(unsignedXml, certPem, keyPem, "");
  const cleanSignedXml = signedXml.replace(/<\?xml[^?]*\?>\s*/, "");

  const soapXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">`,
    `<soap:Body>`,
    `<EnvioRPSRequest xmlns="${NFE_NS}">`,
    `<VersaoSchema>1</VersaoSchema>`,
    `<MensagemXML>${escapeXmlContent(cleanSignedXml)}</MensagemXML>`,
    `</EnvioRPSRequest>`,
    `</soap:Body>`,
    `</soap:Envelope>`,
  ].join("");

  const https = await import("https");
  const axios = (await import("axios")).default;

  const agent = new https.Agent({
    cert: fs.readFileSync("../../cert.pem"),
    key: fs.readFileSync("../../key.pem"),
    rejectUnauthorized: false
  });

  try {
    const res = await axios.post(SP_WS_URL, soapXml, {
      httpsAgent: agent,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"http://www.prefeitura.sp.gov.br/nfe/ws/envioRPS"`,
      }
    });
    console.log("SUCCESS HTTP", res.status);
    console.log(res.data);
  } catch (e: any) {
    if (e.response) {
      console.log("FAIL HTTP", e.response.status);
      console.log(e.response.data);
    } else {
      console.error(e);
    }
  }
}

test();
