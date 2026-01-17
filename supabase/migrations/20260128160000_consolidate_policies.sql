DO $$
DECLARE
    grp record;
    pol record;
    combined_qual text;
    combined_check text;
    drop_cmds text;
    create_cmd text;
    using_part text;
    check_part text;
    role_str text;
    nice_role_name text;
    full_cmd text;
BEGIN
    FOR grp IN
        SELECT
            schemaname,
            tablename,
            roles,
            cmd,
            count(*) as count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND permissive = 'PERMISSIVE'
        GROUP BY schemaname, tablename, roles, cmd
        HAVING count(*) > 1
    LOOP
        combined_qual := NULL;
        combined_check := NULL;
        drop_cmds := '';
        
        -- Iterate over policies in this group to build combined logic
        FOR pol IN
            SELECT policyname, qual, with_check
            FROM pg_policies
            WHERE schemaname = grp.schemaname
            AND tablename = grp.tablename
            AND roles = grp.roles
            AND cmd = grp.cmd
            AND permissive = 'PERMISSIVE'
        LOOP
            drop_cmds := drop_cmds || format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, grp.schemaname, grp.tablename);
            
            -- Combine Quals
            IF combined_qual IS DISTINCT FROM 'true' THEN
                IF pol.qual IS NULL THEN
                     combined_qual := 'true';
                ELSE
                    IF combined_qual IS NULL THEN
                        combined_qual := format('(%s)', pol.qual);
                    ELSE
                        combined_qual := combined_qual || format(' OR (%s)', pol.qual);
                    END IF;
                END IF;
            END IF;

            -- Combine Checks
            IF combined_check IS DISTINCT FROM 'true' THEN
                IF pol.with_check IS NULL THEN
                     combined_check := 'true';
                ELSE
                    IF combined_check IS NULL THEN
                        combined_check := format('(%s)', pol.with_check);
                    ELSE
                        combined_check := combined_check || format(' OR (%s)', pol.with_check);
                    END IF;
                END IF;
            END IF;
        END LOOP;

        -- Prepare statements
        role_str := array_to_string(grp.roles, ',');
        nice_role_name := regexp_replace(role_str, '[^a-zA-Z0-9]', '', 'g');
        if length(nice_role_name) > 20 then
            nice_role_name := substring(nice_role_name from 1 for 20);
        end if;
        
        create_cmd := format(
            'CREATE POLICY "consolidated_%s_%s_%s" ON %I.%I FOR %s TO %s',
            grp.cmd,
            substring(grp.tablename from 1 for 15), -- truncate table name to avoid too long
            nice_role_name,
            grp.schemaname, 
            grp.tablename, 
            grp.cmd, 
            role_str
        );
        
        using_part := '';
        check_part := '';

        -- Build USING part
        IF grp.cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL') THEN
            IF combined_qual IS NULL OR combined_qual = 'true' THEN
                  using_part := ' USING (true)';
            ELSE
                  using_part := format(' USING (%s)', combined_qual);
            END IF;
        END IF;
        
        -- Build CHECK part
        IF grp.cmd IN ('INSERT', 'UPDATE', 'ALL') THEN
            IF combined_check IS NULL OR combined_check = 'true' THEN
                  check_part := ' WITH CHECK (true)';
            ELSE
                  check_part := format(' WITH CHECK (%s)', combined_check);
            END IF;
        END IF;

        -- Strict enforcement based on command type (override above if needed to prevent errors)
        IF grp.cmd = 'INSERT' THEN using_part := ''; END IF;
        IF grp.cmd IN ('SELECT', 'DELETE') THEN check_part := ''; END IF;
        
        full_cmd := create_cmd || using_part || check_part || ';';
        
        RAISE NOTICE 'Processing %', full_cmd;
        EXECUTE drop_cmds;
        EXECUTE full_cmd;
        
    END LOOP;
END $$;
