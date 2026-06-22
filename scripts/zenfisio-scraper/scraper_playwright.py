#!/usr/bin/env python3
"""
ZenFisio Playwright Scraper
Script interativo de alta resiliência para login e extração de histórico clínico no ZenFisio.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Erro: instale o playwright no ambiente virtual:")
    print("  /tmp/zenv/bin/pip install playwright")
    sys.exit(1)


def parse_arguments():
    parser = argparse.ArgumentParser(description="ZenFisio Playwright Scraper")
    parser.add_argument("--email", default=os.environ.get("ZENFISIO_EMAIL"), help="E-mail de login (ou env ZENFISIO_EMAIL)")
    parser.add_argument("--password", default=os.environ.get("ZENFISIO_PASSWORD"), help="Senha de login (ou env ZENFISIO_PASSWORD)")
    parser.add_argument("--patient-id", default="3200139", help="ID do paciente no ZenFisio")
    parser.add_argument("--patient-slug", default="abbas-abdul-amir-awale", help="Slug do paciente no ZenFisio")
    parser.add_argument(
        "--output-file",
        default="/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export/paciente_3200139_abbas-abdul-amir-awale.json",
        help="Caminho do arquivo JSON de saída"
    )
    parser.add_argument("--headless", action="store_true", help="Rodar em modo headless (padrão é falso para permitir contornar Cloudflare)")
    args = parser.parse_args()
    if not args.email or not args.password:
        parser.error("Credenciais ausentes: informe --email/--password ou defina ZENFISIO_EMAIL/ZENFISIO_PASSWORD")
    return args


def limpar_texto(texto):
    if not texto:
        return ""
    # Remove múltiplos espaços em branco mas preserva quebras de linha
    texto_limpo = re.sub(r'[ \t]+', ' ', texto)
    return texto_limpo.strip()


def extrair_conteudo_clinico(page, tipo):
    """
    Tenta extrair o texto clínico livre da página de detalhes usando múltiplos seletores e fallbacks.
    """
    html = page.content()
    
    # Método 1: Seletores específicos baseados em texto/estrutura comuns
    seletores = [
        "div.card-body p",
        "div.clinical-note p",
        "div.evolution-text p",
        "div.assessment-text p",
        f"div:has-text('{tipo}:') > p",
        # Parágrafo irmão de um título que contenha o tipo
        f"h4:has-text('{tipo}') + p",
        f"strong:has-text('{tipo}:') + p",
    ]
    
    for seletor in seletores:
        try:
            elementos = page.query_selector_all(seletor)
            for el in elementos:
                texto = el.inner_text()
                if texto and len(texto.strip()) > 10:  # Garante que não é um rótulo curto
                    return limpar_texto(texto)
        except Exception:
            continue

    # Método 2: Fallback por Regex no HTML (idêntico ao scraper_http.py)
    # Busca por exemplo "Evolução: </something> <p>Texto</p>"
    padrao = rf"{tipo}:\s*</[^>]*>\s*<p[^>]*>(.*?)</p>"
    conteudo_match = re.search(padrao, html, re.DOTALL | re.IGNORECASE)
    if conteudo_match:
        raw = conteudo_match.group(1)
        conteudo = re.sub(r"<br\s*/?>", "\n", raw)
        conteudo = re.sub(r"<[^>]+>", "", conteudo)
        return limpar_texto(conteudo)

    # Método 3: Fallback por blocos de texto contendo o tipo
    partes = re.split(rf"{tipo}:\s*", html, maxsplit=1, flags=re.IGNORECASE)
    if len(partes) > 1:
        # Pega a parte do HTML depois de "Evolução:" / "Avaliação:" e limpa
        limite_bloco = re.split(r"</div>\s*<div", partes[1])[0]
        conteudo = re.sub(r"<br\s*/?>", "\n", limite_bloco)
        conteudo = re.sub(r"<[^>]+>", "", conteudo)
        # Substitui múltiplos espaços por um espaço mas mantém quebras de linha
        linhas = [limpar_texto(l) for l in conteudo.split("\n")]
        conteudo_limpo = "\n".join([l for l in linhas if l])
        if len(conteudo_limpo) > 10:
            return conteudo_limpo

    # Método 4: Fallback genérico - extrai todo o corpo principal de texto da página
    try:
        corpo = page.query_selector(".main-content, #content, main, article, .card")
        if corpo:
            texto = corpo.inner_text()
            # Tenta encontrar a seção de evolução/avaliação dentro do texto corrido
            linhas = texto.split("\n")
            inicio_captura = False
            linhas_clinicas = []
            for linha in linhas:
                if f"{tipo}:" in linha or f"{tipo} clínica" in linha or f"{tipo} Clínica" in linha:
                    inicio_captura = True
                    continue
                if inicio_captura:
                    # Se encontrarmos outra seção principal, paramos
                    if any(sec in linha for sec in ["Histórico", "Imprimir", "Voltar", "Profissional:", "Data do atendimento:"]):
                        break
                    linhas_clinicas.append(linha)
            if linhas_clinicas:
                return limpar_texto("\n".join(linhas_clinicas))
    except Exception:
        pass

    return ""


def main():
    args = parse_arguments()
    output_file = Path(args.output_file)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Cria pasta de anexos correspondente
    anexos_dir = output_file.parent / "anexos" / f"paciente_{args.patient_id}"
    anexos_dir.mkdir(parents=True, exist_ok=True)

    print(f"=== ZenFisio Scraper Playwright ===")
    print(f"Paciente: {args.patient_slug} (ID: {args.patient_id})")
    print(f"Arquivo de Saída: {output_file}")
    print(f"Diretório de Anexos: {anexos_dir}")
    print(f"Modo Headless: {args.headless}")
    print("====================================")

    with sync_playwright() as p:
        user_data_dir = "/tmp/playwright_chrome_profile"
        if os.path.exists(user_data_dir):
            try:
                import shutil
                shutil.rmtree(user_data_dir)
            except Exception:
                pass
                
        print("Iniciando Chromium isolado...")
        context = p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=args.headless,
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"],
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
        page = context.pages[0] if context.pages else context.new_page()

        # 1. Acessa a página de login
        print("Navegando para a página de login...")
        page.goto("https://app.zenfisio.com/login", timeout=60000)

        # 2. Preenche formulário de login
        try:
            print("Preenchendo credenciais...")
            # Espera pelos inputs comuns de e-mail e senha
            page.wait_for_selector("input[type='email'], input[name='email'], #email", timeout=15000)
            page.fill("input[type='email'], input[name='email'], #email", args.email)
            page.fill("input[type='password'], input[name='password'], #password", args.password)
            
            # Clica no botão de submit
            submit_btn = page.query_selector("button[type='submit'], input[type='submit']")
            if submit_btn:
                submit_btn.click()
            else:
                page.press("input[type='password']", "Enter")
                
            print("Login submetido. Aguardando autenticação e redirecionamento...")
        except Exception as e:
            print(f"Aviso no preenchimento automático: {e}")
            print("Por favor, realize o login manualmente na janela do navegador se necessário.")

        # Aguarda até sair da página de login (timeout de 2 minutos para permitir vencer Cloudflare/CAPTCHA manualmente)
        try:
            page.wait_for_url(lambda url: "/login" not in url, timeout=120000)
            print("Login bem sucedido!")
        except Exception as e:
            print(f"Erro: Tempo limite de login excedido. Verifique se o Cloudflare ou CAPTCHA bloqueou a automação.")
            context.close()
            sys.exit(1)

        # 3. Navega para a página de histórico
        url_historico = f"https://app.zenfisio.com/patients/history/{args.patient_slug}/history/2010-01-01/2030-12-31/desc"
        print(f"Navegando para o histórico do paciente: {url_historico}")
        page.goto(url_historico, timeout=60000)
        
        # Espera a página carregar
        page.wait_for_load_state("networkidle")
        
        # 4. Trata paginação / botão "Carregar mais"
        print("Verificando se há paginação ou botão 'Carregar mais'...")
        # Dá um scroll inicial
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
        
        load_more_selectors = [
            "button:has-text('Carregar mais')",
            "button:has-text('Ver mais')",
            "a:has-text('Carregar mais')",
            "a:has-text('Ver mais')",
            ".load-more",
            "#load-more",
            ".btn-load-more"
        ]
        
        cliques_carregar_mais = 0
        while True:
            botao_clicavel = None
            for sel in load_more_selectors:
                try:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible() and btn.is_enabled():
                        botao_clicavel = btn
                        break
                except Exception:
                    continue
            
            if botao_clicavel:
                print(f"Clicando em 'Carregar mais' ({cliques_carregar_mais + 1})...")
                botao_clicavel.click()
                cliques_carregar_mais += 1
                time.sleep(3)  # Aguarda renderizar os novos itens
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            else:
                # Faz mais um scroll e checa
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                # Verifica novamente se apareceu o botão
                botoes_check = False
                for sel in load_more_selectors:
                    try:
                        btn = page.query_selector(sel)
                        if btn and btn.is_visible() and btn.is_enabled():
                            botoes_check = True
                            break
                    except Exception:
                        continue
                if not botoes_check:
                    break
        
        print(f"Histórico totalmente carregado (cliques em 'Carregar mais': {cliques_carregar_mais}).")

        # 5. Identifica eventos
        print("Identificando eventos na linha do tempo...")
        # Busca todas as tags <li> ou itens de histórico
        elementos_li = page.query_selector_all("li, div.timeline-item, tr.timeline-row")
        print(f"Total de elementos brutos de lista encontrados: {len(elementos_li)}")
        
        eventos_raw = []
        for idx, li in enumerate(elementos_li):
            try:
                texto = li.inner_text()
                if not texto or "Data:" not in texto:
                    continue
                    
                linhas = [l.strip() for l in texto.split("\n") if l.strip()]
                
                # Identifica data
                data_completa = None
                for linha in linhas:
                    if linha.startswith("Data:"):
                        data_completa = linha.replace("Data:", "").strip()
                        break
                
                if not data_completa:
                    # Tenta regex se não achou no início de linha
                    data_match = re.search(r"Data:\s*(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2})?)", texto)
                    data_completa = data_match.group(1) if data_match else None
                
                if not data_completa:
                    continue
                
                data_simples = data_completa.split(" ")[0] if data_completa else None
                
                # Identifica profissional
                profissional = None
                for linha in linhas:
                    if "Fisioterapeuta:" in linha or "Profissional:" in linha:
                        profissional = linha.replace("Fisioterapeuta:", "").replace("Profissional:", "").strip()
                        break
                if not profissional:
                    fisio_match = re.search(r"(?:Fisioterapeuta|Profissional):\s*(.+)", texto)
                    profissional = fisio_match.group(1).strip() if fisio_match else None
                
                # Limpa CREFITO ou parênteses extras do nome do profissional
                if profissional:
                    profissional = re.sub(r"\s*\(.*?\)\s*", "", profissional).strip()

                # Identifica tipo e appointment_id
                tipo = "Agendamento"
                appointment_id = None
                
                # Procura link de detalhes
                link = li.query_selector("a[href*='/appointments/details/']")
                if link:
                    href = link.get_attribute("href")
                    match_id = re.search(r"/appointments/details/(\d+)", href)
                    if match_id:
                        appointment_id = match_id.group(1)
                    
                    link_text = link.inner_text().lower()
                    if "evolu" in link_text:
                        tipo = "Evolução"
                    elif "avalia" in link_text:
                        tipo = "Avaliação"
                else:
                    # Sem link de detalhes (ex: Faltas ou agendamentos não realizados)
                    if "Faltou" in texto or "Falta" in texto:
                        tipo = "Faltou"
                    elif "Iniciar atendimento" in texto:
                        tipo = "Agendamento"
                    elif "Evolução" in texto:
                        tipo = "Evolução"
                    elif "Avaliação" in texto:
                        tipo = "Avaliação"
                
                # Evita duplicados (mesmo appointment_id e tipo)
                if appointment_id and any(e.get("appointment_id") == appointment_id for e in eventos_raw):
                    continue
                
                eventos_raw.append({
                    "data": data_simples,
                    "data_completa": data_completa,
                    "tipo": tipo,
                    "profissional": profissional,
                    "appointment_id": appointment_id,
                    "conteudo_texto": "",
                    "anexos": []
                })
            except Exception as e:
                print(f"Erro ao processar item {idx}: {e} (continuando...)")
                
        print(f"Eventos estruturados identificados: {len(eventos_raw)}")
        
        # 6. Para cada evento com appointment_id, abre detalhes e extrai texto/anexos
        historico_final = []
        for idx, ev in enumerate(eventos_raw):
            print(f"\n[{idx+1}/{len(eventos_raw)}] {ev['tipo']} - {ev['data_completa']}")
            
            if not ev["appointment_id"]:
                print("  Sem link de detalhes. Adicionando diretamente.")
                historico_final.append(ev)
                continue
                
            url_detalhe = f"https://app.zenfisio.com/appointments/details/{ev['appointment_id']}"
            print(f"  Acessando detalhes: {url_detalhe}")
            
            # Abre em nova aba para não estragar a lista principal
            detalhe_page = context.new_page()
            try:
                detalhe_page.goto(url_detalhe, timeout=30000)
                detalhe_page.wait_for_load_state("networkidle")
                
                # Extrai texto clínico livre
                texto_clinico = extrair_conteudo_clinico(detalhe_page, ev["tipo"])
                ev["conteudo_texto"] = texto_clinico
                print(f"  Texto extraído ({len(texto_clinico)} caracteres).")
                
                # Identifica e baixa anexos/documentos
                anexos_encontrados = detalhe_page.query_selector_all("a[href*='/download/'], a[href*='/attachment/'], a[href*='amazon-aws'], a[href$='.pdf'], a[href$='.jpg'], a[href$='.png']")
                
                for idx_anexo, link_anexo in enumerate(anexos_encontrados):
                    try:
                        href = link_anexo.get_attribute("href")
                        nome_anexo = link_anexo.inner_text().strip()
                        if not nome_anexo:
                            nome_anexo = f"anexo_{idx_anexo+1}"
                        
                        # Sanitiza nome do arquivo
                        nome_arquivo_sanitizado = re.sub(r'[^a-zA-Z0-9_.-]', '_', nome_anexo)
                        # Garante extensão
                        if not any(nome_arquivo_sanitizado.lower().endswith(ext) for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.txt']):
                            nome_arquivo_sanitizado += ".pdf"  # Fallback comum para exames
                            
                        caminho_anexo_local = anexos_dir / f"{ev['appointment_id']}_{nome_arquivo_sanitizado}"
                        
                        print(f"  Baixando anexo: {nome_anexo} -> {caminho_anexo_local.name}")
                        
                        # Tenta baixar pelo Playwright se for link de download direto
                        try:
                            with detalhe_page.expect_download(timeout=10000) as download_info:
                                link_anexo.click()
                            download = download_info.value
                            download.save_as(str(caminho_anexo_local))
                            ev["anexos"].append({
                                "nome": nome_anexo,
                                "caminho_local": str(caminho_anexo_local),
                                "url_original": href
                            })
                            print("    Download concluído com sucesso!")
                        except Exception as e_down:
                            # Se falhar o click/download, podemos tentar fazer requisição com cookies do contexto
                            print(f"    Falha no clique de download ({e_down}). Tentando copiar link direto.")
                            ev["anexos"].append({
                                "nome": nome_anexo,
                                "caminho_local": None,
                                "url_original": href,
                                "erro_download": str(e_down)
                            })
                    except Exception as e_anexo:
                        print(f"    Erro ao processar anexo {idx_anexo}: {e_anexo}")
                        
            except Exception as e:
                print(f"  ERRO ao extrair detalhes: {e}. Registrando falha no log e continuando.")
                ev["conteudo_texto"] = ""
                ev["erro_extracao"] = str(e)
            finally:
                # Fecha aba de detalhes
                detalhe_page.close()
                
            historico_final.append(ev)
            # Delay curto para evitar rate limit
            time.sleep(1.5)

        # 7. Salva os dados estruturados no formato JSON esperado
        dados_export = {
            "paciente_nome": "Abbas Abdul Amir Awale",
            "paciente_id": args.patient_id,
            "total_registros": len(historico_final),
            "data_extracao": datetime.now().isoformat(),
            "historico": historico_final
        }
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(dados_export, f, ensure_ascii=False, indent=2)
            
        print("\n====================================")
        print(f"PROCESSO CONCLUÍDO COM SUCESSO!")
        print(f"Total de registros exportados: {len(historico_final)}")
        print(f"Arquivo JSON gerado: {output_file}")
        print("====================================")
        
        context.close()


if __name__ == "__main__":
    main()
