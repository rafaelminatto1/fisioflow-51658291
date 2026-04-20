import json
import os

# Caminhos dos arquivos
db_json_path = "/home/rafael/.gemini/antigravity/brain/3cce0f0b-41a9-42d4-8045-480eed639dc2/.system_generated/steps/510/output.txt"
local_files_path = "/home/rafael/Documents/fisioflow/fisioflow-51658291/illustrations_files.txt"

# Carregar dados do DB
with open(db_json_path, 'r') as f:
    db_exercises = json.load(f)

# Carregar arquivos locais
with open(local_files_path, 'r') as f:
    local_files = set(line.strip() for line in f if line.strip())

fixes = []
missing = []

for exercise in db_exercises:
    name = exercise['name']
    image_url = exercise['image_url']
    
    if not image_url:
        continue
        
    filename = image_url.split('/')[-1]
    
    if filename in local_files:
        continue
        
    # Tentar encontrar uma alternativa
    basename = filename.rsplit('.', 1)[0]
    found = False
    
    # 1. Tentar trocar extensão .png/.jpg/.avif/.webp
    for ext in ['.avif', '.webp', '.png', '.jpg']:
        alt_filename = f"{basename}{ext}"
        if alt_filename in local_files:
            new_url = f"/exercises/illustrations/{alt_filename}"
            if new_url != image_url:
                fixes.append({
                    'name': name,
                    'old_url': image_url,
                    'new_url': new_url
                })
            found = True
            break
            
    if not found:
        # 2. Tentar busca por nome mais simples (caso tenha sufixos)
        simple_basename = basename.split('_')[0].split('(')[0].strip()
        for local_file in local_files:
            if simple_basename in local_file:
                new_url = f"/exercises/illustrations/{local_file}"
                fixes.append({
                    'name': name,
                    'old_url': image_url,
                    'new_url': new_url
                })
                found = True
                break

    if not found:
        missing.append({
            'name': name,
            'url': image_url
        })

# Gerar SQL
if fixes:
    print("-- FIXES")
    for fix in fixes:
        safe_name = fix['name'].replace("'", "''")
        print(f"UPDATE exercises SET image_url = '{fix['new_url']}' WHERE name = '{safe_name}' AND image_url = '{fix['old_url']}';")

if missing:
    print("\n-- STILL MISSING")
    for m in missing:
        print(f"-- {m['name']}: {m['url']}")
