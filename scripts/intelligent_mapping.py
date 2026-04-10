import json
import difflib
import os

DB_DUMP = 'tmp/full_db_dump.txt'
ILLUSTRATIONS_DIR = 'public/exercises/illustrations'

def get_ratio(a, b):
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()

def main():
    # 1. Read DB Dump
    exercises = []
    with open(DB_DUMP, 'r') as f:
        for line in f:
            if '|' not in line: continue
            parts = [p.strip() for p in line.split('|')]
            if len(parts) < 4: continue
            exercises.append({
                'id': parts[0],
                'name': parts[1],
                'slug': parts[2],
                'image_url': parts[3]
            })

    # 2. Get available illustrations (local assets)
    # We want to match exercises to existing high-quality AVIF files
    available_illustrations = [f.replace('.avif', '') for f in os.listdir(ILLUSTRATIONS_DIR) if f.endswith('.avif')]
    
    # 3. Separate Masters and Orphans
    masters = [ex for ex in exercises if ex['slug'] and ex['slug'] in available_illustrations]
    orphans = [ex for ex in exercises if not ex['slug'] or ex['slug'] not in available_illustrations]

    print(f"Total exercises: {len(exercises)}")
    print(f"Master exercises (with local assets): {len(masters)}")
    print(f"Orphan exercises (needing mapping/generation): {len(orphans)}")

    # 4. Perform mapping
    mapping = []
    still_missing = []

    for orphan in orphans:
        best_match = None
        best_score = 0
        
        # Try to match with Masters in DB
        for master in masters:
            score = get_ratio(orphan['name'], master['name'])
            if score > best_score:
                best_score = score
                best_match = master
        
        # Try to match with files in folder (in case DB master is missing but file exists)
        for illu in available_illustrations:
            # Clean illustration name for matching (e.g. ab-wheel-rollout -> ab wheel rollout)
            illu_name = illu.replace('-', ' ')
            score = get_ratio(orphan['name'], illu_name)
            if score > best_score:
                best_score = score
                best_match = {'slug': illu, 'image_url': f'/exercises/illustrations/{illu}.avif'}

        if best_score > 0.8: # Confidence threshold
            mapping.append({
                'id': orphan['id'],
                'name': orphan['name'],
                'old_image': orphan['image_url'],
                'new_slug': best_match['slug'],
                'new_image': f'/exercises/illustrations/{best_match["slug"]}.avif',
                'score': best_score
            })
        else:
            still_missing.append(orphan)

    print(f"Mapped exercises: {len(mapping)}")
    print(f"Truly missing exercises (no match > 80%): {len(still_missing)}")

    # Save results
    with open('tmp/mapping_results.json', 'w') as f:
        json.dump(mapping, f, indent=2)
    
    with open('tmp/truly_missing.json', 'w') as f:
        json.dump(still_missing, f, indent=2)

    print("\nSample Mappings:")
    for m in mapping[:5]:
        print(f"- '{m['name']}' -> '{m['new_slug']}' (Score: {m['score']:.2f})")

    print("\nSample Truly Missing:")
    for m in still_missing[:5]:
        print(f"- '{m['name']}'")

if __name__ == "__main__":
    main()
