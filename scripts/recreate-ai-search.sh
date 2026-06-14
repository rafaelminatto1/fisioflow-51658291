#!/bin/bash
# scripts/recreate-ai-search.sh
# Cria as instâncias de AI Search com suporte a custom_metadata para resolver o bug de pastas esparsas (T023).

set -e

echo "Criando nova instância fisioflow-rag-v2 com metadata customizada..."
npx wrangler ai-search create fisioflow-rag-v2 \
  --type builtin \
  --custom-metadata source:text \
  --custom-metadata type:text \
  --custom-metadata wiki_id:text \
  --custom-metadata slug:text \
  --custom-metadata category:text

echo "Criando nova instância fisioflow-rag-paciente-v2 com metadata customizada..."
npx wrangler ai-search create fisioflow-rag-paciente-v2 \
  --type builtin \
  --custom-metadata source:text \
  --custom-metadata type:text \
  --custom-metadata wiki_id:text \
  --custom-metadata slug:text \
  --custom-metadata category:text

echo "--------------------------------------------------------"
echo "✅ Instâncias criadas com sucesso!"
echo "Próximos passos:"
echo "1. Atualize o wrangler.toml para usar fisioflow-rag-v2 e fisioflow-rag-paciente-v2"
echo "2. Envie os dados novamente usando a API ou seus scripts de carga inicial"
echo "--------------------------------------------------------"
