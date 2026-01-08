-- Migration to add indexes to all unindexed foreign keys in the public schema
DO $$
DECLARE
    r RECORD;
    index_name text;
    sql_cmd text;
BEGIN
    FOR r IN
        SELECT
            cl.relname AS table_name,
            att.attname AS column_name,
            con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class cl ON con.conrelid = cl.oid
        JOIN pg_namespace nsp ON cl.relnamespace = nsp.oid
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f'
        AND nsp.nspname = 'public'
        AND NOT EXISTS (
            SELECT 1
            FROM pg_index idx
            WHERE idx.indrelid = con.conrelid
            AND idx.indkey[0] = att.attnum
        )
    LOOP
        -- Construct a consistent index name
        -- Using a simplified name to avoid max length issues, but keeping it descriptive
        index_name := 'idx_' || substr(r.table_name, 1, 30) || '_' || substr(r.column_name, 1, 20);
        
        -- Check if index name already exists (just in case of collision from partial manual runs)
        -- We will just use IF NOT EXISTS in the CREATE statement, but the name generation above 
        -- doesn't guarantee uniqueness if there are multiple foreign keys on the same column (rare but possible).
        -- To be safer, we can use the constraint name which is unique per table.
        index_name := 'idx_' || r.constraint_name;

        -- Postgres has a limit of 63 bytes for identifiers. Truncate if necessary.
        IF length(index_name) > 63 THEN
             index_name := substr('idx_' || md5(r.constraint_name), 1, 63);
        END IF;

        sql_cmd := format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I);', index_name, r.table_name, r.column_name);

        RAISE NOTICE 'Creating index: %', sql_cmd;
        EXECUTE sql_cmd;
    END LOOP;
END $$;
