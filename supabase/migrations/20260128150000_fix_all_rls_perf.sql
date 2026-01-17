DO $$
DECLARE
    pol record;
    new_qual text;
    new_with_check text;
    alter_cmd text;
BEGIN
    FOR pol IN
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            qual LIKE '%auth.uid()%' 
            OR with_check LIKE '%auth.uid()%'
            OR qual LIKE '%auth.jwt()%' 
            OR with_check LIKE '%auth.jwt()%'
            OR qual LIKE '%auth.email()%' 
            OR with_check LIKE '%auth.email()%'
        )
    LOOP
        new_qual := pol.qual;
        new_with_check := pol.with_check;
        
        -- Apply naive replace
        new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
        new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
        
        new_qual := replace(new_qual, 'auth.jwt()', '(select auth.jwt())');
        new_with_check := replace(new_with_check, 'auth.jwt()', '(select auth.jwt())');
        
        new_qual := replace(new_qual, 'auth.email()', '(select auth.email())');
        new_with_check := replace(new_with_check, 'auth.email()', '(select auth.email())');
        
        -- Apply regex cleanup for double wrapping
        new_qual := regexp_replace(new_qual, '\(\s*select\s+\(\s*select\s+auth\.uid\(\)\s*\)\s*\)', '(select auth.uid())', 'gi');
        new_with_check := regexp_replace(new_with_check, '\(\s*select\s+\(\s*select\s+auth\.uid\(\)\s*\)\s*\)', '(select auth.uid())', 'gi');
        
        new_qual := regexp_replace(new_qual, '\(\s*select\s+\(\s*select\s+auth\.jwt\(\)\s*\)\s*\)', '(select auth.jwt())', 'gi');
        new_with_check := regexp_replace(new_with_check, '\(\s*select\s+\(\s*select\s+auth\.jwt\(\)\s*\)\s*\)', '(select auth.jwt())', 'gi');
        
        new_qual := regexp_replace(new_qual, '\(\s*select\s+\(\s*select\s+auth\.email\(\)\s*\)\s*\)', '(select auth.email())', 'gi');
        new_with_check := regexp_replace(new_with_check, '\(\s*select\s+\(\s*select\s+auth\.email\(\)\s*\)\s*\)', '(select auth.email())', 'gi');

        IF new_qual IS DISTINCT FROM pol.qual OR new_with_check IS DISTINCT FROM pol.with_check THEN
            alter_cmd := format('ALTER POLICY %I ON %I.%I TO %s', pol.policyname, pol.schemaname, pol.tablename, array_to_string(pol.roles, ','));
            IF new_qual IS NOT NULL THEN
                alter_cmd := alter_cmd || format(' USING (%s)', new_qual);
            END IF;
            IF new_with_check IS NOT NULL THEN
                alter_cmd := alter_cmd || format(' WITH CHECK (%s)', new_with_check);
            END IF; 
            alter_cmd := alter_cmd || ';';
            RAISE NOTICE 'Executing: %', alter_cmd;
            EXECUTE alter_cmd;
        END IF;
    END LOOP;
END $$;
