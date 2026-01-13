-- Create Quest Definitions table for dynamic quest management
create table if not exists public.quest_definitions (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    xp_reward integer not null default 50,
    icon text,
    is_active boolean default true,
    category text default 'daily',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.quest_definitions enable row level security;

-- Policies
create policy "Public read access for active quests"
    on public.quest_definitions for select
    to authenticated
    using (true);

create policy "Admin full access"
    on public.quest_definitions for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Insert default quests (migrating from hardcoded values)
insert into public.quest_definitions (title, description, xp_reward, icon, category) values
    ('Realizar Sessão', 'Complete sua sessão de exercícios', 50, 'Activity', 'daily'),
    ('Registrar Dor', 'Atualize seu mapa de dor', 20, 'Thermometer', 'daily'),
    ('Hidratação', 'Beba água e registre', 10, 'Droplets', 'daily');
