#!/usr/bin/env bash
# Puxa crash reports do iPhone (via USB, Linux/libimobiledevice) e mostra o resumo
# do crash mais recente do FisioFlow Pro: tipo, thread culpada e módulo.
#
# Uso:
#   1. Conecte o iPhone por USB e desbloqueie (confie no computador se pedir).
#   2. ./scripts/pull-ios-crashes.sh
#
# Requer: libimobiledevice (idevice_id, idevicecrashreport) — já instalado.

set -uo pipefail

OUT_DIR="${1:-/tmp/fisioflow-ios-crashes}"
FILTER="FisioFlow"   # bate em FisioFlowPro / com.fisioflow.professionals

echo "==> Verificando daemon usbmuxd..."
if ! pgrep -x usbmuxd >/dev/null 2>&1; then
  echo "    usbmuxd não está rodando; tentando iniciar (pode pedir sudo)..."
  sudo systemctl start usbmuxd 2>/dev/null || sudo usbmuxd 2>/dev/null || \
    echo "    (não consegui iniciar automaticamente — normalmente o systemd ativa ao plugar)"
  sleep 1
fi

echo "==> Procurando device..."
UDID="$(idevice_id -l 2>/dev/null | head -1)"
if [ -z "$UDID" ]; then
  echo "ERRO: nenhum iPhone detectado."
  echo "  - Conecte o cabo USB e desbloqueie o aparelho."
  echo "  - Se aparecer 'Confiar neste computador?', toque em Confiar."
  echo "  - Rode de novo: ./scripts/pull-ios-crashes.sh"
  exit 1
fi
echo "    Device: $(ideviceinfo -k DeviceName 2>/dev/null) (iOS $(ideviceinfo -k ProductVersion 2>/dev/null)) [$UDID]"

mkdir -p "$OUT_DIR"
echo "==> Puxando crash reports (mantendo cópia no device com -k)..."
idevicecrashreport -e -k -f "$FILTER" "$OUT_DIR" >/dev/null 2>&1

REPORTS="$(find "$OUT_DIR" -type f \( -name "*FisioFlow*.ips" -o -name "*FisioFlow*.crash" \) 2>/dev/null | sort)"
if [ -z "$REPORTS" ]; then
  echo "Nenhum crash report do FisioFlow encontrado no device."
  echo "  -> Reproduza o crash (abra a tela que fecha o app), aguarde alguns segundos e rode de novo."
  echo "  -> Diretório verificado: $OUT_DIR"
  exit 0
fi

LATEST="$(ls -t $REPORTS | head -1)"
echo ""
echo "================================================================"
echo "CRASH MAIS RECENTE: $LATEST"
echo "================================================================"
echo ""
echo "----- CABEÇALHO / TIPO DE EXCEÇÃO -----"
grep -aiE "\"?(exception_?type|exceptionType|signal|termination|reason|faulting|incident_id|bug_type)\"?" "$LATEST" 2>/dev/null | head -20
echo ""
echo "----- PRIMEIROS FRAMES (thread culpada) -----"
# Formato legado .crash: bloco "Thread N Crashed:". Formato .ips: JSON na 2a linha.
if grep -qa "Thread .* Crashed:" "$LATEST"; then
  awk '/Thread [0-9]+ Crashed:/{f=1} f{print} /^$/{if(f)exit}' "$LATEST" | head -25
else
  echo "(.ips JSON — extraindo frames legíveis)"
  python3 - "$LATEST" <<'PY' 2>/dev/null || echo "  (não foi possível parsear automaticamente — abra o arquivo: $LATEST)"
import sys, json
lines = open(sys.argv[1], encoding="utf-8", errors="replace").read().splitlines()
# .ips: linha 1 = metadados, resto = payload JSON
payload = json.loads("\n".join(lines[1:])) if len(lines) > 1 else json.loads(lines[0])
print("exceptionType:", payload.get("exception", {}).get("type"))
print("signal       :", payload.get("exception", {}).get("signal"))
print("termination  :", payload.get("termination", {}))
imgs = payload.get("usedImages", [])
faulting = next((t for t in payload.get("threads", []) if t.get("triggered")), None)
if faulting:
    print("\nThread culpada (#%s):" % faulting.get("id"))
    for fr in faulting.get("frames", [])[:20]:
        idx = fr.get("imageIndex", -1)
        name = imgs[idx].get("name") if 0 <= idx < len(imgs) else "?"
        sym = fr.get("symbol", "")
        off = fr.get("imageOffset", "")
        print(f"  {name:30} {sym} +{off}")
PY
fi
echo ""
echo "================================================================"
echo "Todos os reports salvos em: $OUT_DIR"
echo "Me cole o bloco acima (ou o arquivo .ips/.crash inteiro) para eu identificar o módulo culpado."
