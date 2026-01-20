-- Gamification V2: Economy & Inventory

-- 1. Tabela de Itens da Loja
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- ex: 'streak_freeze', 'theme_dark'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('consumable', 'cosmetic', 'feature')),
    icon TEXT, -- Nome do ícone Lucide
    metadata JSONB DEFAULT '{}', -- Para configurações extras (ex: cores do tema)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Inventário do Usuário
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.shop_items(id),
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- 3. RLS Policies

-- Shop Items (Todos podem ver)
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Everyone can view active shop items" ON public.shop_items;
    CREATE POLICY "Everyone can view active shop items" 
        ON public.shop_items FOR SELECT 
        USING (is_active = true);
END $$;

-- User Inventory (Apenas dono pode ver e modificar)
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
    CREATE POLICY "Users can view own inventory" 
        ON public.user_inventory FOR SELECT 
        USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own inventory" ON public.user_inventory;
    CREATE POLICY "Users can update own inventory" 
        ON public.user_inventory FOR UPDATE
        USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "System can manage inventory" ON public.user_inventory;
    CREATE POLICY "System can manage inventory" 
        ON public.user_inventory FOR ALL 
        USING (true)
        WITH CHECK (true);
END $$;

-- 4. Seed Initial Items (Popular a Loja)
INSERT INTO public.shop_items (code, name, description, cost, type, icon)
VALUES 
    ('streak_freeze', 'Escudo de Gelo', 'Protege sua sequência se você perder um dia de treino.', 500, 'consumable', 'Shield'),
    ('xp_boost', 'Dobro de XP', 'Ganhe 2x XP na próxima atividade realizada.', 300, 'consumable', 'Zap'),
    ('theme_neon', 'Tema Neon', 'Desbloqueia o visual Neon para seu perfil.', 2000, 'cosmetic', 'Palette'),
    ('badge_supporter', 'Distintivo Apoiador', 'Um distintivo dourado exclusivo para seu perfil.', 1000, 'cosmetic', 'Award')
ON CONFLICT (code) DO UPDATE SET
    cost = EXCLUDED.cost,
    description = EXCLUDED.description;