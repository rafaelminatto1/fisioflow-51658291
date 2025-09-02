-- Create vouchers table for training packages
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  sessions_included INTEGER,
  validity_days INTEGER NOT NULL DEFAULT 90,
  is_unlimited BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create voucher purchases table
CREATE TABLE public.voucher_purchases (
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
CREATE TABLE public.partner_sessions (
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
CREATE TABLE public.partner_commissions (
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
CREATE TABLE public.partner_withdrawals (
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
CREATE TABLE public.professional_chats (
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
CREATE POLICY "Anyone can view active vouchers" ON public.vouchers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage vouchers" ON public.vouchers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

-- RLS Policies for voucher_purchases
CREATE POLICY "Users can view related purchases" ON public.voucher_purchases
  FOR SELECT USING (
    auth.uid() = purchased_by OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'fisioterapeuta', 'parceiro')
    )
  );

CREATE POLICY "Staff can manage purchases" ON public.voucher_purchases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

-- RLS Policies for partner_sessions
CREATE POLICY "Partners can manage their sessions" ON public.partner_sessions
  FOR ALL USING (partner_id = auth.uid());

CREATE POLICY "Staff can view all sessions" ON public.partner_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'fisioterapeuta')
    )
  );

-- RLS Policies for partner_commissions
CREATE POLICY "Partners can view their commissions" ON public.partner_commissions
  FOR SELECT USING (partner_id = auth.uid());

CREATE POLICY "Admins can manage commissions" ON public.partner_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for partner_withdrawals
CREATE POLICY "Partners can manage their withdrawals" ON public.partner_withdrawals
  FOR ALL USING (partner_id = auth.uid());

CREATE POLICY "Admins can view all withdrawals" ON public.partner_withdrawals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for professional_chats
CREATE POLICY "Participants can view chat" ON public.professional_chats
  FOR SELECT USING (
    auth.uid() IN (physio_id, partner_id) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Participants can send messages" ON public.professional_chats
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (physio_id, partner_id)
  );

-- Insert default vouchers
INSERT INTO public.vouchers (name, description, price, sessions_included, validity_days) VALUES 
('Sessão Avulsa', 'Uma sessão individual de treino personalizado', 100.00, 1, 30),
('Pacote 4 Sessões', 'Quatro sessões com desconto especial', 350.00, 4, 60),
('Mensal Ilimitado', 'Acesso ilimitado por 30 dias', 450.00, null, 30);

UPDATE public.vouchers SET is_unlimited = true WHERE name = 'Mensal Ilimitado';

-- Create triggers for updated_at
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voucher_purchases_updated_at
  BEFORE UPDATE ON public.voucher_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_sessions_updated_at
  BEFORE UPDATE ON public.partner_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();