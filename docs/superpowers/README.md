# ⚡ FisioFlow - Superpowers (AI Specs)

Este diretório contém as especificações técnicas das funcionalidades que compõem a inteligência clínica do FisioFlow.

## 🤖 Visão Geral da IA
Utilizamos modelos de última geração (**Gemini 3.0**, **Claude 3.5 Sonnet**) integrados diretamente ao fluxo de trabalho clínico para automatizar tarefas repetitivas e gerar insights diagnósticos.

## 📋 Especificações Disponíveis

| Funcionalidade | Descrição | Status |
| :--- | :--- | :--- |
| [AI Studio](./specs/2026-04-19-fisioflow-ai-studio-design.md) | Central de criação de planos de tratamento e análise diagnóstica. | ✅ Produção |
| [FisioAmbient Scribe](./specs/2026-04-19-fisioambient-scribe-design.md) | Transcrição e resumo automático de sessões em tempo real. | ✅ Produção |
| [Premium Reports](./specs/2026-04-19-ia-studio-premium-reports-design.md) | Geração de laudos clínicos detalhados com análise visual. | ✅ Produção |
| [Avaliações Paciente](./specs/2026-04-14-avaliacoes-template-paciente-design.md) | Templates inteligentes para avaliações físicas. | ✅ Produção |
| [Refactor Header Evolution](./specs/2026-04-16-refactor-evolution-header.md) | Interface dinâmica para acompanhamento de evolução. | 🛠️ Finalizado |

## 🛠️ Tecnologias Utilizadas
- **Modelos**: Google Gemini 3.0 Thinking Mode, Structured Outputs via Zod.
- **Processamento**: Cloudflare Workers AI + OpenAI SDK (Compatibility Layer).
- **Interface**: Block-based Editor (Tiptap) com extensões personalizadas.

---
**Última Atualização:** Abril 2026
**Responsável:** AI Orchestration Team
