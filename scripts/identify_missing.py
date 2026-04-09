import os
import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
ILLUSTRATIONS_DIR = "/home/rafael/Documents/fisioflow/fisioflow-51658291/public/exercises/illustrations"

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT name, slug, description FROM exercises;")
        rows = cur.fetchall()
        
        existing_files = set(os.listdir(ILLUSTRATIONS_DIR))
        
        missing = []
        for name, slug, description in rows:
            filename = f"{slug}.avif"
            if filename not in existing_files:
                missing.append({
                    "name": name,
                    "slug": slug,
                    "description": description
                })
        
        print(f"Total exercises: {len(rows)}")
        print(f"Missing illustrations: {len(missing)}")
        
        # Save first 20 missing to show user
        with open("tmp/missing_report.json", "w") as f:
            json.dump(missing, f, indent=2)
            
        print("\nFirst 20 missing exercises:")
        for ex in missing[:20]:
            print(f"- {ex['name']} ({ex['slug']})")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
