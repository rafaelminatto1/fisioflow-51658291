function base64Encode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) as ArrayBuffer;
}

function base64Decode(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return toArrayBuffer(bytes);
}

function extractBase64FromPem(pem: string, label: string): string {
  const startMarker = `-----BEGIN ${label}-----`;
  const endMarker = `-----END ${label}-----`;
  const startIdx = pem.indexOf(startMarker);
  const endIdx = pem.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`PEM ${label} não encontrado`);
  }
  return pem.slice(startIdx + startMarker.length, endIdx).replace(/\s/g, "");
}

async function importPrivateKey(keyPem: string): Promise<CryptoKey> {
  const b64 = extractBase64FromPem(keyPem, "PRIVATE KEY");
  const der = base64Decode(b64);

  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-1" },
    false,
    ["sign"],
  );
}

export function extractCertB64(certPem: string): string {
  return extractBase64FromPem(certPem, "CERTIFICATE");
}

function sha1Digest(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-1", new TextEncoder().encode(data));
}

async function rsaSha1Sign(key: CryptoKey, data: string): Promise<ArrayBuffer> {
  return crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data));
}

function sortAttributes(xml: string): string {
  return xml.replace(/<([a-zA-Z0-9_:]+)((?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'))?)*)\s*(\/?)>/g,
    (_match, name: string, attrs: string, selfClose: string) => {
      if (!attrs.trim()) return `<${name}${selfClose}>`;
      const attrRegex = /\s+([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(\"[^\"]*\"|'[^']*')/g;
      const nsAttrs: [string, string][] = [];
      const otherAttrs: [string, string][] = [];
      let m: RegExpExecArray | null = attrRegex.exec(attrs);
      while (m !== null) {
        if (m[1].startsWith("xmlns")) {
          nsAttrs.push([m[1], m[2]]);
        } else {
          otherAttrs.push([m[1], m[2]]);
        }
        m = attrRegex.exec(attrs);
      }
      nsAttrs.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      otherAttrs.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      const allAttrs = [...nsAttrs, ...otherAttrs];
      return `<${name}${allAttrs.length ? " " : ""}${allAttrs.map(([k, v]) => `${k}=${v}`).join(" ")}${selfClose}>`;
    },
  );
}

function c14nCanonicalize(xml: string): string {
  let result = xml
    .replace(/<\?xml[^?]*\?>\s*/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  result = result.replace(/<([a-zA-Z0-9_:]+)([^>]*)\/>/g, (_match, tag, attrs) => {
    return `<${tag}${attrs}></${tag}>`;
  });

  result = result.replace(/>\s+</g, "><").trim();

  result = sortAttributes(result);

  return result;
}

export async function signXmlEnveloped(
  xml: string,
  certPem: string,
  keyPem: string,
  referenceUri: string = "",
): Promise<string> {
  const key = await importPrivateKey(keyPem);
  const certB64 = extractCertB64(certPem);

  const rootMatch = xml.match(/<([a-zA-Z0-9_:]+)[\s>]/);
  if (!rootMatch) throw new Error("XML inválido — sem elemento raiz");
  const rootTag = rootMatch[1];

  const rootOpenEnd = xml.indexOf(">", xml.indexOf(`<${rootTag}`));
  const rootCloseIdx = xml.lastIndexOf(`</${rootTag}>`);
  if (rootOpenEnd === -1 || rootCloseIdx === -1) {
    throw new Error("XML inválido — tags raiz incompletas");
  }

  const rootWithNs = xml.slice(xml.indexOf(`<${rootTag}`), rootOpenEnd + 1);
  const rootContent = xml.slice(rootOpenEnd + 1, rootCloseIdx);

  const xmlForDigest = rootWithNs + rootContent.replace(/>\s+</g, "><").trim() + `</${rootTag}>`;
  const canonicalXml = c14nCanonicalize(xmlForDigest);

  const digestValue = base64Encode(await sha1Digest(canonicalXml));

  const signedInfoXml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="${referenceUri}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

  const signatureValue = base64Encode(await rsaSha1Sign(key, signedInfoXml));

  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoXml}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo></Signature>`;

  const outputRoot = rootWithNs + rootContent + signatureXml + `</${rootTag}>`;
  const xmlDecl = xml.match(/^<\?xml[^?]*\?>\s*/)?.[0] ?? "";
  return xmlDecl + outputRoot;
}

export async function signRps(
  params: {
    inscricaoMunicipal: string;
    serie: string;
    numero: string;
    dataEmissao: string;
    tributacao: string;
    status: string;
    issRetido: string;
    valorServicos: string;
    valorDeducoes: string;
    codigoServico: string;
    indicadorCpfCnpj: string;
    cpfCnpjTomador: string;
  },
  keyPem: string,
): Promise<string> {
  const parts = [
    params.inscricaoMunicipal.padStart(8, "0"),
    params.serie.padEnd(5, " "),
    params.numero.padStart(12, "0"),
    params.dataEmissao.slice(0, 10).replace(/-/g, ""),
    params.tributacao,
    params.status,
    params.issRetido,
    params.valorServicos,
    params.valorDeducoes,
    params.codigoServico,
    params.indicadorCpfCnpj,
    params.cpfCnpjTomador.padStart(14, "0"),
  ];

  const dataToSign = parts.join("");
  (globalThis as any).__lastSignString = dataToSign;
  const key = await importPrivateKey(keyPem);
  const signature = await rsaSha1Sign(key, dataToSign);
  return base64Encode(signature);
}
