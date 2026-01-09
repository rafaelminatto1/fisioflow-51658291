-- Enable pg_cron for scheduling jobs (if not already enabled)
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net for network requests (webhooks/edge functions)
create extension if not exists pg_net with schema extensions;

-- Ensure supabase_realtime publication exists and includes appointments
-- Note: 'supabase_realtime' publication is usually created by default.
-- We safely add tables to it.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

-- Add appointments to publication if not already present
alter publication supabase_realtime add table public.appointments;

-- Add notifications to publication if not already present
alter publication supabase_realtime add table public.notifications;

-- Example: Create a sample cron job to cleanup old logs (inactive by default or safe idempotent)
-- We won't actually schedule it to avoid side effects, but the extension is now ready.
