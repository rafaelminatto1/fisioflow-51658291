-- Migration to consolidate multiple permissive RLS policies
-- 1. Explode 'ALL' policies into 'SELECT', 'INSERT', 'UPDATE', 'DELETE'.
-- 2. Consolidate policies.
-- FIX: Strictly map USING and WITH CHECK to allowed commands.
-- INSERT: WITH CHECK only.
-- SELECT/DELETE: USING only.
-- UPDATE: Both.

DO $$
DECLARE
    pol record;
    cmd_type text;
    
    -- For consolidation
    tbl_group record;
    combined_qual text;
    combined_check text;
    drop_stmts text;
    new_policy_name text;
    
    role_check text;
    curr_qual text;
    curr_check text;
    final_with_check text;
    sql_stmt text;
BEGIN
    ---------------------------------------------------------------------------
    -- STEP 1: Normalize 'ALL' policies
    ---------------------------------------------------------------------------
    FOR pol IN
        SELECT schemaname, tablename, policyname, roles, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' 
          AND cmd = 'ALL'
    LOOP
        -- Recreate as separate policies
        FOREACH cmd_type IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        LOOP
            sql_stmt := format(
                'CREATE POLICY %I ON %I.%I FOR %s TO %s',
                pol.policyname || '_' || lower(cmd_type) || '_gen',
                pol.schemaname,
                pol.tablename,
                cmd_type,
                array_to_string(pol.roles, ',')
            );

            -- Add Clauses based on Command Type
            IF cmd_type = 'INSERT' THEN
                 -- INSERT uses WITH CHECK only
                 sql_stmt := sql_stmt || format(' WITH CHECK (%s)', COALESCE(pol.with_check, 'true'));
            
            ELSIF cmd_type = 'SELECT' OR cmd_type = 'DELETE' THEN
                 -- SELECT/DELETE use USING only
                 sql_stmt := sql_stmt || format(' USING (%s)', COALESCE(pol.qual, 'true'));
            
            ELSIF cmd_type = 'UPDATE' THEN
                 -- UPDATE uses USING and WITH CHECK
                 sql_stmt := sql_stmt || format(' USING (%s)', COALESCE(pol.qual, 'true'));
                 IF pol.with_check IS NOT NULL THEN
                     sql_stmt := sql_stmt || format(' WITH CHECK (%s)', pol.with_check);
                 END IF;
            END IF;
            
            EXECUTE sql_stmt;
        END LOOP;
        
        EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Normalized ALL policy: % on %', pol.policyname, pol.tablename;
    END LOOP;

    ---------------------------------------------------------------------------
    -- STEP 2: Consolidate multiple policies per command
    ---------------------------------------------------------------------------
    FOR tbl_group IN
        SELECT schemaname, tablename, cmd, count(*) as cnt
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename, cmd
        HAVING count(*) > 1
    LOOP
        combined_qual := '';
        combined_check := '';
        drop_stmts := '';
        
        RAISE NOTICE 'Consolidating % policies for % on %', tbl_group.cnt, tbl_group.cmd, tbl_group.tablename;
        
        FOR pol IN
            SELECT policyname, roles, qual, with_check
            FROM pg_policies
            WHERE schemaname = tbl_group.schemaname
              AND tablename = tbl_group.tablename
              AND cmd = tbl_group.cmd
        LOOP
            drop_stmts := drop_stmts || format('DROP POLICY %I ON %I.%I; ', pol.policyname, tbl_group.schemaname, tbl_group.tablename);
            
            -- Role Check
            IF 'public' = ANY(pol.roles) THEN
                 role_check := 'true';
            ELSE
                 role_check := format('(current_user = ANY(ARRAY[%L]::name[]))', pol.roles);
            END IF;
            
            -- Qual (USING)
            -- Only relevant for SELECT, DELETE, UPDATE
            IF tbl_group.cmd IN ('SELECT', 'DELETE', 'UPDATE') THEN
                curr_qual := COALESCE(pol.qual, 'true');
                IF combined_qual = '' THEN
                    combined_qual := format('(%s AND %s)', role_check, curr_qual);
                ELSE
                    combined_qual := combined_qual || format(' OR (%s AND %s)', role_check, curr_qual);
                END IF;
            END IF;
            
            -- With Check
            -- Only relevant for INSERT, UPDATE
            IF tbl_group.cmd IN ('INSERT', 'UPDATE') THEN
                curr_check := COALESCE(pol.with_check, 'true');
                IF combined_check = '' THEN
                    combined_check := format('(%s AND %s)', role_check, curr_check);
                ELSE
                    combined_check := combined_check || format(' OR (%s AND %s)', role_check, curr_check);
                END IF;
            END IF;
            
        END LOOP;
        
        EXECUTE drop_stmts;
        
        new_policy_name := format('consolidated_%s_%s_policy', lower(tbl_group.cmd), tbl_group.tablename);
        IF length(new_policy_name) > 63 THEN
             new_policy_name := substring(new_policy_name from 1 for 63);
        END IF;

        sql_stmt := format(
            'CREATE POLICY %I ON %I.%I FOR %s TO public',
            new_policy_name,
            tbl_group.schemaname,
            tbl_group.tablename,
            tbl_group.cmd
        );
        
        -- Append clauses
        IF tbl_group.cmd = 'INSERT' THEN
             sql_stmt := sql_stmt || format(' WITH CHECK (%s)', combined_check);
        
        ELSIF tbl_group.cmd IN ('SELECT', 'DELETE') THEN
             sql_stmt := sql_stmt || format(' USING (%s)', combined_qual);
        
        ELSIF tbl_group.cmd = 'UPDATE' THEN
             sql_stmt := sql_stmt || format(' USING (%s)', combined_qual);
             IF combined_check <> '' THEN
                  sql_stmt := sql_stmt || format(' WITH CHECK (%s)', combined_check);
             END IF;
        END IF;
        
        EXECUTE sql_stmt;
        RAISE NOTICE 'Created consolidated policy: %', new_policy_name;
        
    END LOOP;
    
END $$;
