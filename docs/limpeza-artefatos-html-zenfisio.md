# Limpeza de artefatos HTML — avaliações ZenFisio

Data: 2026-07-30T21:27:04.468Z
Ambiente: produção (Neon/FisioFlow)

## Resultado

- Registros afetados antes da limpeza: 16
- Backup persistente criado no Neon: `public.zenfisio_artifact_cleanup_backup_20260730`
- Registros no backup: 16
- Artefatos restantes após limpeza por SQL: 0
- Validação visual pós-limpeza: 16/16 OK
- Relatório visual JSON: `/tmp/moocafisio-visual-zenfisio-cleaned/visual-cleaned-report.json`
- Screenshots pós-limpeza: `/tmp/moocafisio-visual-zenfisio-cleaned/screenshots/`

## Padrões removidos

- `pointer-events-auto`
- `data-testid`
- `conversation-turn`
- `threadScrollVars`
- `data-turn-id`

## Critérios visuais checados

- paciente visível;
- aba `Histórico Clínico` carregada;
- `Fonte ZenFisio preservada` visível;
- `ZenFisio - Avaliação completa importada` visível;
- dados brutos preservados expandidos;
- nenhum dos artefatos acima presente no DOM/texto visível.

## Pacientes validados

| # | Paciente | Resultado | Sem artefatos | Avaliação completa |
|---:|---|---|---|---|
| 1 | Antônio José Ferreira de Lima | OK | sim | sim |
| 2 | Ariely Fialho Xavier | OK | sim | sim |
| 3 | Carlos Eduardo Quinhoneiro | OK | sim | sim |
| 4 | Dario Martinez Cunha | OK | sim | sim |
| 5 | Denise Godoi Adamowicz | OK | sim | sim |
| 6 | Denise Reis Magno Matta | OK | sim | sim |
| 7 | Francisco Alaercio Lima Lucena | OK | sim | sim |
| 8 | Heloisa Freire Escobar de Assis | OK | sim | sim |
| 9 | José Augusto Alves Cruz | OK | sim | sim |
| 10 | Karoline Barazetti da Silva | OK | sim | sim |
| 11 | Leandro Kendy Nakamura Fernandes | OK | sim | sim |
| 12 | Mariana Tokarevicz Luisi | OK | sim | sim |
| 13 | Rodrigo Falcão | OK | sim | sim |
| 14 | Samara Benevides Martins | OK | sim | sim |
| 15 | Tiago Trolesi | OK | sim | sim |
| 16 | Wagner Luiz Andriote | OK | sim | sim |

## Observação de rollback

Caso seja necessário reverter, os valores originais de `medical_records.physical_exam` foram preservados na tabela:

`public.zenfisio_artifact_cleanup_backup_20260730`
