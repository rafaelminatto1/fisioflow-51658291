import json
import os

# Caminhos dos arquivos
db_json_path = "/home/rafael/.gemini/antigravity/brain/3cce0f0b-41a9-42d4-8045-480eed639dc2/.system_generated/steps/510/output.txt"
local_dir = "/home/rafael/Documents/fisioflow/fisioflow-51658291/public/exercises/illustrations"

# Carregar dados do DB
with open(db_json_path, 'r') as f:
    db_exercises = json.load(f)

# Carregar arquivos locais
local_files = set(os.listdir(local_dir))

missing = []
for exercise in db_exercises:
    image_url = exercise.get('image_url')
    if not image_url:
        continue
        
    filename = image_url.split('/')[-1]
    if filename not in local_files:
        missing.append({
            'name': exercise['name'],
            'image_url': image_url
        })

print(json.dumps(missing, indent=2))
