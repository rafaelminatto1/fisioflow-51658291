#!/usr/bin/env python3
"""
ZenFisio Scraper - Extrai histórico clínico completo de pacientes.

Le os cookies do Chrome (incluindo httpOnly) e faz requisições HTTP
diretas para o ZenFisio. Isso funciona porque o browser_cookie3 consegue
descriptografar os cookies do Chrome e o ZenFisio aceita esses cookies.

Uso:
    python3 scraper.py --csv <arquivo.csv> --output-dir <dir> [opcoes]

Requisitos:
    pip install browser-cookie3 requests
"""

import argparse
import csv
import json
import os
import random
import re
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import browser_cookie3
    import requests
except ImportError:
    print("Erro: instale as dependencias com:")
    print("  pip install browser-cookie3 requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = BASE_DIR / "data" / "zenfisio-export"
ZENFISIO_BASE = "https://app.zenfisio.com"
CSV_DELIMITER = ";"


# ---------------------------------------------------------------------------
# Leitura do CSV
# ---------------------------------------------------------------------------
def ler_csv(caminho: str) -> list[dict]:
    """Le o CSV exportado do ZenFisio e retorna lista de pacientes."""
    pacientes = []
    with open(caminho, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=CSV_DELIMITER)
        for row in reader:
            if not row.get("Nome", "").strip():
                continue
            pacientes.append({
                "id": row.get("Código", "").strip(),
                "nome": row.get("Nome", "").strip(),
            })
    return pacientes


# ---------------------------------------------------------------------------
# Sessao HTTP com cookies do Chrome
# ---------------------------------------------------------------------------
def criar_sessao() -> requests.Session:
    """Cria sessao HTTP com cookies do Chrome."""
    s = requests.Session()
    try:
        cj = browser_cookie3.chrome(
            cookie_file=os.path.expanduser("~/.config/google-chrome/Default/Cookies"),
            domain_name="zenfisio.com",
        )
        s.cookies.update(cj)
        print(f"Sessao criada com {len(list(cj))} cookies do Chrome")
    except Exception as e:
        print(f"Aviso: nao foi possivel carregar cookies: {e}")
    # Headers para parecer um navegador real
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })
    return s


# ---------------------------------------------------------------------------
# Estado de retomada
# ---------------------------------------------------------------------------
def carregar_estado(output_dir: Path) -> dict:
    """Carrega estado de execucao anterior para retomar."""
    estado_path = output_dir / "estado_execucao.json"
    if estado_path.exists():
        with open(estado_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processados": [], "erros": [], "ultimo_timestamp": None}


def salvar_estado(estado: dict, output_dir: Path):
    """Salva estado atual para permitir retomada."""
    output_dir.mkdir(parents=True, exist_ok=True)
    estado_path = output_dir / "estado_execucao.json"
    estado["ultimo_timestamp"] = datetime.now().isoformat()
    with open(estado_path, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Extracao de dados da pagina de historico
# ---------------------------------------------------------------------------
def extrair_eventos_historico(html: str) -> list[dict]:
    """
    Extrai os eventos da pagina de historico de um paciente.
    """
    eventos = []

    # Encontra todos os links para detalhes
    link_pattern = re.compile(
        r'<a[^>]*href="(/appointments/details/(\d+))"[^>]*>\s*Ver\s*(evolu[çc]ão|avalia[çc]ão)\s*</a>',
        re.IGNORECASE
    )

    for match in link_pattern.finditer(html):
        href_completo = match.group(1)
        appointment_id = match.group(2)
        tipo_raw = match.group(3)

        # Encontra o <li> pai para extrair contexto
        li_inicio = html.rfind("<li", 0, match.start())
        li_fim = html.find("</li>", match.end())
        if li_fim == -1:
            li_fim = len(html)
        contexto = html[li_inicio:li_fim]

        # Extrai data
        data_match = re.search(r"Data:\s*(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2})", contexto)
        data_completa = data_match.group(1) if data_match else None
        data_simples = data_completa.split(" ")[0] if data_completa else None

        # Extrai fisioterapeuta
        fisio_match = re.search(r"Fisioterapeuta:\s*(.+?)(?:\n|<)", contexto)
        profissional = fisio_match.group(1).strip() if fisio_match else None

        # Normaliza tipo
        if "evolu" in tipo_raw.lower():
            tipo = "Evolução"
        else:
            tipo = "Avaliação"

        eventos.append({
            "data": data_simples,
            "data_completa": data_completa,
            "tipo": tipo,
            "profissional": profissional,
            "appointment_id": appointment_id,
        })

    # Tambem captura eventos sem link (faltou, agendamento, etc.)
    h3_pattern = re.compile(r"<h3[^>]*>(.*?)</h3>", re.DOTALL)
    for match in h3_pattern.finditer(html):
        conteudo = match.group(1).strip()
        if any(e.get("conteudo_raw") == conteudo for e in eventos):
            continue
        if "Faltou" in conteudo or "Iniciar atendimento" in conteudo:
            data_match = re.search(r"Data:\s*(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2})", conteudo)
            data_completa = data_match.group(1) if data_match else None
            data_simples = data_completa.split(" ")[0] if data_completa else None

            fisio_match = re.search(r"Fisioterapeuta:\s*(.+?)(?:\n|<)", conteudo)
            profissional = fisio_match.group(1).strip() if fisio_match else None

            tipo = "Faltou" if "Faltou" in conteudo else "Agendamento"

            eventos.append({
                "data": data_simples,
                "data_completa": data_completa,
                "tipo": tipo,
                "profissional": profissional,
                "appointment_id": None,
            })

    eventos.sort(key=lambda e: e.get("data", ""), reverse=True)
    return eventos


# ---------------------------------------------------------------------------
# Extracao de detalhes de um atendimento
# ---------------------------------------------------------------------------
def extrair_detalhes_atendimento(html: str) -> dict:
    """
    Extrai o conteudo completo da pagina de detalhes de um atendimento.
    """
    # Data do atendimento
    data_match = re.search(
        r"Data do atendimento:\s*(\d{2}/\d{2}/\d{4} das \d{2}:\d{2}:\d{2} até \d{2}:\d{2}:\d{2})",
        html,
    )
    data_completa = data_match.group(1) if data_match else None

    # Tipo (Evolucao / Avaliacao)
    tipo_match = re.search(r">\s*(Evolu[çc]ão|Avalia[çc]ão)\s*</h", html)
    tipo = tipo_match.group(1) if tipo_match else "Desconhecido"

    # Fisioterapeuta com CREFITO
    fisio_match = re.search(r"Fisioterapeuta:\s*(.+?)<", html)
    profissional = fisio_match.group(1).strip() if fisio_match else None

    # Conteudo clinico livre (apos "Evolucao:" ou "Avaliacao:")
    conteudo = ""
    padrao = rf"{tipo}:\s*</[^>]*>\s*<p[^>]*>(.*?)</p>"
    conteudo_match = re.search(padrao, html, re.DOTALL)
    if conteudo_match:
        raw = conteudo_match.group(1)
        conteudo = re.sub(r"<br\s*/?>", "\n", raw)
        conteudo = re.sub(r"<[^>]+>", "", conteudo).strip()
    else:
        # Fallback: pega texto entre "Evolucao:" e proxima secao
        partes = re.split(rf"{tipo}:\s*</[^>]*>", html, maxsplit=1)
        if len(partes) > 1:
            conteudo = re.split(r"</div>\s*<div", partes[1])[0]
            conteudo = re.sub(r"<[^>]+>", " ", conteudo).strip()
            conteudo = re.sub(r"\s+", " ", conteudo)

    return {
        "data": data_completa.split(" das ")[0] if data_completa else None,
        "data_completa": data_completa,
        "tipo": tipo,
        "profissional": profissional,
        "conteudo_texto": conteudo,
    }


# ---------------------------------------------------------------------------
# Gera slug a partir do nome
# ---------------------------------------------------------------------------
def gerar_slug(nome: str) -> str:
    """Gera slug do paciente (formato ZenFisio)."""
    slug = nome.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug


# ---------------------------------------------------------------------------
# Delay aleatorio anti-rate-limiting
# ---------------------------------------------------------------------------
def delay_aleatorio(min_s: float, max_s: float):
    """Aguarda um tempo aleatorio entre min e max segundos."""
    tempo = random.uniform(min_s, max_s)
    time.sleep(tempo)


# ---------------------------------------------------------------------------
# Execucao principal
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Extrai historico clinico do ZenFisio"
    )
    parser.add_argument("--csv", required=True, help="Caminho do CSV de pacientes")
    parser.add_argument(
        "--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Diretorio de saida"
    )
    parser.add_argument("--max-patients", type=int, default=0, help="Maximo de pacientes (0=todos)")
    parser.add_argument("--resume", action="store_true", help="Pular pacientes ja processados")
    parser.add_argument("--delay-min", type=float, default=2.0, help="Delay minimo (segundos)")
    parser.add_argument("--delay-max", type=float, default=5.0, help="Delay maximo (segundos)")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Le CSV
    print(f"Lendo CSV: {args.csv}")
    pacientes = ler_csv(args.csv)
    print(f"Total de pacientes no CSV: {len(pacientes)}")

    # Carrega estado se --resume
    estado = carregar_estado(output_dir)
    processados = set(estado.get("processados", []))
    erros = estado.get("erros", [])

    if args.resume and processados:
        print(f"Retomando: {len(processados)} pacientes ja processados serao ignorados")

    # Filtra pacientes pendentes
    pendentes = [p for p in pacientes if p["id"] not in processados]
    if args.max_patients > 0:
        pendentes = pendentes[: args.max_patients]

    print(f"Pacientes a processar: {len(pendentes)}")

    if not pendentes:
        print("Nenhum paciente pendente.")
        return

    # Cria sessao HTTP
    session = criar_sessao()

    for idx, paciente in enumerate(pendentes):
        pid = paciente["id"]
        nome = paciente["nome"]
        slug = gerar_slug(nome)

        print(f"\n[{idx+1}/{len(pendentes)}] Processando: {nome} (ID: {pid})")

        try:
            # 1. Acessa o historico do paciente
            url_historico = (
                f"{ZENFISIO_BASE}/patients/history/{slug}"
                f"/history/2010-01-01/2030-12-31/desc"
            )
            print(f"  Acessando historico...")

            r = session.get(url_historico, timeout=30)

            # Verifica se esta na pagina de login
            if "/login" in r.url or r.status_code == 401:
                print(f"  ERRO: Sessao expirada (status {r.status_code}, url: {r.url})")
                print("  Faca login no Chrome novamente e tente de novo.")
                erros.append({"id": pid, "nome": nome, "erro": f"sessao_expirada_{r.status_code}"})
                salvar_estado(
                    {"processados": list(processados), "erros": erros}, output_dir
                )
                return

            html_historico = r.text

            # 2. Extrai eventos do historico
            eventos = extrair_eventos_historico(html_historico)
            print(f"  Eventos encontrados: {len(eventos)}")

            if not eventos:
                print("  Nenhum evento encontrado, pulando...")
                processados.add(pid)
                salvar_estado(
                    {"processados": list(processados), "erros": erros}, output_dir
                )
                continue

            # 3. Para cada evento, navega na pagina de detalhes
            historico_completo = []
            for ev in eventos:
                if not ev["appointment_id"]:
                    historico_completo.append(ev)
                    continue

                url_detalhe = f"{ZENFISIO_BASE}/appointments/details/{ev['appointment_id']}"
                print(
                    f"  Extraindo: {ev['tipo']} "
                    f"{ev['data_completa']} -> ID {ev['appointment_id']}"
                )

                try:
                    r2 = session.get(url_detalhe, timeout=30)
                    if "/login" in r2.url or r2.status_code == 401:
                        print(f"    ERRO: Sessao expirada nos detalhes")
                        historico_completo.append({
                            **ev,
                            "conteudo_texto": "",
                            "erro": f"401_detalhes",
                        })
                        continue

                    detalhes = extrair_detalhes_atendimento(r2.text)
                    historico_completo.append({
                        "data": ev["data"],
                        "data_completa": ev["data_completa"],
                        "tipo": ev["tipo"],
                        "profissional": ev["profissional"] or detalhes.get("profissional"),
                        "conteudo_texto": detalhes.get("conteudo_texto", ""),
                        "appointment_id": ev["appointment_id"],
                    })
                except requests.Timeout:
                    print("    Timeout ao carregar detalhes, pulando...")
                    historico_completo.append({
                        **ev,
                        "conteudo_texto": "",
                        "erro": "timeout",
                    })
                except Exception as e:
                    print(f"    Erro: {e}")
                    historico_completo.append({
                        **ev,
                        "conteudo_texto": "",
                        "erro": str(e),
                    })

                delay_aleatorio(args.delay_min, args.delay_max)

            # 4. Salva JSON do paciente
            arquivo_saida = output_dir / f"paciente_{pid}_{slug}.json"
            dados_paciente = {
                "paciente_nome": nome,
                "paciente_id": pid,
                "slug": slug,
                "total_registros": len(historico_completo),
                "data_extracao": datetime.now().isoformat(),
                "historico": historico_completo,
            }
            with open(arquivo_saida, "w", encoding="utf-8") as f:
                json.dump(dados_paciente, f, ensure_ascii=False, indent=2)

            print(f"  Salvo: {arquivo_saida}")
            processados.add(pid)

        except requests.Timeout:
            print(f"  ERRO: Timeout ao acessar historico")
            erros.append({"id": pid, "nome": nome, "erro": "timeout_historico"})
        except Exception as e:
            print(f"  ERRO inesperado: {e}")
            erros.append({"id": pid, "nome": nome, "erro": str(e)})

        # Salva estado a cada paciente
        salvar_estado(
            {"processados": list(processados), "erros": erros}, output_dir
        )
        delay_aleatorio(args.delay_min, args.delay_max)

    # Relatorio final
    print("\n" + "=" * 60)
    print(f"EXTRACAO CONCLUIDA")
    print(f"  Processados com sucesso: {len(processados)}")
    print(f"  Erros: {len(erros)}")
    if erros:
        print(f"  Detalhes dos erros salvos em: {output_dir / 'estado_execucao.json'}")
    print(f"  Arquivos salvos em: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
