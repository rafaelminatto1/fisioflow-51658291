/**
 * XML Digital Signature para NFS-e São Paulo
 *
 * Implementa assinatura XML-DSig Enveloped conforme exigido pela
 * Prefeitura de São Paulo (padrão ICP-Brasil, RSA-SHA1, C14N).
 *
 * Referência: Manual Web Service NFS-e SP v3.3.5 — seção 3.2.3
 */

function base64Encode(data: ArrayBuffer): string {
	const bytes = new Uint8Array(data);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
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
	return pem.slice(startIdx + startMarker.length, endIdx).replace(/\s/g, '');
}

async function importPrivateKey(keyPem: string): Promise<CryptoKey> {
	const b64 = extractBase64FromPem(keyPem, 'PRIVATE KEY');
	const der = base64Decode(b64);

	return crypto.subtle.importKey(
		'pkcs8',
		der,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
		false,
		['sign'],
	);
}

export function extractCertB64(certPem: string): string {
	return extractBase64FromPem(certPem, 'CERTIFICATE');
}

function sha1Digest(data: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	return crypto.subtle.digest('SHA-1', encoder.encode(data));
}

async function rsaSha1Sign(key: CryptoKey, data: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	return crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(data));
}

function canonicalizeXml(xml: string): string {
	return xml
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.replace(/>\s+</g, '><')
		.replace(/\n\s*/g, '')
		.trim();
}

function getTagContent(xml: string, tag: string): string | null {
	const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
	const match = xml.match(regex);
	return match ? match[1] : null;
}

/**
 * Assina um XML com XML-DSig Enveloped (RSA-SHA1 + C14N)
 * Insere o elemento <Signature> dentro do elemento raiz do XML.
 */
export async function signXmlEnveloped(
	xml: string,
	certPem: string,
	keyPem: string,
	referenceUri: string = '',
): Promise<string> {
	const key = await importPrivateKey(keyPem);
	const certB64 = extractCertB64(certPem);

	const canonicalXml = canonicalizeXml(xml);

	const digestValue = base64Encode(await sha1Digest(canonicalXml));

	const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="${referenceUri}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

	const signatureValue = base64Encode(await rsaSha1Sign(key, signedInfo));

	const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo></Signature>`;

	const closingRoot = xml.lastIndexOf('</');
	if (closingRoot === -1) {
		throw new Error('XML inválido — sem tag de fechamento raiz');
	}

	return xml.slice(0, closingRoot) + signature + xml.slice(closingRoot);
}

/**
 * Gera a assinatura do RPS no formato exigido pela Prefeitura de São Paulo.
 *
 * Formato: SHA1(numeroRPS + serieRPS + tipoRPS + dataEmissao + ISSRetido +
 *   valorServicos + valorDeducoes + codigoServico + tomadorCNPJ/CPF +
 *   tomadorInscricaoMunicipal + atividadeAssinada + codigoMunicipio + ...)
 *
 * O resultado é codificado em Base64 e colocado no campo <Assinatura> do RPS.
 */
export async function signRps(
	params: {
		numero: string;
		serie: string;
		tipo: string;
		dataEmissao: string;
		issRetido: string;
		valorServicos: string;
		valorDeducoes: string;
		codigoServico: string;
		tomadorCpfCnpj: string;
		tomadorInscricaoMunicipal: string;
		atividadeAssinada: string;
		codigoMunicipio: string;
	},
	keyPem: string,
): Promise<string> {
	const parts = [
		params.numero.padStart(12, '0'),
		params.serie.padStart(5, '0'),
		params.tipo,
		params.dataEmissao.slice(0, 10).replace(/-/g, ''),
		params.issRetido,
		params.valorServicos.padStart(15, '0'),
		params.valorDeducoes.padStart(15, '0'),
		params.codigoServico.padStart(5, '0'),
		params.tomadorCpfCnpj ? params.tomadorCpfCnpj.padStart(14, '0') : '00000000000000',
		params.tomadorInscricaoMunicipal ? params.tomadorInscricaoMunicipal.padStart(8, '0') : '00000000',
		params.atividadeAssinada,
		params.codigoMunicipio,
	];

	const dataToSign = parts.join('');
	const key = await importPrivateKey(keyPem);
	const signature = await rsaSha1Sign(key, dataToSign);
	return base64Encode(signature);
}
