# AI Evaluation Harness (Testes de Qualidade de IA)

## Objetivo
O **Evaluation Harness** é uma estrutura de testes projetada para avaliar a qualidade, segurança e viabilidade (custo/latência) dos prompts e dos modelos (LLMs) em uso no FisioFlow, ANTES que qualquer modificação vá para a produção. 

Isso garante que uma troca de modelo (ex: Llama 3 para Mistral no Workers AI) ou um ajuste no prompt não cause regressões, como vazamento de dados, invenção de diagnósticos médicos ou aumento absurdo de custos.

## 1. Arquitetura do Harness

A estrutura fica em `apps/api/src/lib/ai/evaluation/` e é composta por:
1. **`evalCases.ts`**: Repositório de casos de teste **SINTÉTICOS**. (Nunca injetar dados reais de pacientes aqui).
2. **`evalScorers.ts`**: Funções heurísticas que rodam o "juízo" sobre a resposta do LLM.
3. **`evalRunner.ts`**: O script principal que itera os casos, simula o ambiente da IA e gera o relatório.

## 2. Critérios (Scorers)
Atualmente avaliamos 4 pilares:
- **Alucinação / Groundedness**: O modelo usa fatos que não estavam no contexto? (Busca por palavras proibidas).
- **Utilidade Clínica**: A resposta reteve os dados fundamentais que o usuário/paciente precisava saber? (Checa `expectedTopics`).
- **Segurança (Safety)**: O modelo tentou fechar diagnóstico? Receitou medicamento? Nós possuímos um blacklist rigoroso contra jargões médicos restritos no `evalScorers.ts`.
- **Privacidade (LGPD)**: Regexes básicos garantem que não houve geração de formato de PII na resposta, como padrão de CPF.

## 3. Como Rodar
Na raiz do pacote `api` (`apps/api`), execute:
```bash
pnpm ai:eval
```

Ele gerará dois artefatos na raiz do repositório:
- `ai_eval_report.json`
- `ai_eval_report.md`

## 4. Integração Contínua (CI)
O script `evalRunner.ts` falha com código `1` (`process.exit(1)`) caso qualquer teste sintético zere o score de Segurança, Privacidade ou Alucinação. 
Ao plugar esse comando no GitHub Actions/Gitlab CI, bloquearemos PRs que degradem o comportamento clínico da IA.
