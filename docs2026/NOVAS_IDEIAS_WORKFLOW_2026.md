# Novas Ideias e Fluxo de Trabalho 2026

Este documento captura observações, melhorias de fluxo de trabalho e novas ideias identificadas durante a análise do projeto em Janeiro de 2026.

## 1. Arquitetura Híbrida (Firebase + Cloud SQL)
**Estado Atual:** O código atual utiliza Cloud Functions conectadas a uma instância Google Cloud SQL (`fisioflow-migration:us-central1:fisioflow-pg`), apesar do plano original mencionar "100% Firestore".

**Ideia/Ajuste:**
- **Reconhecimento Oficial:** Atualizar a documentação para oficializar a arquitetura híbrida. O Cloud SQL (PostgreSQL) é excelente para dados relacionais complexos (agendamentos, financeiro), enquanto o Firebase brilha em Auth, Storage e Realtime.
- **Vantagem:** O "Free Tier" do Google Cloud oferece uma instância micro gratuita de Compute Engine, mas o Cloud SQL geralmente é pago. **Atenção aos custos:** Verificar se o projeto se qualifica para créditos ou se o custo do Cloud SQL está dentro do orçamento esperado para ferramentas "baretas/gratuitas". Se o custo for um problema, manter o foco em Firestore e Cloud Functions; para dados fortemente relacionais, avaliar Cloud SQL ou outro banco gerenciado conforme necessidade.

## 2. Melhorias no Fluxo de Trabalho (Workflow)

### 2.1 Desenvolvimento Local com Cloud SQL
- **Problema:** Desenvolver localmente conectando ao Cloud SQL requer o `cloud_sql_proxy`.
- **Solução:** Criar um script npm `npm run db:proxy` que inicie o proxy automaticamente para permitir que as Cloud Functions locais (emulador) conversem com o banco de produção (ou banco de staging).

### 2.2 Compartilhamento de Tipos (End-to-End Type Safety)
- **Ideia:** Garantir que os tipos TypeScript definidos no backend (Cloud Functions/Entities) sejam os mesmos consumidos pelo Frontend (Web e iOS).
- **Ação:** Verificar o pacote `packages/shared-types` e garantir que ele seja a única fonte de verdade para modelos de dados.

## 3. iOS e Mobile
- **Estado:** Os apps iOS (`patient-ios`, `professional-ios`) estão criados via Expo.
- **Ideia:** Implementar um **"Development Menu"** secreto nos apps mobile para facilitar testes (trocar de ambiente, limpar cache, preencher dados de teste).

## 4. Google Cloud Free Tier & Otimização
- **Storage:** Configurar regras de ciclo de vida (lifecycle policies) no Cloud Storage para mover arquivos antigos para classes de armazenamento mais baratas (Coldline/Archive) automaticamente.
- **Cloud Run vs Functions Gen 2:** Considerar migrar de Cloud Functions para Cloud Run para maior controle de concorrência e custos, embora a Gen 2 já use Cloud Run por baixo dos panos.

## 5. Próximos Passos (Immediate Action Items)
1. Confirmar a estratégia de banco de dados (Cloud SQL vs Firestore).
2. Validar o build dos apps iOS.
3. Criar scripts de "Health Check" para verificar se todas as conexões (DB, API) estão ativas após um deploy.
