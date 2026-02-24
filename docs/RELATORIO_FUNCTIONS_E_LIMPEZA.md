# 📊 Relatório de Cloud Functions e Guia de Limpeza - FisioFlow
**Data:** 23 de Fevereiro de 2026  
**Objetivo:** Mapear o impacto das funções atuais e recomendar a remoção de redundâncias para otimizar custos e resolver limites de cota de CPU.

---

## 1. Funções CRÍTICAS (Não remover)
*Estas funções garantem o funcionamento básico do app, segurança e automação clínica.*

| Função | Categoria | Impacto / Importância |
| :--- | :--- | :--- |
| `patientServiceHttp` | Core API | Centraliza todas as operações de pacientes. O frontend moderno depende dela. |
| `appointmentServiceHttp` | Core API | Centraliza a gestão da agenda e consultas. |
| `evolutionServiceHttp` | Core API | Gerencia os prontuários e evoluções (SOAP). |
| `onUserCreated` | Automação | Cria o perfil inicial do profissional no primeiro acesso. |
| `onPatientCreated` | Automação | Configura a carteira financeira do paciente automaticamente. |
| `appointmentReminders` | Automação | Envia avisos matinais para evitar faltas. |
| `createAdminUser` | Gestão | Permite a criação de novos usuários com permissões administrativas. |

---

## 2. Novas Funções de OTIMIZAÇÃO (Manter)
*Implementadas recentemente para garantir o Free Tier e reduzir custos operacionais.*

| Função | Objetivo | Benefício Free Tier |
| :--- | :--- | :--- |
| `optimizeImageOnUpload` | Compressão de Imagem | Reduz uso de Storage em até 80% (converte para WebP). |
| `setDocumentTTL` | Limpeza Automática | Define data de expiração para logs e notificações. |
| `deleteExpiredDocuments` | Faxina de Banco | Apaga dados velhos para manter o Firestore abaixo de 1GB. |
| `processNotificationQueue` | Escalabilidade | Processa avisos em segundo plano para não travar o app. |

---

## 3. Inteligência Artificial e Analytics (Manter se usar IA)
*Funções que dão o diferencial "inteligente" ao FisioFlow.*

| Função | Impacto |
| :--- | :--- |
| `aiServiceHttp` | A única função necessária para toda a IA (SOAP, Chat, Análise). |
| `indexExistingEvolutions` | Permite a busca semântica em prontuários antigos. |
| `dashboardMetrics` | Fornece dados para o novo Dashboard de gestão clínica. |
| `churnPrediction` | Prediz quais pacientes estão prestes a abandonar o tratamento. |

---

## 4. CANDIDATAS À LIMPEZA (Podem ser removidas)
*Funções duplicadas, de uso único ou de depuração.*

### A. Redundâncias (Já cobertas pelos Unified Services)
As funções abaixo podem ser removidas se o frontend for atualizado para usar os `...ServiceHttp`:
*   `listPatientsV2`, `getPatientHttp`, `createPatientV2`
*   `listAppointments`, `getAppointmentV2`, `cancelAppointmentV2`
*   `listTransactionsV2`, `createTransactionV2`, `deleteTransactionV2`

### B. Scripts de Migração (Uso Único - Já executados)
Estas funções servem para atualizar o banco de dados e não precisam ficar ativas:
*   `runDoctorsTable`, `runPatientMedicalReturnCols`, `runPerformanceIndexes`
*   `fixUserOrganization`, `createOptimizedIndexes`, `fixAppointmentIndex`
*   `migrateRolesToClaims`

### C. Funções de Teste e SSR
*   `test...` (qualquer uma que comece com test)
*   `ssrfisioflow...` (parecem restos de testes de renderização que não impactam o app final)

---

## 5. Estratégia de Limpeza Recomendada

Para limpar o projeto sem quebrar nada, siga estes passos no arquivo `functions/src/index.ts`:

1.  **Comentar Migrações:** Desative todos os exports que apontam para a pasta `./migrations/`.
2.  **Unificar APIs:** Se o seu frontend já aponta para as funções unificadas (`patientService`, etc.), apague as funções individuais (`createPatientV2`, etc.).
3.  **Resultado Esperado:** Reduzir de **120 funções** para aproximadamente **35 funções**.
4.  **Impacto Imediato:** O deploy deixará de dar erro de "Cota de CPU excedida" e será muito mais rápido.

---

## 6. Próximos Passos no Frontend
Para aproveitar as funções novas, o frontend precisa:
1.  **URL do Exercise Service:** Apontar uploads de exercícios para: `https://exercise-service-412418905255.us-central1.run.app/api/exercises/analyze`
2.  **Página de Gestão:** Criar uma tela para exibir os dados vindos de `dashboardMetrics` e `topExercises`.
