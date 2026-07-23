// Criptografia do endpoint de WhatsApp Flows (Data API 3.0), via WebCrypto.
// Meta cifra: AES-128 (raw) com RSA-OAEP-SHA256 -> encrypted_aes_key;
// payload com AES-128-GCM (tag de 16 bytes anexada) -> encrypted_flow_data.
// Resposta: mesmo AES key, IV com bits invertidos (XOR 0xFF), saída base64.

function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function b64ToBytes(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export async function decryptFlowRequest(
  body: { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string },
  privateKeyPem: string,
): Promise<{ decrypted: any; aesKey: CryptoKey; iv: Uint8Array }> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
  const aesRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64ToBytes(body.encrypted_aes_key),
  );
  const aesKey = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
  const iv = b64ToBytes(body.initial_vector);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    b64ToBytes(body.encrypted_flow_data),
  );
  return { decrypted: JSON.parse(new TextDecoder().decode(clear)), aesKey, iv };
}

export async function encryptFlowResponse(
  response: object,
  aesKey: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const responseIv = iv.map((byte) => byte ^ 0xff);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: responseIv, tagLength: 128 },
      aesKey,
      new TextEncoder().encode(JSON.stringify(response)),
    ),
  );
  return bytesToB64(ct);
}
