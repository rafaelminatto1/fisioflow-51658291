-- Enable pg_cron for scheduling jobs (if not already enabled)
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net for network requests (webhooks/edge functions)
create extension if not exists pg_net with schema extensions;

-- Ensure supabase_realtime publication exists and includes appointments
-- We use a DO block to safely handle "already exists" errors for publication membership
do $$
begin
  -- Create publication if it doesn't exist
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- Add appointments to publication if not already present
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  -- Add notifications to publication if not already present
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
