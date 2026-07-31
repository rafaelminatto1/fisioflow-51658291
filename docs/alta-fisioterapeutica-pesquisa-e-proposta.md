# Alta fisioterapêutica — pesquisa, o que já fazemos e proposta

> Medições em `purple-union-72678311` (31/07/2026), sobre 11.336 evoluções.
> Pesquisa via Exa: literatura internacional + prática brasileira.

---

## 1. O problema, em um número

**21 menções de alta, em 17 pacientes, em 11.336 evoluções.**

Corrijo aqui uma estimativa minha anterior de "1.458 evoluções mencionam alta / 26 pacientes". Estava inflada por dois falsos positivos que só apareceram ao ler o texto:

- **"alta" como adjetivo** — *prancha alta*, *remada alta*, *torácica alta*, *lombar alta*, *alta intensidade*. É a esmagadora maioria das ocorrências.
- **"última sessão"** — no nosso corpus significa quase sempre *a sessão anterior* ("ficou bem após última sessão"), não *a sessão final*.

O número real, depois de filtrar, é 21. Ou seja: **a alta praticamente não é documentada**. E `treatment_cycles` tem 0 linhas, `patients.status` tem 1.020 de 1.022 em "Inicial".

### A consequência que importa

Sem registro de alta, **é impossível distinguir alta de abandono**. Os 146 pacientes "ativos sem próxima sessão" e os 80 "em risco de abandono" que identifiquei podem ser qualquer uma das duas coisas — paciente curado que teve alta, ou paciente perdido. Hoje o sistema os trata igual, e qualquer campanha de reativação vai incomodar quem já foi liberado.

Isso não é hipótese. O estudo de reabilitação de LCA (Tuckerman et al.) fez ligações de follow-up com pacientes marcados como "faltou" e as duas razões mais comuns foram **"achei que tinha recebido alta"** e **"estou satisfeito com o joelho"**. É exatamente o nosso caso.

---

## 2. O que a literatura diz

### 2.1 Alta é decisão mal estudada e mal documentada — em toda parte

O estudo qualitativo de fisioterapia ortopédica ambulatorial (Physiother Can, PMC2909870) abre reconhecendo que quase não há pesquisa sobre *quando parar*. A literatura foca em admissão e tratamento, não em encerramento. Não estamos atrás do estado da arte: o estado da arte é fraco.

### 2.2 O que os fisioterapeutas realmente usam para decidir

O mesmo estudo identificou dois **fatores** (experiência do profissional e fonte de pagamento) e três **estratégias**:

1. **Facilitar autogestão** — o paciente sai com conhecimento e ferramentas para monitorar o próprio quadro e saber *quando procurar ajuda de novo*. Apareceu como o critério mais consistente, independente do diagnóstico.
2. **Negociar objetivos e gerenciar expectativas** — alta é atingir o objetivo *acordado*. Achado interessante: quando perguntados de forma genérica, todos citaram "objetivos do paciente"; quando pedidos exemplos concretos, quase não mencionavam. Ou seja, é a resposta socialmente correta, não necessariamente a prática.
3. **Usar achados objetivos** — para duas coisas: educar o paciente sobre o próprio progresso, e reconhecer **platôs**.

> Definição de alta bem-sucedida na literatura: **o paciente atingiu os objetivos E tem competência para se autogerenciar.** As duas condições, não uma.

### 2.3 Platô: o conceito operacional mais útil

O estudo distingue dois tipos, e a distinção muda a conduta:

| Tipo de platô | O que significa | Conduta |
|---|---|---|
| **Máximo funcional** | o paciente chegou ao teto do que a terapia oferece | alta |
| **Platô temporário** | o plano é que está esgotado, não o paciente | ajustar plano ou encaminhar |

Três desfechos possíveis ao detectar platô: encaminhar, ajustar o plano, ou dar alta. **Nunca "continuar igual"** — que é o desfecho default quando ninguém percebe o platô.

### 2.4 Objetivos de atividade/participação predizem melhor desfecho

O estudo norueguês FYSIOPRIM (N=2.591, BMC Musculoskelet Disord) classificou objetivos pela CIF:

| Classe do objetivo | % dos pacientes | Associação com desfecho |
|---|---:|---|
| Atividade/participação | 43,4% | **melhor** (OR 1,80 para melhora global) |
| Função/estrutura | 32,3% | referência |
| Sintoma | 17,0% | referência |
| Não classificável | 7,4% | **pior** para intensidade de dor |

Tradução prática: *"voltar a jogar futebol"* prediz melhor resultado que *"reduzir dor"*, e um objetivo vago prediz o pior de todos. Isso tem implicação direta de UI — o campo de objetivo não deveria ser texto livre solto.

### 2.5 Ferramenta de alta pontuada funciona

O POP-DST (perioperatório, PubMed 11834662) mostra que um escore composto pode substituir julgamento: concordância com a decisão do terapeuta de **kappa 0,91–0,96**, e 94% de acerto em prever quem não teria complicação. É evidência de que estruturar a decisão de alta não a empobrece.

### 2.6 A taxa de conclusão é baixa mesmo com programa estruturado

No estudo de LCA, mesmo introduzindo um modelo por fases com critérios objetivos, a taxa de alta formal ficou em **30–38%**. E — contraintuitivo — o modelo estruturado teve conclusão *menor*, porque os critérios objetivos revelaram que muitos pacientes não os atingiam. Ou seja: **medir alta vai fazer o número parecer pior antes de parecer melhor.** Isso precisa ser dito à gestão antes de implantar, ou o indicador será lido como piora.

### 2.7 PROMs são subutilizados, e sabe-se por quê

Estudo com fisioterapeutas portugueses: **82,7% nunca/raramente usam PROMs**, apesar de 78,9% considerarem importante. Barreiras: tempo por sessão, conhecimento, e falta de estímulo do empregador. Facilitadores citados: **uso obrigatório definido pelo empregador** e **plataforma digital que calcule o escore automaticamente**.

Esse é o achado mais acionável para nós: a barreira é de sistema, não de vontade. É o mesmo padrão que já vimos no EVA aqui (12,9% de preenchimento com o campo disponível).

### 2.8 A prática brasileira: alta como processo, não momento

Fonte nacional (Clinvo) sintetiza bem o que a alta formal exige, e a formulação vale citar:

> "Alta sem registro de encerramento não é alta — é interrupção de tratamento sem data."

Cinco elementos: registro do estado final, comparação antes/depois mostrada ao paciente, orientações de manutenção realistas, **critérios concretos de quando retornar** (não "se piorar, me ligue"), e **data de revisão já agendada antes de o paciente sair**.

O ponto sobre a comparação antes/depois é clínico, não marketing: a melhora é gradual, o paciente se acostuma, e subestima o quanto mudou. Mostrar "entrou com EVA 8, saiu com 1" corrige a distorção e aumenta adesão à manutenção.

---

## 3. O que nós já fazemos — e não sabíamos

Aqui está a parte boa. Medindo o corpus contra os critérios da literatura, a clínica **já pratica** boa parte deles — só não registra de forma recuperável.

| Prática da literatura | Marcador no nosso texto | Evoluções | Situação |
|---|---|---:|---|
| Linha de base objetiva | `LB:` (ex.: `LB: Abd GUD - 100°`) | **510** | ✅ existe e é sistemático |
| Autogestão / orientação domiciliar | "orientação domiciliar", "orientações para casa" | **703** | ✅ existe |
| Transição para autonomia | menção a academia | **1.228** | ✅ existe, é o desfecho de fato |
| Reavaliação | "reavaliação" | 141 | ⚠️ esporádica |
| Dinamometria / força objetiva | valores em kg por lado | 156 | ⚠️ esporádica |
| Objetivo terapêutico escrito | "objetivo" | **75** | ❌ raro |
| Retorno ao esporte | "retorno ao esporte", "liberado para" | 49 | ❌ raro |
| Bateria de teste de alta | "teste de alta", "hop test" | **1 / 4** | ❌ quase inexistente |
| Registro de alta | "está de alta", "recebeu alta" | **21** | ❌ quase inexistente |

### O achado mais interessante: `LB:`

510 evoluções abrem com `LB:` seguido de uma medida objetiva — `LB: Abd GUD - 100°`, `LB: flx de tronco >90°`. Isso é **exatamente** o "objective finding" que a literatura descreve como base para reconhecer platô e mostrar progresso. A clínica inventou sozinha uma convenção de linha de base.

Duas consequências:

1. É extraível pelo parser hoje (é padrão fixo `LB:` + medida + valor + unidade). Vira série temporal por paciente sem nenhuma captura nova.
2. É a fundação natural do comparativo antes/depois da alta. Não precisamos inventar a medida — ela já existe, só não é lida.

### O segundo achado: "academia" é o desfecho real

1.228 menções. Lendo os trechos, o padrão recorrente é o paciente migrando para treino autônomo — *"orientada a início da academia com frequência de 2x na semana"*. Isso **é** alta por autogestão, na definição da literatura. Só não é chamado assim nem registrado como tal.

---

## 4. Brainstorming — como resolver

### 4.1 Princípio: alta é evento, não status

Modelar como um registro datado com autor, motivo e estado final — não como um campo `status='alta'` no paciente. Razões: o paciente pode ter alta, voltar e ter alta de novo (já vimos *"está de alta do ombro. Próximas sessões serão para lombar"* — alta por região, tratamento continuando); e o histórico de altas é o que permite medir recidiva.

### 4.2 Taxonomia de encerramento

O erro a evitar é ter só "alta" e "abandono". A literatura e o nosso corpus pedem mais granularidade:

| Motivo | Quem decide | Significado |
|---|---|---|
| `alta_objetivo_atingido` | fisioterapeuta | objetivo acordado alcançado + autogestão |
| `alta_maximo_funcional` | fisioterapeuta | platô de máximo funcional; não há mais ganho a extrair |
| `alta_transicao_autonomia` | fisioterapeuta | migração para academia/treino autônomo — hoje é o mais comum de fato |
| `alta_medica` | médico externo | encerramento determinado fora |
| `encaminhado` | fisioterapeuta | platô temporário → outro profissional/especialidade |
| `interrompido_paciente` | paciente | decisão do paciente (mudança, custo, tempo) |
| `abandono` | ninguém | inferido por inatividade, nunca declarado |

`abandono` é o único inferido. Os demais são declarados — e é essa diferença que hoje não existe.

### 4.3 Onde capturar, sem criar tela nova

**Na finalização da evolução.** O fisioterapeuta já está ali. Um controle "Esta é a última sessão deste ciclo?" que, quando marcado, abre o bloco de alta no mesmo painel. Zero navegação extra.

O bloco de alta pede quatro coisas, todas já praticadas informalmente:

1. **Motivo** (taxonomia acima) — 1 clique
2. **Estado final vs. linha de base** — pré-preenchido a partir do `LB:` e do EVA extraídos; o profissional confirma
3. **Orientações de manutenção** — já escritas em 703 evoluções; virar campo estruturado
4. **Critério de retorno** — "volte se X" concreto, e **data de revisão sugerida**

### 4.4 O gatilho que falta: detecção de platô

Aqui a camada derivada que acabamos de construir paga pela primeira vez. Com 343 mil extrações, dá para detectar sem IA:

- **conduta idêntica há N sessões** (mesmo conjunto de códigos de conduta e região) → platô de plano
- **dosagem sem progressão** (`series`/`repeticoes`/`carga_kg` estáveis há N sessões) → platô de carga
- **EVA estável** quando houver série

Isso vira um alerta na evolução: *"Mesma conduta há 6 sessões, sem progressão de carga. É platô temporário (ajustar plano) ou máximo funcional (alta)?"* — que é literalmente a pergunta que a literatura diz que o fisioterapeuta deveria estar se fazendo.

**Este é o item de maior valor clínico de toda a proposta**, porque ataca o desfecho default de "continuar igual sem ninguém perceber".

### 4.5 Objetivo terapêutico com classe CIF

Dado o achado norueguês (OR 1,80 para atividade/participação), o campo de objetivo não deve ser texto livre puro. Proposta: texto livre + um seletor de classe (sintoma / função / atividade-participação), com o próprio sistema sinalizando quando o objetivo é só de sintoma — porque isso prediz desfecho pior e é corrigível na hora de definir.

`patient_goals` já existe e está vazia. Popular a existente.

### 4.6 Retroativo: até onde dá para ir

Sendo honesto sobre o limite:

- **Não dá** para inferir alta retroativa por inatividade. Seria exatamente o erro de viés de seleção que já testamos e descartamos na atribuição de autoria — os que somem não são os mesmos que recebem alta.
- **Dá** para extrair as 21 altas mencionadas em texto e marcá-las como `origem='texto'`, com confiança baixa.
- **Dá** para extrair as 510 linhas de base `LB:` e as 468 leituras de EVA, construindo o antes/depois de quem tiver ≥2 pontos.
- **Dá** para produzir uma lista de "candidatos a alta retroativa" para revisão humana — paciente sem sessão há >90 dias, com evolução final mencionando academia/orientação/melhora. A recepção confirma por telefone. Isso não é inferência automática: é fila de trabalho.

### 4.7 O indicador honesto de conclusão

Quando houver alta registrada, o indicador não deve ser "taxa de alta" isolada, e sim a **decomposição do desfecho**: % com alta declarada, % interrompido pelo paciente, % encaminhado, % abandono inferido, % ainda em tratamento.

E é preciso avisar a gestão desde já: pela literatura, o número inicial de alta formal ficará baixo (30–38% em serviço estruturado). **Medir vai fazer parecer pior antes de parecer melhor.** Se isso não for combinado antes, o indicador morre na primeira reunião.

---

## 5. Plano por etapas

### Etapa 1 — Extrair o que já existe (nenhuma captura nova)

- Parser de `LB:` → linha de base como série temporal
- Parser das 21 menções de alta → `origem='texto'`, confiança baixa
- Alerta de platô sobre `clinical_extractions` (conduta/dosagem/carga estáveis)
- Painel antes/depois no perfil, a partir de `LB:` + EVA

Entrega valor sem pedir nada da equipe. Melhor relação valor/atrito.

### Etapa 2 — Capturar alta daqui para frente

- Migration `discharge_events` (evento datado, não status)
- Bloco de alta na finalização da evolução
- Campo de objetivo com classe CIF, populando `patient_goals`
- Data de revisão agendada no ato da alta

### Etapa 3 — Fechar o ciclo

- Fila de "candidatos a alta retroativa" para a recepção confirmar
- Decomposição de desfecho como indicador de gestão
- Follow-up pós-alta (depende de telefone — hoje 25 de 1.022)

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Taxa de alta inicial baixa lida como piora | combinar com a gestão antes; a literatura mostra 30–38% em serviço estruturado |
| Campo de alta vira burocracia e é ignorado | pré-preencher com `LB:`/EVA já extraídos; máximo 4 campos; nunca bloquear finalização |
| Alerta de platô virar ruído | disparar só com N sessões e ausência de progressão em **duas** dimensões |
| Inferir alta por inatividade | proibido — mesmo viés de seleção já descartado na atribuição de autoria |
| Alta por região confundida com alta do tratamento | evento carrega região/queixa, não encerra o paciente |

---

## Apêndice — queries

```sql
-- Menções REAIS de alta (excluindo "alta intensidade", "prancha alta", "última sessão")
WITH a AS (
  SELECT patient_id, unnest(regexp_matches(observacao,
    '(.{0,70}(?:est[áa] de alta|recebeu alta|receber alta|dar alta|ter[áa] alta|alta m[ée]dica|alta fisioterap|quase de alta|de alta do)[^n].{0,70})','gi')) AS ctx
  FROM sessions WHERE deleted_at IS NULL)
SELECT count(*), count(DISTINCT patient_id) FROM a
WHERE ctx !~* 'alta intensidade|intensidade alta|alta performance';
-- → 21 ocorrências | 17 pacientes

-- Práticas de alta já presentes no corpus
SELECT
 count(*) FILTER (WHERE observacao ~* '\yLB\s*:')                       AS linha_de_base,   -- 510
 count(*) FILTER (WHERE observacao ~* 'orienta[çc][õo]es? (para|domiciliar|de casa)') AS orientacao,  -- 703
 count(*) FILTER (WHERE observacao ~* 'academia')                       AS academia,        -- 1228
 count(*) FILTER (WHERE observacao ~* 'reavalia')                       AS reavaliacao,     -- 141
 count(*) FILTER (WHERE observacao ~* '\yobjetivo\y')                   AS objetivo,        -- 75
 count(*) FILTER (WHERE observacao ~* 'retorno ao esporte|liberado para') AS retorno_esporte -- 49
FROM sessions WHERE deleted_at IS NULL;
```
