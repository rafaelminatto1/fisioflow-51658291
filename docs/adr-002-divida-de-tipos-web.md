# ADR-002 — Como pagar os 3.478 erros de tipo da web

**Data:** 06/08/2026
**Estado:** aceito
**Contexto:** `src/` (fisioflow-web) não tem typecheck funcional

## O problema

`pnpm type-check` na web devolve **3.478 erros**. Não é config — verifiquei a
distribuição antes de assumir:

| Área | Erros |
|---|---|
| `src/components` | 1.480 |
| `src/hooks` | 594 |
| `src/lib` | 541 |
| `src/pages` | ~477 |
| `src/data` | 48 |
| `src/features` | 36 |
| `src/api` | 31 |
| resto | ~271 |

Por código: `TS2339` (propriedade não existe) 1.299, `TS2322` (tipo não
atribuível) 516, `TS2304` (nome não encontrado) 301, `TS2345` 241, `TS7006`
(parâmetro implícito `any`) 193.

**A consequência é pior que o número:** com milhares de erros antigos, ninguém
enxerga um erro novo. Na prática a web deploya sem verificação de tipo, e o
`tsc` deixou de ser rede de proteção.

## Decisão

Pagar por **área, da folha para a raiz**, com a catraca travando cada ganho.
Não corrigir por código de erro nem por arquivo isolado.

### Por que da folha para a raiz

`TS2339` dominar (1.299 de 3.478) diz o que está acontecendo: objetos tipados
como `any`, `unknown` ou com shape desatualizado sendo acessados por
propriedade. A causa quase nunca está no componente que acusa o erro — está no
tipo que ele consome, vindo de `src/types`, `src/api` ou `src/lib`.

Corrigir `src/components` primeiro seria tapar 1.480 sintomas. Corrigir os
tipos de origem primeiro derruba erros em cascata nos consumidores.

### Ordem

1. **`src/types` (53) + `src/api` (31)** — a fonte dos shapes. Menor volume,
   maior efeito cascata. Comece aqui e meça quanto o total cai sozinho.
2. **`src/lib` (541)** — utilitários e clientes; consumidos por todo o resto.
3. **`src/hooks` (594)** — camada de dados; depende de 1 e 2.
4. **`src/data` + `src/features` + `src/contexts` (~90)** — pequenos, limpam rápido.
5. **`src/components` (1.480)** — por último, e provavelmente já bem menor.
6. **`src/pages` (~477)** — folhas verdadeiras, nenhum consumidor.

Meça o total depois de cada etapa. Se a etapa 1 não derrubar nada além dos
próprios 84, a hipótese de cascata está errada e vale reavaliar a ordem — não
insista contra a medição.

### Regras de execução

- **Uma área por PR.** Rode `pnpm typecheck:ratchet:update` e commite o
  `typecheck-baseline.json` novo junto. O ganho fica travado.
- **Proibido `@ts-ignore` e `as any` para baixar o número.** Isso move a dívida
  para onde ninguém mede. Se um tipo é genuinamente desconhecido, use `unknown`
  e trate explicitamente.
- **Sem refatorar comportamento junto.** PR de tipo mexe em tipo. Misturar
  torna impossível saber se uma regressão veio da tipagem ou da lógica — e a
  web não tem testes suficientes para pegar isso.
- **`TS7006` (193) é o alvo mais barato:** parâmetro implícito `any`, quase
  sempre resolvido anotando o parâmetro. Bom para a primeira sessão, para
  calibrar ritmo.

### O que NÃO fazer

- **Não ligue `strict` progressivamente por flag.** Já está ligado
  (`"strict": true` em `tsconfig.app.json`). Os 3.478 são o custo de tê-lo
  ligado sobre código que nasceu sem ele. Desligar flags para "reduzir" o
  número esconde a dívida em vez de pagá-la, e reverter depois é pior.
- **Não tente um mutirão único.** 3.478 erros em uma leva produz um PR
  irreviável, e a chance de introduzir regressão de comportamento sem teste
  para pegá-la é alta.
- **Não corrija por tipo de erro atravessando áreas.** "Vou resolver todos os
  TS2339" espalha o PR por 200 arquivos sem relação entre si.

## O que já foi feito

- `scripts/typecheck-ratchet.mjs` congela o número em 3.478 e falha quando
  sobe, apontando as áreas que pioraram. Testado com erros propositais.
- A fronteira web/Worker foi corrigida: `src/lib/api/rpc-client.ts` consome o
  `.d.ts` compilado em vez do código-fonte do Worker, eliminando 216 erros
  fantasmas. Ver `docs/prompt-web-biomecanica-validade-clinica.md` e o commit
  "RPC tipado consome .d.ts do Worker".

## Estimativa honesta

Sem dado histórico de velocidade neste código, qualquer prazo meu seria chute.
O que dá para dizer: as etapas 1 e 4 (~174 erros) servem de calibragem. Depois
delas você terá uma taxa real de erros/hora e poderá projetar o resto com base
em medição, não em otimismo.
