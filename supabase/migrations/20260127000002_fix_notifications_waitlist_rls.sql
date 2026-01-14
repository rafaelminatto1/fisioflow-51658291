-- ============================================
-- FIX: Corrigir políticas RLS de notifications e waitlist
-- ============================================

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
CREATE POLICY "notifications_insert_authenticated" ON notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- WAITLIST
DROP POLICY IF EXISTS "waitlist_select_policy" ON waitlist;
DROP POLICY IF EXISTS "waitlist_insert_policy" ON waitlist;
DROP POLICY IF EXISTS "waitlist_update_policy" ON waitlist;

DROP POLICY IF EXISTS "waitlist_select_authenticated" ON waitlist;
CREATE POLICY "waitlist_select_authenticated" ON waitlist
FOR SELECT TO authenticated
USING (
  -- Usuários podem ver itens da sua organização
  organization_id IS NULL
  OR organization_id = (
    SELECT organization_id FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

DROP POLICY IF EXISTS "waitlist_insert_authenticated" ON waitlist;
CREATE POLICY "waitlist_insert_authenticated" ON waitlist
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IS NULL
  OR organization_id = (
    SELECT organization_id FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

DROP POLICY IF EXISTS "waitlist_update_authenticated" ON waitlist;
CREATE POLICY "waitlist_update_authenticated" ON waitlist
FOR UPDATE TO authenticated
USING (
  organization_id IS NULL
  OR organization_id = (
    SELECT organization_id FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
)
WITH CHECK (
  organization_id IS NULL
  OR organization_id = (
    SELECT organization_id FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);
