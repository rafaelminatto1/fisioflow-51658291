-- Improved migration to add indexes to all unindexed foreign keys in the public schema
-- This version handles composite foreign keys correctly by grouping by constraint
DO $$
DECLARE
    r RECORD;
    index_name text;
    sql_cmd text;
    cols text;
BEGIN
    FOR r IN
        SELECT
            con.conname AS constraint_name,
            cl.relname AS table_name,
            string_agg(quote_ident(att.attname), ', ' ORDER BY array_position(con.conkey, att.attnum)) AS column_names,
            (array_agg(att.attnum ORDER BY array_position(con.conkey, att.attnum)))[1] AS first_col_num
        FROM pg_constraint con
        JOIN pg_class cl ON con.conrelid = cl.oid
        JOIN pg_namespace nsp ON cl.relnamespace = nsp.oid
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f'
        AND nsp.nspname = 'public'
        GROUP BY con.conname, cl.relname, con.conrelid, con.conkey
        HAVING NOT EXISTS (
            SELECT 1
            FROM pg_index idx
            WHERE idx.indrelid = con.conrelid
            -- Check if any index starts with the first column of the foreign key
            -- This is a heuristic: if an index starts with the FK's first column, Postgres can typically use it
            AND idx.indkey[0] = (con.conkey)[1]
        )
    LOOP
        -- Construct a consistent index name
        index_name := 'idx_' || r.constraint_name;

        -- Postgres has a limit of 63 bytes for identifiers. Truncate if necessary.
        IF length(index_name) > 63 THEN
             index_name := substr('idx_' || md5(r.constraint_name), 1, 63);
        END IF;

        -- Create the index on the columns (comma separated list generated above)
        sql_cmd := format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s);', index_name, r.table_name, r.column_names);

        RAISE NOTICE 'Creating index for constraint %: %', r.constraint_name, sql_cmd;
        EXECUTE sql_cmd;
    END LOOP;
END $$;
