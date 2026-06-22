#!/usr/bin/env python3
"""
Extrai histórico de TODOS os pacientes do ZenFisio.
Usa a API interna do sistema via requisições HTTP.
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
import requests

OUTPUT_DIR = Path("/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export")
PACIENTES_FILE = Path("/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/pacientes_lista.json")

def load_pacientes():
    """Carrega lista de pacientes do arquivo JSON."""
    with open(PACIENTES_FILE, 'r') as f:
        return json.load(f)

def get_processed_ids():
    """Retorna IDs dos pacientes já processados."""
    processed = set()
    if OUTPUT_DIR.exists():
        for fname in os.listdir(OUTPUT_DIR):
            if fname.startswith('paciente_') and fname.endswith('.json'):
                codigo = fname.split('_')[1]
                processed.add(codigo)
    return processed

def extract_patient_data(patient, cookies):
    """Extrai dados de um paciente específico."""
    patient_id = str(patient['id'])
    patient_name = patient['nome']
    
    # Precisa descobrir o slug do paciente
    # O ZenFisio usa slugs baseados no nome
    # Vamos tentar várias variações
    
    headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    }
    
    # Tentar buscar o histórico diretamente
    # O ZenFisio pode ter um endpoint de API que retorna o histórico
    # Vamos tentar descobrir o slug
    
    # Por enquanto, vamos pular este paciente se não conseguir o slug
    return None

def main():
    pacientes = load_pacientes()
    processed = get_processed_ids()
    
    print(f"Total de pacientes: {len(pacientes)}")
    print(f"Já processados: {len(processed)}")
    print(f"Restantes: {len(pacientes) - len(processed)}")
    
    # Carregar cookies do navegador
    # Por enquanto, vamos usar a abordagem manual
    # A ideia é processar os pacientes que ainda não foram processados
    
    # Lista de pacientes restantes
    restantes = [p for p in pacientes if str(p['id']) not in processed]
    
    print(f"\nPróximos 10 pacientes:")
    for p in restantes[:10]:
        print(f"  {p['id']} - {p['nome']}")

if __name__ == "__main__":
    main()
