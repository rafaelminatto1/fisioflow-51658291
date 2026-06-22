#!/usr/bin/env python3
"""
Extrai histórico de um paciente do ZenFisio usando Playwright com o navegador já aberto.
Usa a sessão existente do navegador via CDP.
"""
import json, os, re, sys, time
from datetime import datetime
from pathlib import Path

# Mapeamento manual de appointment_id -> dados do evento para Abdalla Melhen
# Baseado na leitura da página de histórico
EVENTOS = [
    {"id": "183159047", "data": "05/06/2025", "data_completa": "05/06/2025 19:00", "tipo": "Evolução", "profissional": "Isabella Colivati", "texto": "05/06/25- Isabella Colivati (CREFITO-3/421106-7)\nLiberação mio manual em MMII e MMSS\nbota"},
    {"id": "137570091", "data": "09/10/2024", "data_completa": "09/10/2024 20:00", "tipo": "Evolução", "profissional": "Amanda Notoya", "texto": "09/10/24 Amanda Notoya-(CREFITO 3/215954-F)\nPaciente relata dor e tensão em trapézio porção superior.\nLib mio com massagen gun global\nLib mio manual global\nTens acup em trapézio fibra superior\nBota 7"},
    {"id": "134771722", "data": "03/10/2024", "data_completa": "03/10/2024 20:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "134771773", "data": "01/10/2024", "data_completa": "01/10/2024 20:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "133069994", "data": "19/09/2024", "data_completa": "19/09/2024 20:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "133069991", "data": "17/09/2024", "data_completa": "17/09/2024 19:00", "tipo": "Evolução (Rascunho)", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "131745797", "data": "12/09/2024", "data_completa": "12/09/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "131745611", "data": "10/09/2024", "data_completa": "10/09/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "130657678", "data": "03/09/2024", "data_completa": "03/09/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "129357353", "data": "29/08/2024", "data_completa": "29/08/2024 19:00", "tipo": "Evolução (Rascunho)", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "128892202", "data": "23/08/2024", "data_completa": "23/08/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "127784429", "data": "21/08/2024", "data_completa": "21/08/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "126527907", "data": "15/08/2024", "data_completa": "15/08/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
    {"id": "126514517", "data": "08/08/2024", "data_completa": "08/08/2024 19:00", "tipo": "Evolução", "profissional": "Activity Fisioterapia", "texto": ""},
]

# Eventos sem link de detalhe (faltas, etc)
EVENTOS_SEM_LINK = [
    {"id": "169514212", "data": "01/04/2025", "data_completa": "01/04/2025 20:00", "tipo": "Faltou (com aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (com aviso prévio)"},
    {"id": "166683424", "data": "19/03/2025", "data_completa": "19/03/2025 20:00", "tipo": "Faltou (sem aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (sem aviso prévio)"},
    {"id": "157449354", "data": "03/02/2025", "data_completa": "03/02/2025 20:00", "tipo": "Faltou (com aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (com aviso prévio)"},
    {"id": "137572023", "data": "15/10/2024", "data_completa": "15/10/2024 20:00", "tipo": "Faltou (sem aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (sem aviso prévio)"},
    {"id": "134245504", "data": "26/09/2024", "data_completa": "26/09/2024 19:00", "tipo": "Faltou (com aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (com aviso prévio)"},
    {"id": "134245467", "data": "24/09/2024", "data_completa": "24/09/2024 19:00", "tipo": "Faltou (com aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (com aviso prévio)"},
    {"id": "130657731", "data": "05/09/2024", "data_completa": "05/09/2024 19:00", "tipo": "Não atendido (Sem cobrança)", "profissional": "Activity Fisioterapia", "texto": "Não atendido (Sem cobrança)"},
    {"id": "126247634", "data": "14/08/2024", "data_completa": "14/08/2024 19:00", "tipo": "Faltou (com aviso prévio)", "profissional": "Activity Fisioterapia", "texto": "Faltou (com aviso prévio)"},
]

print(f"Eventos com link: {len(EVENTOS)}")
print(f"Eventos sem link: {len(EVENTOS_SEM_LINK)}")
print(f"Total: {len(EVENTOS) + len(EVENTOS_SEM_LINK)}")
