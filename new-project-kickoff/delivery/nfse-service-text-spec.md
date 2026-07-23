# Gerador do texto descritivo da NFS-e

**Status:** requisito aprovado (DEC-021), a implementar em onda futura — **não executável ainda**
**Decisão:** emissão/integração de NFS-e fica para depois; o **texto descritivo do serviço** entra no escopo do produto.
**Privacidade:** este arquivo contém **apenas o modelo com placeholders e um exemplo fictício**. Nenhum nome, CPF, CNPJ ou valor real de paciente/clínica é versionado.

## O problema

Hoje o texto da nota é montado à mão e colado no sistema da contabilidade. O que muda de nota para nota: paciente, CPF, procedimento, código(s) TUSS, datas realizadas, quantidade de sessões, valor por sessão e total. O que é fixo: dados da empresa e do profissional responsável (configuração da clínica). O produto deve **gerar esse texto automaticamente** a partir dos dados que já existem (paciente + sessões realizadas + pagamento), pronto para copiar.

> A linha "Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 9,05%" é **acrescentada automaticamente pelo sistema contábil (Contabilizei)** ao emitir. O FisioFlow **não** precisa gerar essa linha (mas pode oferecer como opção configurável, desligada por padrão).

## Modelo canônico (múltiplas sessões)

```text
{paciente_nome}, CPF de número {paciente_cpf} realizou {qtd_sessoes} sessões de {procedimento_nome} nos dias {lista_datas_com_tuss}. E efetuou o pagamento no valor R$ {valor_total} correspondentes a R$ {valor_por_sessao} de cada sessão para a empresa {empresa_razao_social}, CNPJ: {empresa_cnpj} Conselho: {conselho_sigla} - Nome: {profissional_nome} Número do conselho/ {conselho_numero} – {conselho_tipo} {conselho_uf} Telefone {profissional_telefone}
```

Onde `{lista_datas_com_tuss}` é a junção das datas realizadas no formato:

```text
{dd/MM/aaaa} (realizou o código TUSS: {tuss}){, | e }...
```

— separador vírgula entre itens e " e " antes do último, exatamente como no padrão atual.

### Exemplo renderizado (dados FICTÍCIOS)

```text
Fulano de Tal, CPF de número 000.000.000-00 realizou 10 sessões de RPG nos dias 01/01/2030 (realizou o código TUSS: 00000000 ), 03/01/2030 (realizou o código TUSS: 00000000 ) e 05/01/2030 (realizou o código TUSS: 00000000 ) . E efetuou o pagamento no valor R$ 1.700,00 correspondentes a R$ 170,00 de cada sessão para a empresa Empresa Exemplo Ltda, CNPJ: 00.000.000/0001-00 Conselho: crefito - Nome: Profissional Exemplo Número do conselho/ 000000 – F SP Telefone 11 900000000
```

## Modelo alternativo (sessão única, com justificativa clínica)

Algumas notas usam um parágrafo mais descritivo para sessão única (ex.: pós-operatório). O gerador deve suportar um **modo detalhado opcional** por procedimento:

```text
Paciente {paciente_nome}, CPF de número {paciente_cpf}, realizou {qtd_sessoes} sessão de {procedimento_nome} no dia {data}, utilizando o código TUSS {tuss} — {tuss_descricao}. {justificativa_clinica_opcional}. Efetuou o pagamento no valor R$ {valor_total} para a empresa {empresa_razao_social}, CNPJ {empresa_cnpj}, localizada à {empresa_endereco}. Conselho: {conselho_sigla} Fisioterapeuta responsável: {profissional_nome} Número do Conselho: {conselho_numero}-{conselho_tipo}/{conselho_uf} Telefone: {profissional_telefone}.
```

## Campos e origem no modelo de dados

| Placeholder | Origem | Observação |
|---|---|---|
| `paciente_nome`, `paciente_cpf` | cadastro do paciente | dado sensível; nunca em log/analytics |
| `qtd_sessoes` | contagem de sessões realizadas selecionadas | |
| `procedimento_nome` | procedimento da sessão | ex.: RPG, fisioterapia musculoesquelética |
| `tuss`, `tuss_descricao` | catálogo TUSS × procedimento | requer tabela de-para procedimento→TUSS |
| `lista_datas` | datas das sessões **realizadas** | ordenadas; formato dd/MM/aaaa |
| `valor_por_sessao`, `valor_total` | pagamento/lançamento financeiro | total = valor × qtd (validar consistência) |
| `empresa_razao_social`, `empresa_cnpj`, `empresa_endereco` | **configuração da clínica** | fixo; suportar mais de uma pessoa jurídica (há variações "Ltda" e "RA Ltda" no legado) |
| `conselho_sigla/numero/tipo/uf` | cadastro do profissional responsável | ex.: CREFITO, 000000, F, SP |
| `profissional_nome`, `profissional_telefone` | cadastro do profissional | |

## Requisitos funcionais

- Selecionar um paciente + um conjunto de sessões realizadas (ou um pacote) e gerar o texto pronto para copiar.
- Suportar 1..N datas com o mesmo TUSS ou TUSS variando por data.
- Escolher a pessoa jurídica emissora quando houver mais de uma configurada.
- Modo simples (múltiplas sessões) e modo detalhado (justificativa clínica) por procedimento.
- Botão "copiar" e, opcionalmente, exportar texto; **não** emite nota nesta fase.
- Linha da Lei 12.741 desligada por padrão (o contábil adiciona).
- Requer catálogo TUSS mantido e vínculo procedimento→TUSS→valor de referência.

## Fora desta fase

- Emissão/transmissão real de NFS-e ao município ou via API do provedor contábil.
- Cálculo tributário próprio (o percentual da Lei 12.741 vem do contábil).
- Cancelamento/carta de correção de nota.

## Não fazer

- Não versionar nenhum texto de nota real, nome, CPF, CNPJ ou valor de paciente/clínica.
- Não enviar o texto gerado (com PII) para logs, analytics ou ferramentas de IA sem redação/consentimento.
