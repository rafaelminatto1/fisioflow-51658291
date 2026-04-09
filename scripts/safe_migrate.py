import os
import psycopg2

# Connect to the database
conn_str = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(conn_str)
conn.autocommit = True
cur = conn.cursor()

# Read the migration file
with open('drizzle/0002_short_taskmaster.sql', 'r') as f:
    sql_content = f.read()

# Split into statements
statements = sql_content.split('--> statement-breakpoint')

success_count = 0
skip_count = 0
error_count = 0

print(f"Executing {len(statements)} statements...")

for stmt in statements:
    stmt = stmt.strip()
    if not stmt:
        continue
    
    try:
        cur.execute(stmt)
        success_count += 1
    except psycopg2.Error as e:
        error_msg = str(e).lower()
        if "already exists" in error_msg:
            print(f"Skipping (already exists): {stmt[:50]}...")
            skip_count += 1
        else:
            print(f"Error executing: {stmt[:100]}...")
            print(f"Full Error: {e}")
            error_count += 1

print("\n--- Summary ---")
print(f"Success: {success_count}")
print(f"Skipped (Already exists): {skip_count}")
print(f"Errors: {error_count}")

cur.close()
conn.close()
