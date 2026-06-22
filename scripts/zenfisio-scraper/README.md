# ZenFisio Scraper

Script para extrair o histórico clínico completo de pacientes do sistema ZenFisio.

## Pré-requisitos

- Python 3.10+
- Navegador Chrome logado no ZenFisio (sessão ativa)
- Arquivo CSV com a lista de pacientes (exportado do ZenFisio)

## Instalação

```bash
python3 -m venv /tmp/zenv
/tmp/zenv/bin/pip install playwright browser-cookie3
```

## Uso

```bash
/tmp/zenv/bin/python scripts/zenfisio-scraper/scraper.py \
  --csv "/home/rafael/Downloads/Pacientes - Activity Fisioterapia - 6a35aff1a2cd6.csv" \
  --output-dir data/zenfisio-export \
  --max-patients 10
```

## Parâmetros

- `--csv`: Caminho para o arquivo CSV exportado do ZenFisio
- `--output-dir`: Diretório onde os arquivos JSON serão salvos
- `--max-patients`: (opcional) Número máximo de pacientes a processar
- `--resume`: (opcional) Pular pacientes já processados
- `--delay-min`: (opcional) Delay mínimo entre requisições (padrão: 2s)
- `--delay-max`: (opcional) Delay máximo entre requisições (padrão: 5s)

## Saída

Cada paciente gera um arquivo JSON no formato:

```json
{
  "paciente_nome": "Nome Completo",
  "paciente_id": "3200139",
  "total_registros": 10,
  "historico": [
    {
      "data": "09/12/2024",
      "data_completa": "09/12/2024 16:00",
      "tipo": "Evolução",
      "profissional": "Amanda Notoya",
      "conteudo_texto": "paciente relata estar bem...",
      "appointment_id": "146109033"
    }
  ]
}
```

## Estrutura do CSV esperado

O script espera um CSV com pelo menos as colunas:
- `Código` (ID numérico do paciente)
- `Nome` (nome completo)
