# Guia de Ações Manuais Pós-Implementação

Para que as melhorias do Agent Hub funcionem corretamente em produção, execute as seguintes ações:

## 1. Banco de Dados (Neon)
Acesse o console do Neon e execute o SQL abaixo para criar a tabela de curadoria e configurar a segurança RLS:

```sql
CREATE TABLE IF NOT EXISTS "clinical_resource_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"query" text NOT NULL,
	"suggested_type" text NOT NULL,
	"suggested_title" text NOT NULL,
	"external_source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "clinical_resource_suggestions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinical_resource_suggestions' 
        AND policyname = 'policy_clinical_resource_suggestions_isolation'
    ) THEN
        CREATE POLICY "policy_clinical_resource_suggestions_isolation" ON "clinical_resource_suggestions" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (current_setting('app.org_id'::text))::uuid);
    END IF;
END $$;
```

## 2. Cloudflare Permissões
O deploy automático falhou por falta de permissão no token atual.
- **Ação**: Atualize o seu `CLOUDFLARE_API_TOKEN` no GitHub Actions ou no ambiente de deploy para incluir a permissão **AI Search: Edit**.
- **Deploy Manual**: Se preferir, rode o comando abaixo com um token administrativo local:
  ```bash
  cd apps/api && npx wrangler deploy --env production
  ```

## 3. Sincronização de Dados (AutoRAG)
Após o deploy bem-sucedido, acesse o dashboard ou use o comando abaixo para popular o AutoRAG com os novos metadados:

```bash
# Substitua {TOKEN} por um token válido de autenticação do sistema
curl -X POST https://api-pro.moocafisio.com.br/api/ai-search/sync?types=exercises,wiki,protocols \
     -H "Authorization: Bearer {TOKEN}"
```

## 4. Verificação de UI
Abra o Agent Hub no frontend, selecione o **Simulador de Paciente** e pergunte algo clínico como "Qual teste fazer para dor no joelho?". Verifique se os cards aparecem e se o botão "Abrir" exibe o novo modal de preview.

## 5. Testes de Aprimoramento
Para validar a nova inteligência de busca:
1. **Body Region Boosting**: No Simulador, pergunte 'Qual exercício para dor no ombro?'. Verifique se os recursos que mencionam 'ombro' nos metadados ou descrição aparecem no topo (o score deve ter um bônus de 10%).
2. **Sugestão Biomecânica**: Tente uma busca por algo raro, como 'Exercício para síndrome de Parsonage-Turner'. Verifique se a IA gera uma sugestão externa (external_suggestion) com link para o YouTube focado em reabilitação.
3. **Animações**: Note que os cards agora entram com um efeito de slide e fade-in escalonado, tornando a resposta do simulador mais 'viva'.
