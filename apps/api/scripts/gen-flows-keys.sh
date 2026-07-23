#!/usr/bin/env bash
set -euo pipefail
# Gera par RSA-2048 para o endpoint de WhatsApp Flows.
# Privada em PKCS#8 não-encriptado (WebCrypto importKey "pkcs8").
OUT_DIR="${1:-./.flows-keys}"
mkdir -p "$OUT_DIR"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$OUT_DIR/flows_private_pkcs8.pem"
openssl rsa -in "$OUT_DIR/flows_private_pkcs8.pem" -pubout -out "$OUT_DIR/flows_public.pem"
echo "Chaves geradas em $OUT_DIR"
echo "  privada: flows_private_pkcs8.pem  -> secret FLOWS_PRIVATE_KEY"
echo "  publica: flows_public.pem         -> subir na Meta (Task documentada abaixo)"
