-- Gamification V2: Social (Leaderboard)

-- 1. View para Leaderboard Seguro (Anonimizado por padrão)
-- Mostra apenas o primeiro nome e inicial do sobrenome, ou um apelido gerado se não houver perfil.
CREATE OR REPLACE VIEW public.gamification_leaderboard AS
SELECT 
    pg.patient_id,
    pg.total_points,
    pg.level,
    pg.current_streak,
    pg.longest_streak,
    -- Tenta pegar o nome do perfil e formatar (Nome S.), senão usa 'Paciente'
    COALESCE(
        (SELECT 
            CASE 
                WHEN p.full_name IS NULL OR p.full_name = '' THEN 'Paciente'
                ELSE split_part(p.full_name, ' ', 1) || ' ' || LEFT(split_part(p.full_name, ' ', 2), 1) || '.' 
            END
         FROM public.patients p 
         WHERE p.id = pg.patient_id), 
        'Paciente'
    ) as display_name,
    -- Avatar (via profiles linkado ao patient se existir user_id, ou null)
    -- Nota: Patients tabela pode não ter link direto com profiles facilmente acessível aqui sem um join complexo
    -- Vamos simplificar e não expor avatar por enquanto para performance/privacidade, ou pegar via profiles se possível
    NULL as avatar_url, 
    RANK() OVER (ORDER BY pg.total_points DESC) as rank
FROM 
    public.patient_gamification pg
WHERE 
    pg.total_points > 0; -- Apenas quem tem pontos participa

-- 2. RLS para a View (Tecnicamente Views herdam permissões das tabelas base, 
-- mas como patient_gamification tem RLS restrito, precisamos de uma função SECURITY DEFINER 
-- para permitir ler dados "públicos" do ranking sem expor tudo).

-- Função para ler o leaderboard de forma segura
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    patient_id UUID,
    total_points INTEGER,
    level INTEGER,
    current_streak INTEGER,
    display_name TEXT,
    rank BIGINT
) 
SECURITY DEFINER -- Executa com permissões do criador (admin) para bypassar RLS da tabela base APENAS para esses campos
SET search_path = public -- Segurança: define search_path
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gl.patient_id,
        gl.total_points,
        gl.level,
        gl.current_streak,
        gl.display_name,
        gl.rank
    FROM 
        public.gamification_leaderboard gl
    ORDER BY 
        gl.rank ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard(INTEGER) TO authenticated;