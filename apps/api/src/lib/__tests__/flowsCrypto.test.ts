import { describe, it, expect } from "vitest";
import { decryptFlowRequest, encryptFlowResponse } from "../flowsCrypto";

// Helpers de teste: geram um request cifrado como a Meta faria (chave pública),
// para o módulo decifrar com a privada — provando o round-trip.
async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
}
function b64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
async function toPkcs8Pem(key: CryptoKey) {
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", key));
  return `-----BEGIN PRIVATE KEY-----\n${b64(der)}\n-----END PRIVATE KEY-----`;
}

describe("flowsCrypto round-trip", () => {
  it("decripta o request e re-encripta a resposta com IV invertido", async () => {
    const pair = await generateKeyPair();
    const privatePem = await toPkcs8Pem(pair.privateKey);

    // Meta-side: gera AES-128, cifra AES com RSA-OAEP, cifra o payload com AES-GCM
    const aesRaw = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const aesKey = await crypto.subtle.importKey("raw", aesRaw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    const payload = { version: "3.0", action: "ping" };
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, aesKey, new TextEncoder().encode(JSON.stringify(payload))),
    );
    const encAesKey = new Uint8Array(
      await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pair.publicKey, aesRaw),
    );

    const { decrypted, aesKey: outKey, iv: outIv } = await decryptFlowRequest(
      { encrypted_flow_data: b64(ct), encrypted_aes_key: b64(encAesKey), initial_vector: b64(iv) },
      privatePem,
    );
    expect(decrypted.action).toBe("ping");

    // Resposta: encripta e confirma que decifra de volta com IV invertido
    const respB64 = await encryptFlowResponse({ data: { status: "active" } }, outKey, outIv);
    const respBytes = Uint8Array.from(atob(respB64), (ch) => ch.charCodeAt(0));
    const respIv = outIv.map((byte) => byte ^ 0xff);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: respIv, tagLength: 128 }, outKey, respBytes);
    expect(JSON.parse(new TextDecoder().decode(clear))).toEqual({ data: { status: "active" } });
  });
});
