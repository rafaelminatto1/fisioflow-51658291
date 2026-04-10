#!/bin/bash
# Inicia Metro com tunnel e faz pre-bundle iOS automaticamente.
# O Metro usa lazy=true por padrão — sem isso, o bundle só compila
# quando o app abre no celular (lento na primeira vez).

set -e

# Garante que estamos no diretório correto
cd "$(dirname "$0")"

echo "🚀 Iniciando Metro Bundler com tunnel..."
npx expo start --tunnel "$@" &
EXPO_PID=$!

# Aguarda Metro ficar pronto (healthcheck no /status)
echo "⏳ Aguardando Metro iniciar (isso pode demorar com --clear)..."
TIMEOUT=300
ELAPSED=0
until curl -s http://localhost:8081/status > /dev/null 2>&1; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠️  Metro demorou mais de ${TIMEOUT}s para iniciar. Continuando mesmo assim..."
    break
  fi
done

# Garante que ao fechar o script (Ctrl+C), o Metro também feche
trap "kill $EXPO_PID 2>/dev/null" EXIT

echo "✅ Metro detectado! Compilando bundle iOS agora..."
echo "⏳ Aguarde a barra de progresso chegar em 100% no log acima..."

# Rodamos o curl sem o '&' para ele terminar antes do script ficar parado no 'wait'
# Isso evita o erro de 'ERR_STREAM_UNABLE_TO_PIPE'
curl -f -s \
  "http://localhost:8081/apps/professional-app/index.ts.bundle?platform=ios&dev=true&hot=false&lazy=false&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable" \
  -o /dev/null \
  --max-time 600

echo "📦 Pre-bundle concluído com SUCESSO! Pode abrir o app no celular."

# Mantém Metro em foreground para você ver os logs do app
wait $EXPO_PID
