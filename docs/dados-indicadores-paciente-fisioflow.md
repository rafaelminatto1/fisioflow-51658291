# FisioFlow — Dados e indicadores por paciente

Este documento resume os tipos de dados e indicadores que o sistema novo consegue guardar ou exibir por paciente.

Fontes verificadas no código:

- `packages/db/src/schema/patients.ts`
- `packages/db/src/schema/clinical.ts`
- `src/types/workers.ts`
- `src/components/patient/PatientClinicalHistoryTab.tsx`

Diagrama HTML complementar:

- `docs/patient-data-diagram.html`

---

## 1. Cadastro e identidade

Inclui:

- ID do paciente
- organização/clínica
- nome completo
- nome social
- apelido/nickname
- CPF
- RG
- gênero
- data de nascimento
- foto/avatar
- profissão
- status do paciente
- paciente ativo/inativo
- cadastro incompleto
- versão do cadastro
- data de criação
- data de atualização
- data de exclusão lógica, quando arquivado/removido

---

## 2. Contato e localização

Inclui:

- telefone principal
- telefone secundário
- email
- endereço estruturado:
  - CEP
  - rua
  - número
  - complemento
  - bairro
  - cidade
  - estado
- contato de emergência:
  - nome
  - telefone
  - parentesco/relação

---

## 3. Convênio, origem e vínculo comercial

Inclui:

- convênio/plano:
  - operadora
  - plano
  - número da carteirinha
  - validade
- origem do paciente
- indicação/referred by
- empresa parceira
- modelo pagador:
  - particular
  - convênio
  - empresa/parceiro
  - outros modelos conforme catálogo do sistema
- profissional responsável
- profissional principal
- nome do profissional responsável

---

## 4. Perfil clínico estruturado

Esse é o bloco exibido na aba **Histórico Clínico**.

Inclui:

- esportes praticados
  - exemplos: corrida, musculação, caminhada, luta
- perfis de cuidado
  - exemplos: ortopédico, esportivo, pós-operatório, prevenção, idosos
- focos terapêuticos
  - exemplos: analgesia, força, mobilidade, retorno ao esporte
- alergias gerais
- alergias medicamentosas
- medicações em uso
- patologias/diagnósticos ativos
- alertas clínicos importantes
- tipo sanguíneo
- peso
- altura
- estado civil
- escolaridade
- observações gerais
- notas internas

---

## 5. Patologias e diagnósticos

Existem dois níveis principais.

### 5.1 Tags rápidas no paciente

Inclui:

- patologias ativas
- patologia principal
- nomes de patologias
- status das patologias

### 5.2 Tabela clínica estruturada `patient_pathologies`

Inclui:

- nome da patologia
- descrição
- data do diagnóstico
- status:
  - ativo
  - resolvido
  - crônico
- patologia principal ou não
- CID-10
- data de criação/atualização

Também existe vínculo com prontuário/anamnese:

- diagnóstico textual
- códigos CID-10
- patologias extraídas de `medical_records`

---

## 6. Alergias

Inclui dois modelos.

### 6.1 Campo rápido no paciente

- alergias gerais
- alergias medicamentosas

### 6.2 Campo estruturado no prontuário

- alérgeno
- reação
- severidade:
  - leve
  - moderada
  - severa

---

## 7. Medicações

Inclui dois modelos.

### 7.1 Campo rápido no paciente

- medicações em uso

### 7.2 Campo estruturado no prontuário

- nome da medicação
- dose
- frequência
- data de início

Também há campo textual:

- medicações atuais
- remédios controlados importados do ZenFisio, quando presentes no texto bruto

---

## 8. Cirurgias

Inclui:

- indicação se tem cirurgia
- indicação se é cirurgia recente
- nome da cirurgia
- data da cirurgia
- cirurgião
- hospital
- protocolo pós-operatório
- observações
- vínculo com prontuário/anamnese

---

## 9. Prontuário / anamnese

Inclui:

- data do registro
- queixa principal
- histórico médico
- história da doença atual / HDA
- histórico pregresso / HMP
- histórico familiar
- medicações atuais
- cirurgias prévias
- hábitos de vida
- atividade física
- diagnóstico
- CID-10
- origem/criador do registro
- dados brutos preservados da avaliação ZenFisio

---

## 10. Exame físico

Dentro do prontuário, o sistema suporta:

- inspeção
- palpação
- postura
- marcha
- ADM / amplitude de movimento:
  - ativa
  - passiva
  - normal
- força muscular, escala 0–5
- testes especiais:
  - nome do teste
  - resultado positivo/negativo
  - observações

---

## 11. Avaliações clínicas

Inclui:

- avaliação inicial
- fichas/templates de avaliação
- respostas de avaliação por paciente
- status da avaliação:
  - agendada
  - em preenchimento
  - concluída
  - cancelada
- data agendada
- data de início
- data de conclusão
- número de campos respondidos
- formulário usado
- avaliações importadas do ZenFisio:
  - `ZenFisio - Anamnese importada`
  - `ZenFisio - Avaliação completa importada`

---

## 12. Evolução clínica / sessões

Inclui:

- sessões SOAP
- subjetivo
- objetivo
- avaliação
- plano/conduta
- data da sessão
- número da sessão
- status:
  - rascunho
  - finalizada
  - cancelada
- escala de dor
- local da dor
- característica da dor
- duração da sessão
- assinatura
- data de assinatura
- versão
- último editor
- histórico de autosave

---

## 13. Métricas por sessão

Tabela `patient_session_metrics`.

Inclui:

- número da sessão
- data da sessão
- dor antes
- dor depois
- redução de dor
- score funcional antes
- score funcional depois
- melhora funcional
- humor antes
- humor depois
- duração em minutos
- tipo de tratamento
- técnicas usadas
- áreas tratadas
- satisfação do paciente
- observações
- terapeuta responsável

---

## 14. Mapa de dor

Inclui:

- região corporal
- nível de dor
- cor/código visual
- observações
- pontos no corpo:
  - coordenada X
  - coordenada Y
  - intensidade
  - região

---

## 15. Objetivos terapêuticos

Inclui:

- objetivos clínicos do paciente
- descrição
- data-alvo
- status:
  - em andamento
  - concluído
  - cancelado
- prioridade:
  - baixa
  - média
  - alta
- data em que foi alcançado
- metadados extras

Também há objetivos prováveis extraídos automaticamente do texto clínico, por exemplo:

- retorno ao esporte/performance
- redução de dor
- ganho de força
- mobilidade/ADM

---

## 16. Exercícios e prescrições

Inclui:

- exercícios prescritos
- prescrição de exercícios
- exercício vinculado
- frequência
- séries
- repetições
- duração
- notas
- ativo/inativo
- QR code
- título da prescrição
- validade
- status
- número de visualizações
- última visualização
- exercícios concluídos

---

## 17. Testes clínicos e escalas

Inclui:

- templates de testes clínicos
- tipo do teste
- nome do teste
- articulação alvo
- objetivo do teste
- execução
- sinal positivo
- referência
- sensibilidade/especificidade
- tags
- campos customizados
- resultados padronizados:
  - tipo do teste
  - nome do teste
  - escala
  - score
  - score máximo
  - interpretação
  - respostas
  - data de aplicação
  - profissional que aplicou
  - notas

---

## 18. Financeiro do paciente

Inclui:

- modelo pagador
- valor da sessão
- saldo em aberto
- status financeiro:
  - em dia
  - saldo pendente
  - em cobrança
  - crédito
  - não faturado
- pacotes do paciente
- sessões restantes
- total de agendamentos
- sessões concluídas

---

## 19. Agenda e comportamento operacional

Inclui:

- última consulta
- próxima consulta
- total de agendamentos
- sessões concluídas
- quantidade de faltas / no-show
- próximas consultas
- risco de no-show
- inatividade:
  - 7 dias
  - 30 dias
  - 60 dias
- classificação do paciente:
  - ativo
  - novo paciente
  - em risco
  - concluído/alta

---

## 20. IA e preferências

Inclui:

- preferências de IA:
  - tom de comunicação
  - canal preferido
  - resumo por IA habilitado ou não
- chat IA contextual 360°
- relatório premium por IA
- laudo médico por IA
- resumo longitudinal
- alertas clínicos/operacionais
- risco do paciente
- contexto clínico para agentes/IA

---

## 21. Documentos, mídia e anexos

Inclui:

- documentos do paciente
- nome do arquivo
- caminho/storage
- tipo do arquivo
- tamanho
- categoria
- descrição
- URL de armazenamento
- responsável pelo upload
- fotos
- vídeos
- anexos médicos

---

## Diagrama textual

```text
                           PACIENTE
                              |
        ------------------------------------------------
        |              |              |                |
   Cadastro       Perfil Clínico   Prontuário      Operação
        |              |              |                |
   nome            esportes        anamnese        agenda
   CPF/RG          alergias        HDA/HMP         faltas
   telefone        medicações      exame físico    última consulta
   email           patologias      diagnóstico     próxima consulta
   endereço        cirurgias       CID-10          status
   convênio        alertas         dados ZenFisio  classificação
        |              |              |                |
        ------------------------------------------------
                              |
                  Evolução clínica e indicadores
                              |
        ------------------------------------------------
        |              |              |                |
     Sessões       Métricas        Dor/Testes       Financeiro
        |              |              |                |
     SOAP          dor antes       mapa de dor      saldo aberto
     conduta       dor depois      testes clínicos  pacotes
     assinatura    função antes    escalas          sessões restantes
     PDF           função depois   interpretação    modelo pagador
                   satisfação
                   técnicas usadas
```

---

## Resumo prático

O sistema novo não guarda apenas nome e telefone. Ele mantém um perfil 360° do paciente, incluindo:

- cadastro
- contato
- convênio
- esportes
- alergias
- medicações
- patologias
- cirurgias
- objetivos
- anamnese
- exame físico
- evolução clínica
- dor
- agenda
- financeiro
- documentos
- indicadores de risco/IA

Na migração ZenFisio, o ponto mais importante é que os dados brutos da avaliação foram preservados e, quando possível, também viraram campos estruturados como esportes, patologias, medicações, cirurgias, objetivos e alertas.
