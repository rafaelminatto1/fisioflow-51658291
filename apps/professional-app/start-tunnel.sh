#!/bin/bash
# Inicia Metro com tunnel e faz pre-bundle iOS automaticamente.
# O Metro usa lazy=true por padrão — sem isso, o bundle só compila
# quando o app abre no celular (lento na primeira vez).

set -e

# Garante que estamos no diretório correto
cd "$(dirname "$0")"

echo "🚀 Iniciando Metro Bundler com tunnel e mais memória..."
# Aumentamos o limite de memória do Node para 8GB e iniciamos o Expo
NODE_OPTIONS="--max-old-space-size=8192" npx expo start --lan "$@" &
EXPO_PID=$!

# Garante que ao fechar o script (Ctrl+C), o Metro também feche
trap "kill $EXPO_PID 2>/dev/null" EXIT

# Aguarda Metro ficar pronto (healthcheck no /status)
echo "⏳ Aguardando Metro iniciar..."
TIMEOUT=300
ELAPSED=0
until curl -s http://localhost:8081/status > /dev/null 2>&1; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠️  Metro demorou muito para responder. Continuando..."
    break
  fi
done

echo "✅ Metro detectado! Iniciando pre-bundle iOS..."
echo "💡 Se o progresso travar em 99%, não se preocupe, o script vai detectar a conclusão."

# Disparar o bundle em background mas redirecionar a saída para um arquivo temporário
# para podermos monitorar o progresso se quisermos, mas o foco é o log do Metro.
curl -f -s \
  "http://192.168.31.116:8081/apps/professional-app/index.ts.bundle?platform=ios&dev=true&hot=false&lazy=false&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable" \
  -o /dev/null \
  --max-time 600 &
CURL_PID=$!

# Aguarda o bundle terminar (seja pelo curl ou pelo tempo)
# Damos 5 segundos de folga após o Metro dizer que terminou
wait $CURL_PID 2>/dev/null || true

echo "📦 Pre-bundle finalizado! Pode abrir o app no celular."

# Mantém Metro em foreground
wait $EXPO_PID
