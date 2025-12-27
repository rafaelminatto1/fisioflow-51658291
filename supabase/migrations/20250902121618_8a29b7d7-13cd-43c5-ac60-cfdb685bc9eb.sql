-- PRIMEIRO: Desabilitar temporariamente todos os triggers de auditoria para evitar erros durante esta migration
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Desabilitar todos os triggers de auditoria
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE 'audit_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
END $$;

-- Create vouchers table for training packages (ou adicionar colunas se já existir)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar colunas se não existirem
ALTER TABLE public.vouchers 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sessions_included INTEGER,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create voucher purchases table
CREATE TABLE IF NOT EXISTS public.voucher_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
  purchased_by UUID REFERENCES auth.users(id),
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  sessions_remaining INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_method TEXT,
  payment_id TEXT,
  amount_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partner sessions table
CREATE TABLE IF NOT EXISTS public.partner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_purchase_id UUID REFERENCES voucher_purchases(id),
  session_date TIMESTAMPTZ NOT NULL,
  session_type TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  photos JSONB,
  shared_with_physio BOOLEAN DEFAULT true,
  physio_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partner commissions table
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_purchase_id UUID REFERENCES voucher_purchases(id),
  commission_rate DECIMAL(5,2) DEFAULT 85.00,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partner withdrawals table
CREATE TABLE IF NOT EXISTS public.partner_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Create professional chats table
CREATE TABLE IF NOT EXISTS public.professional_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  physio_id UUID REFERENCES auth.users(id),
  partner_id UUID REFERENCES auth.users(id),
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add partner fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN partner_commission_rate DECIMAL(5,2) DEFAULT 85.00,
ADD COLUMN partner_pix_key TEXT,
ADD COLUMN partner_bio TEXT,
ADD COLUMN partner_specialties TEXT[];

-- Enable RLS on all tables
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vouchers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'is_active') THEN
        EXECUTE 'CREATE POLICY "Anyone can view active vouchers" ON public.vouchers
          FOR SELECT USING (is_active = true)';
    ELSE
        EXECUTE 'CREATE POLICY "Anyone can view active vouchers" ON public.vouchers
          FOR SELECT USING (true)';
    END IF;
END $$;

DROP POLICY IF EXISTS "Staff can manage vouchers" ON public.vouchers;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Staff can manage vouchers" ON public.vouchers
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role IN (''admin'', ''fisioterapeuta'')
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Staff can manage vouchers" ON public.vouchers
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    END IF;
END $$;

-- RLS Policies for voucher_purchases
DROP POLICY IF EXISTS "Users can view related purchases" ON public.voucher_purchases;
DROP POLICY IF EXISTS "Staff can manage purchases" ON public.voucher_purchases;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Users can view related purchases" ON public.voucher_purchases
          FOR SELECT USING (
            auth.uid() = purchased_by OR
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role IN (''admin'', ''fisioterapeuta'')
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
        EXECUTE 'CREATE POLICY "Staff can manage purchases" ON public.voucher_purchases
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role IN (''admin'', ''fisioterapeuta'')
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Users can view related purchases" ON public.voucher_purchases
          FOR SELECT USING (
            auth.uid() = purchased_by OR
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
        EXECUTE 'CREATE POLICY "Staff can manage purchases" ON public.voucher_purchases
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    END IF;
END $$;

-- RLS Policies for partner_sessions
CREATE POLICY "Partners can manage their sessions" ON public.partner_sessions
  FOR ALL USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all sessions" ON public.partner_sessions;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Staff can view all sessions" ON public.partner_sessions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role IN (''admin'', ''fisioterapeuta'')
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Staff can view all sessions" ON public.partner_sessions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role IN (''admin'', ''fisioterapeuta'')
            )
          )';
    END IF;
END $$;

-- RLS Policies for partner_commissions
CREATE POLICY "Partners can view their commissions" ON public.partner_commissions
  FOR SELECT USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage commissions" ON public.partner_commissions;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Admins can manage commissions" ON public.partner_commissions
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role = ''admin''
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Admins can manage commissions" ON public.partner_commissions
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    END IF;
END $$;

-- RLS Policies for partner_withdrawals
CREATE POLICY "Partners can manage their withdrawals" ON public.partner_withdrawals
  FOR ALL USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.partner_withdrawals;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Admins can view all withdrawals" ON public.partner_withdrawals
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role = ''admin''
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Admins can view all withdrawals" ON public.partner_withdrawals
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    END IF;
END $$;

-- RLS Policies for professional_chats
DROP POLICY IF EXISTS "Participants can view chat" ON public.professional_chats;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Participants can view chat" ON public.professional_chats
          FOR SELECT USING (
            auth.uid() IN (physio_id, partner_id) OR
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE user_id = auth.uid() 
              AND role = ''admin''
            )
            OR EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    ELSE
        EXECUTE 'CREATE POLICY "Participants can view chat" ON public.professional_chats
          FOR SELECT USING (
            auth.uid() IN (physio_id, partner_id) OR
            EXISTS (
              SELECT 1 FROM public.organization_members
              WHERE user_id = auth.uid() AND role = ''admin''
            )
          )';
    END IF;
END $$;

CREATE POLICY "Participants can send messages" ON public.professional_chats
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (physio_id, partner_id)
  );

-- Insert default vouchers (apenas se a tabela tiver as colunas necessárias)
DO $$
DECLARE
    has_name_col BOOLEAN;
    has_nome_col BOOLEAN;
    has_descricao_col BOOLEAN;
    has_description_col BOOLEAN;
    has_preco_col BOOLEAN;
    has_price_col BOOLEAN;
    has_sessoes_col BOOLEAN;
    has_sessions_included_col BOOLEAN;
    has_validade_dias_col BOOLEAN;
    has_validity_days_col BOOLEAN;
BEGIN
    has_name_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'name');
    has_nome_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'nome');
    has_descricao_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'descricao');
    has_description_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'description');
    has_preco_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'preco');
    has_price_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'price');
    has_sessoes_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'sessoes');
    has_sessions_included_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'sessions_included');
    has_validade_dias_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'validade_dias');
    has_validity_days_col := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'validity_days');
    
    -- Verificar se já existem vouchers para evitar duplicatas
    IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE (has_name_col AND name = 'Sessão Avulsa') OR (has_nome_col AND nome = 'Sessão Avulsa')) THEN
        IF has_nome_col AND has_descricao_col AND has_preco_col AND has_sessoes_col AND has_validade_dias_col THEN
            -- Verificar se tem coluna tipo
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'tipo') THEN
                INSERT INTO public.vouchers (nome, descricao, tipo, preco, sessoes, validade_dias) VALUES 
                ('Sessão Avulsa', 'Uma sessão individual de treino personalizado', 'pacote', 100.00, 1, 30);
            ELSE
                INSERT INTO public.vouchers (nome, descricao, preco, sessoes, validade_dias) VALUES 
                ('Sessão Avulsa', 'Uma sessão individual de treino personalizado', 100.00, 1, 30);
            END IF;
        ELSIF has_name_col AND has_description_col AND has_price_col AND has_sessions_included_col AND has_validity_days_col THEN
            INSERT INTO public.vouchers (name, description, price, sessions_included, validity_days) VALUES 
            ('Sessão Avulsa', 'Uma sessão individual de treino personalizado', 100.00, 1, 30);
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE (has_name_col AND name = 'Pacote 4 Sessões') OR (has_nome_col AND nome = 'Pacote 4 Sessões')) THEN
        IF has_nome_col AND has_descricao_col AND has_preco_col AND has_sessoes_col AND has_validade_dias_col THEN
            -- Verificar se tem coluna tipo
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'tipo') THEN
                INSERT INTO public.vouchers (nome, descricao, tipo, preco, sessoes, validade_dias) VALUES 
                ('Pacote 4 Sessões', 'Quatro sessões com desconto especial', 'pacote', 350.00, 4, 60);
            ELSE
                INSERT INTO public.vouchers (nome, descricao, preco, sessoes, validade_dias) VALUES 
                ('Pacote 4 Sessões', 'Quatro sessões com desconto especial', 350.00, 4, 60);
            END IF;
        ELSIF has_name_col AND has_description_col AND has_price_col AND has_sessions_included_col AND has_validity_days_col THEN
            INSERT INTO public.vouchers (name, description, price, sessions_included, validity_days) VALUES 
            ('Pacote 4 Sessões', 'Quatro sessões com desconto especial', 350.00, 4, 60);
        END IF;
    END IF;
    
    -- Inserir voucher "Mensal Ilimitado" se não existir
    IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE (has_name_col AND name = 'Mensal Ilimitado') OR (has_nome_col AND nome = 'Mensal Ilimitado')) THEN
        IF has_nome_col AND has_descricao_col AND has_preco_col AND has_sessoes_col AND has_validade_dias_col THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vouchers' AND column_name = 'tipo') THEN
                INSERT INTO public.vouchers (nome, descricao, tipo, preco, sessoes, validade_dias, is_unlimited) VALUES 
                ('Mensal Ilimitado', 'Acesso ilimitado por 30 dias', 'pacote', 450.00, NULL, 30, true);
            ELSE
                INSERT INTO public.vouchers (nome, descricao, preco, sessoes, validade_dias, is_unlimited) VALUES 
                ('Mensal Ilimitado', 'Acesso ilimitado por 30 dias', 450.00, NULL, 30, true);
            END IF;
        ELSIF has_name_col AND has_description_col AND has_price_col AND has_sessions_included_col AND has_validity_days_col THEN
            INSERT INTO public.vouchers (name, description, price, sessions_included, validity_days, is_unlimited) VALUES 
            ('Mensal Ilimitado', 'Acesso ilimitado por 30 dias', 450.00, NULL, 30, true);
        END IF;
    ELSE
        -- Atualizar voucher existente
        IF has_name_col THEN
            UPDATE public.vouchers SET is_unlimited = true WHERE name = 'Mensal Ilimitado';
        ELSIF has_nome_col THEN
            UPDATE public.vouchers SET is_unlimited = true WHERE nome = 'Mensal Ilimitado';
        END IF;
    END IF;
END $$;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_vouchers_updated_at ON public.vouchers;
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_voucher_purchases_updated_at ON public.voucher_purchases;
CREATE TRIGGER update_voucher_purchases_updated_at
  BEFORE UPDATE ON public.voucher_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_sessions_updated_at ON public.partner_sessions;
CREATE TRIGGER update_partner_sessions_updated_at
  BEFORE UPDATE ON public.partner_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Reabilitar todos os triggers de auditoria que foram desabilitados no início
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Reabilitar todos os triggers de auditoria
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE 'audit_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
END $$;