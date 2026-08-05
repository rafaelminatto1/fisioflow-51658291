# Validação visual adicional — ZenFisio/FisioFlow

Data: 2026-07-30T21:09:37.512Z
Ambiente: produção (https://www.moocafisio.com.br)
Amostras: 20 pacientes adicionais com avaliação ZenFisio importada.

## Resultado geral

- Login autenticado: OK
- Pacientes validados: 20
- Passaram: 20
- Falharam: 0
- Screenshots: `/tmp/moocafisio-visual-zenfisio-more/screenshots/`
- Relatório JSON completo: `/tmp/moocafisio-visual-zenfisio-more/visual-report-more.json`

## Critérios checados por paciente

Para cada paciente, a automação validou:

- nome do paciente visível;
- aba `Histórico Clínico` carregada;
- badge/texto `Fonte ZenFisio preservada`;
- presença de `ZenFisio - Avaliação completa importada`;
- seção `Ver dados brutos preservados da avaliação ZenFisio` expandida;
- ausência da mensagem `Sem avaliação ZenFisio importada`.

## Distribuição da amostra

- Esportes + medicações: 4/4 OK
- Patologias/diagnósticos: 8/8 OK
- Cirurgias/texto cirúrgico: 4/4 OK
- Texto bruto amplo: 4/4 OK

## Tabela de amostras

| # | Paciente | Grupo | Resultado | Fonte ZenFisio | Avaliação completa | Bruto expandido |
|---:|---|---|---|---|---|---|
| 1 | Samara Benevides Martins | sports_meds | OK | sim | sim | sim |
| 2 | Leonardo Maimone | sports_meds | OK | sim | sim | sim |
| 3 | Silvia Amaro | sports_meds | OK | sim | sim | sim |
| 4 | Roberto Grejo | sports_meds | OK | sim | sim | sim |
| 5 | Danielle Fava | pathology | OK | sim | sim | sim |
| 6 | Carlos Eduardo Quinhoneiro | pathology | OK | sim | sim | sim |
| 7 | Maria Eduarda da Silva Amorim | pathology | OK | sim | sim | sim |
| 8 | Heloisa Freire Escobar de Assis | pathology | OK | sim | sim | sim |
| 9 | Paolo Carrenho Diogo | surgery | OK | sim | sim | sim |
| 10 | Livia Petrecca de Souza Domingos | surgery | OK | sim | sim | sim |
| 11 | Marylisa da Silva Santos | surgery | OK | sim | sim | sim |
| 12 | Rinaldo J Farias | surgery | OK | sim | sim | sim |
| 13 | Wellington Araújo | raw | OK | sim | sim | sim |
| 14 | Karoline Barazetti da Silva | raw | OK | sim | sim | sim |
| 15 | Asafe Cesar de Aquino | raw | OK | sim | sim | sim |
| 16 | Stephanie Kim Azevedo de Almeida | raw | OK | sim | sim | sim |
| 17 | Wagner Luiz Andriote | pathology | OK | sim | sim | sim |
| 18 | Jeff Jones Silva | pathology | OK | sim | sim | sim |
| 19 | Rodrigo Falcão | pathology | OK | sim | sim | sim |
| 20 | Rafael Campão Pires Fernandes | pathology | OK | sim | sim | sim |

## Achado de qualidade de dados

Durante a validação visual, foram encontrados artefatos de HTML/texto copiado dentro do campo bruto de algumas avaliações, com padrões como `pointer-events-auto`, `data-testid`, `conversation-turn`, `threadScrollVars` e `data-turn-id`.

Contagem no Neon:

- Registros afetados: 16
- Pacientes afetados: 16

Pacientes afetados identificados:

- Antônio José Ferreira de Lima
- Ariely Fialho Xavier
- Carlos Eduardo Quinhoneiro
- Dario Martinez Cunha
- Denise Godoi Adamowicz
- Denise Reis Magno Matta
- Francisco Alaercio Lima Lucena
- Heloisa Freire Escobar de Assis
- José Augusto Alves Cruz
- Karoline Barazetti da Silva
- Leandro Kendy Nakamura Fernandes
- Mariana Tokarevicz Luisi
- Rodrigo Falcão
- Samara Benevides Martins
- Tiago Trolesi
- Wagner Luiz Andriote

Observação: isso não impediu a renderização da aba clínica nem a validação da presença da avaliação importada, mas é um item recomendado para limpeza pontual dos dados brutos preservados.
