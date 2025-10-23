-- Habilitar Realtime para a tabela appointments
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- Adicionar appointments à publicação realtime (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;