-- Função para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    role,
    phone,
    cpf,
    birth_date,
    crefito,
    specialties,
    experience_years,
    bio,
    consultation_fee,
    onboarding_completed,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'paciente'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'birth_date')::date 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data->>'crefito', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'specialties' IS NOT NULL 
      THEN string_to_array(NEW.raw_user_meta_data->>'specialties', ',')
      ELSE ARRAY[]::text[]
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'experience_years' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'experience_years')::integer 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'consultation_fee' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'consultation_fee')::decimal 
      ELSE NULL 
    END,
    false,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir que a função seja executada com privilégios adequados
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;