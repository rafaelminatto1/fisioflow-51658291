#!/usr/bin/env python3
"""
Extrai dados clínicos do ZenFisio usando o navegador já aberto via CDP.
Conecta-se ao Chrome em execução e usa a sessão existente.
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

CDP_URL = "http://localhost:9222"

def get_pages():
    """Lista todas as páginas abertas no Chrome."""
    resp = requests.get(f"{CDP_URL}/json")
    return resp.json()

def get_zenfisio_page():
    """Encontra a página do ZenFisio."""
    pages = get_pages()
    for p in pages:
        if 'zenfisio.com' in p.get('url', ''):
            return p
    return None

def cdp_eval(ws_url, expression):
    """Executa JavaScript via CDP REST API (mais simples que websocket)."""
    # Usa a API HTTP do CDP
    page_id = ws_url.split('/')[-1]
    # Na verdade, vamos usar a API HTTP
    pass

def extract_via_http(page_id, expression):
    """Usa a API HTTP do CDP para executar JS."""
    # A API HTTP do CDP não suporta eval diretamente
    # Vamos usar a abordagem de navegar e extrair via console
    pass

def main():
    # Encontra a página do ZenFisio
    page = get_zenfisio_page()
    if not page:
        print("ERRO: Nenhuma página do ZenFisio encontrada no navegador.")
        print("Páginas abertas:")
        for p in get_pages():
            print(f"  - {p.get('url', 'sem URL')}")
        sys.exit(1)
    
    ws_url = page['webSocketDebuggerUrl']
    print(f"Página encontrada: {page['url']}")
    print(f"WS URL: {ws_url}")
    
    # Usa websocket para executar JavaScript
    import websocket
    ws = websocket.create_connection(ws_url, timeout=30)
    
    msg_id = 1
    
    def send_cdp(method, params=None):
        nonlocal msg_id
        msg = {"id": msg_id, "method": method}
        if params:
            msg["params"] = params
        ws.send(json.dumps(msg))
        msg_id += 1
        
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == msg_id - 1:
                return resp
            # Senão, é um evento - ignora
    
    def evaluate(expression):
        result = send_cdp("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "result" in result and "result" in result["result"]:
            return result["result"]["result"].get("value")
        return result
    
    # Navega para a página de histórico do paciente
    print("\nNavegando para página de histórico...")
    evaluate("window.location.href = 'https://app.zenfisio.com/patients/history/abbas-abdul-amir-awale/history/2010-01-01/2030-12-31/desc'")
    time.sleep(5)
    
    # Extrai todos os eventos da página de histórico
    print("Extraindo eventos do histórico...")
    eventos_raw = evaluate("""
    (function() {
        const items = document.querySelectorAll('li');
        const eventos = [];
        
        for (const li of items) {
            const texto = li.innerText;
            if (!texto || !texto.includes('Data:')) continue;
            
            const linhas = texto.split('\\n').map(l => l.trim()).filter(l => l);
            
            // Identifica data
            let dataCompleta = null;
            for (const linha of linhas) {
                if (linha.startsWith('Data:')) {
                    dataCompleta = linha.replace('Data:', '').trim();
                    break;
                }
            }
            if (!dataCompleta) {
                const dataMatch = texto.match(/Data:\\s*(\\d{2}\\/\\d{2}\\/\\d{4}(?:\\s+\\d{2}:\\d{2})?)/);
                dataCompleta = dataMatch ? dataMatch[1] : null;
            }
            if (!dataCompleta) continue;
            
            const dataSimples = dataCompleta.split(' ')[0];
            
            // Identifica profissional
            let profissional = null;
            for (const linha of linhas) {
                if (linha.includes('Fisioterapeuta:') || linha.includes('Profissional:')) {
                    profissional = linha.replace(/Fisioterapeuta:|Profissional:/, '').trim();
                    break;
                }
            }
            if (profissional) {
                profissional = profissional.replace(/\\s*\\(.*?\\)\\s*/g, '').trim();
            }
            
            // Identifica tipo e appointment_id
            let tipo = 'Agendamento';
            let appointmentId = null;
            
            const link = li.querySelector('a[href*="/appointments/details/"]');
            if (link) {
                const href = link.getAttribute('href');
                const matchId = href.match(/\\/appointments\\/details\\/(\\d+)/);
                if (matchId) appointmentId = matchId[1];
                
                const linkText = link.innerText.toLowerCase();
                if (linkText.includes('evolu')) tipo = 'Evolução';
                else if (linkText.includes('avalia')) tipo = 'Avaliação';
            } else {
                if (texto.includes('Faltou')) tipo = 'Faltou';
                else if (texto.includes('Evolução')) tipo = 'Evolução';
                else if (texto.includes('Avaliação')) tipo = 'Avaliação';
            }
            
            // Evita duplicados
            if (eventos.some(e => e.appointment_id === appointmentId)) continue;
            
            eventos.push({
                data: dataSimples,
                data_completa: dataCompleta,
                tipo: tipo,
                profissional: profissional,
                appointment_id: appointmentId,
                conteudo_texto: ''
            });
        }
        
        return JSON.stringify(eventos);
    })()
    """)
    
    if not eventos_raw:
        print("ERRO: Nenhum evento encontrado.")
        ws.close()
        sys.exit(1)
    
    eventos = json.loads(eventos_raw)
    print(f"Eventos encontrados: {len(eventos)}")
    for ev in eventos:
        print(f"  [{ev['tipo']}] {ev['data_completa']} - ID: {ev['appointment_id']}")
    
    # Para cada evento com appointment_id, navega para detalhes e extrai texto
    historico_final = []
    for idx, ev in enumerate(eventos):
        print(f"\n[{idx+1}/{len(eventos)}] {ev['tipo']} - {ev['data_completa']}")
        
        if not ev['appointment_id']:
            print("  Sem link de detalhes. Adicionando diretamente.")
            historico_final.append(ev)
            continue
        
        url_detalhe = f"https://app.zenfisio.com/appointments/details/{ev['appointment_id']}"
        print(f"  Acessando: {url_detalhe}")
        
        evaluate(f"window.location.href = '{url_detalhe}'")
        time.sleep(4)
        
        # Extrai texto clínico
        texto_clinico = evaluate("""
        (function() {
            const paragraphs = document.querySelectorAll('p, li');
            let result = [];
            let capturando = false;
            
            for (const p of paragraphs) {
                const text = p.innerText.trim();
                if (!text) continue;
                
                if (text.includes('Evolução:') || text.includes('Avaliação:')) {
                    capturando = true;
                    continue;
                }
                
                if (capturando) {
                    if (text.includes('Histórico') || text.includes('Imprimir') || text.includes('Voltar') || 
                        text.includes('Profissional:') || text.includes('Data do atendimento:') ||
                        text.includes('Convênio:') || text.includes('Fisioterapeuta:') ||
                        text.includes('Endereço:') || text.includes('Sexo:') || text.includes('Data de nascimento:')) {
                        break;
                    }
                    result.push(text);
                }
            }
            
            return result.join('\\n');
        })()
        """)
        
        ev['conteudo_texto'] = texto_clinico or ''
        print(f"  Texto extraído ({len(ev['conteudo_texto'])} caracteres)")
        if ev['conteudo_texto']:
            print(f"  Preview: {ev['conteudo_texto'][:100]}...")
        
        historico_final.append(ev)
        time.sleep(1)
    
    # Salva os dados
    output_dir = Path("/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / "paciente_3200139_abbas-abdul-amir-awale.json"
    
    dados_export = {
        "paciente_nome": "Abbas Abdul Amir Awale",
        "paciente_id": "3200139",
        "total_registros": len(historico_final),
        "data_extracao": datetime.now().isoformat(),
        "historico": historico_final
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dados_export, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"PROCESSO CONCLUÍDO!")
    print(f"Total de registros: {len(historico_final)}")
    print(f"Arquivo salvo: {output_file}")
    print(f"{'='*50}")
    
    ws.close()

if __name__ == "__main__":
    main()
