#!/usr/bin/env python3
"""
Extrai histórico de UM paciente do ZenFisio usando CDP (Chrome DevTools Protocol).
Conecta-se ao navegador já aberto e logado. Sem pressa, extrai evento por evento.
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
import websocket

CDP_URL = "http://localhost:9222"

def get_zenfisio_page():
    """Encontra uma página do ZenFisio no navegador."""
    resp = requests.get(f"{CDP_URL}/json", timeout=5)
    pages = resp.json()
    for p in pages:
        if 'zenfisio.com' in p.get('url', ''):
            return p
    return None

def cdp_eval(ws, expression, timeout=30):
    """Executa JavaScript via CDP e retorna o resultado."""
    msg_id = int(time.time() * 1000) % 100000
    msg = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
            "timeout": timeout * 1000
        }
    }
    ws.send(json.dumps(msg))
    
    start = time.time()
    while time.time() - start < timeout:
        try:
            ws.settimeout(timeout)
            resp = json.loads(ws.recv())
            if resp.get("id") == msg_id:
                if "result" in resp and "result" in resp["result"]:
                    r = resp["result"]["result"]
                    if r.get("type") == "undefined":
                        return None
                    if "value" in r:
                        return r["value"]
                    if r.get("subtype") == "error":
                        return f"ERROR: {r.get('description', 'unknown')}"
                return resp
        except websocket.WebSocketTimeoutException:
            break
    return None

def navigate(ws, url):
    """Navega para uma URL."""
    msg_id = int(time.time() * 1000) % 100000
    msg = {
        "id": msg_id,
        "method": "Page.navigate",
        "params": {"url": url}
    }
    ws.send(json.dumps(msg))
    
    start = time.time()
    while time.time() - start < 15:
        try:
            ws.settimeout(15)
            resp = json.loads(ws.recv())
            if resp.get("id") == msg_id:
                return resp
        except websocket.WebSocketTimeoutException:
            break
    return None

def main():
    patient_id = sys.argv[1] if len(sys.argv) > 1 else "2916336"
    patient_name = sys.argv[2] if len(sys.argv) > 2 else "Abdalla Melhen"
    patient_slug = sys.argv[3] if len(sys.argv) > 3 else "abdalla-melhen"
    
    output_dir = Path("/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"paciente_{patient_id}_{patient_slug}.json"
    
    # Conecta ao navegador
    page = get_zenfisio_page()
    if not page:
        print("ERRO: Nenhuma página do ZenFisio encontrada.")
        sys.exit(1)
    
    ws_url = page['webSocketDebuggerUrl']
    print(f"Conectado à página: {page['url']}")
    ws = websocket.create_connection(ws_url, timeout=30)
    
    # 1. Navega para página de histórico
    url_historico = f"https://app.zenfisio.com/patients/history/{patient_slug}/history/2010-01-01/2030-12-31/desc"
    print(f"\nNavegando para: {url_historico}")
    navigate(ws, url_historico)
    time.sleep(5)
    
    # 2. Extrai lista de eventos
    print("Extraindo lista de eventos...")
    eventos_raw = cdp_eval(ws, """
    (function() {
        const items = document.querySelectorAll('li');
        const eventos = [];
        
        for (const li of items) {
            const texto = li.innerText;
            if (!texto || !texto.includes('Data:')) continue;
            
            const linhas = texto.split('\\n').map(l => l.trim()).filter(l => l);
            
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
                else if (texto.includes('Não atendido')) tipo = 'Não atendido';
            }
            
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
    
    # 3. Para cada evento com appointment_id, navega e extrai texto
    historico_final = []
    for idx, ev in enumerate(eventos):
        print(f"\n[{idx+1}/{len(eventos)}] {ev['tipo']} - {ev['data_completa']}")
        
        if not ev['appointment_id']:
            print("  Sem link. Adicionando diretamente.")
            historico_final.append(ev)
            continue
        
        url_detalhe = f"https://app.zenfisio.com/appointments/details/{ev['appointment_id']}"
        print(f"  Acessando: {url_detalhe}")
        
        navigate(ws, url_detalhe)
        time.sleep(4)
        
        # Extrai texto clínico
        texto = cdp_eval(ws, """
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
        
        ev['conteudo_texto'] = texto or ''
        print(f"  Texto: {len(ev['conteudo_texto'])} chars")
        if ev['conteudo_texto']:
            print(f"  Preview: {ev['conteudo_texto'][:80]}...")
        
        historico_final.append(ev)
        time.sleep(1)
    
    # 4. Salva JSON
    dados = {
        "paciente_nome": patient_name,
        "paciente_id": patient_id,
        "total_registros": len(historico_final),
        "data_extracao": datetime.now().isoformat(),
        "historico": historico_final
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"CONCLUÍDO! {len(historico_final)} registros salvos em:")
    print(f"  {output_file}")
    print(f"{'='*50}")
    
    ws.close()

if __name__ == "__main__":
    main()
