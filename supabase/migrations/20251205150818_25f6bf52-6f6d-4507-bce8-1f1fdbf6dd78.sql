-- Insert common rehabilitation protocols
INSERT INTO public.exercise_protocols (name, condition_name, protocol_type, weeks_total, milestones, restrictions, progression_criteria) VALUES

-- LCA Protocol
('Protocolo Pós-Operatório LCA', 'Reconstrução do LCA', 'pos_operatorio', 24,
  '[
    {"week": 1, "description": "Controle de edema e dor, mobilização passiva do joelho 0-90°"},
    {"week": 2, "description": "Início de carga parcial com muletas, exercícios isométricos de quadríceps"},
    {"week": 4, "description": "Carga total progressiva, flexão ativa 0-120°, bicicleta ergométrica"},
    {"week": 6, "description": "Marcha sem muletas, fortalecimento em CCA"},
    {"week": 8, "description": "Exercícios em CCF, propriocepção básica"},
    {"week": 12, "description": "Corrida leve em esteira, agachamento parcial"},
    {"week": 16, "description": "Exercícios pliométricos leves, corrida em linha reta"},
    {"week": 20, "description": "Treino de agilidade, mudanças de direção"},
    {"week": 24, "description": "Retorno gradual ao esporte com avaliação funcional"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 6, "description": "Evitar hiperextensão do joelho"},
    {"week_start": 1, "week_end": 12, "description": "Evitar exercícios de cadeia aberta com carga"},
    {"week_start": 1, "week_end": 16, "description": "Evitar movimentos de rotação e pivô"},
    {"week_start": 1, "week_end": 24, "description": "Evitar esportes de contato"}
  ]'::jsonb,
  '[
    {"criteria": "Controle de dor e edema", "week": 2},
    {"criteria": "ADM completa de extensão", "week": 4},
    {"criteria": "Força de quadríceps >80% do lado sadio", "week": 12},
    {"criteria": "Hop test >85% do lado sadio", "week": 20}
  ]'::jsonb
),

-- Hip Replacement Protocol
('Protocolo Pós-Operatório Prótese de Quadril', 'Artroplastia Total de Quadril', 'pos_operatorio', 12,
  '[
    {"week": 1, "description": "Mobilização precoce, transferências, marcha com andador"},
    {"week": 2, "description": "Exercícios ativos assistidos, fortalecimento isométrico"},
    {"week": 3, "description": "Marcha com muletas, exercícios em decúbito"},
    {"week": 4, "description": "Subir escadas, exercícios de equilíbrio"},
    {"week": 6, "description": "Marcha com bengala, fortalecimento progressivo"},
    {"week": 8, "description": "Exercícios em pé, treino funcional"},
    {"week": 12, "description": "Alta para atividades normais com precauções"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 6, "description": "Evitar flexão do quadril >90°"},
    {"week_start": 1, "week_end": 6, "description": "Evitar adução além da linha média"},
    {"week_start": 1, "week_end": 6, "description": "Evitar rotação interna do quadril"},
    {"week_start": 1, "week_end": 12, "description": "Evitar cruzar as pernas"},
    {"week_start": 1, "week_end": 12, "description": "Usar assento elevado"}
  ]'::jsonb,
  '[
    {"criteria": "Marcha independente com auxiliar", "week": 2},
    {"criteria": "Subir/descer escadas com segurança", "week": 4},
    {"criteria": "Marcha sem auxiliar", "week": 8}
  ]'::jsonb
),

-- Cervicalgia Protocol  
('Protocolo Cervicalgia Crônica', 'Cervicalgia', 'patologia', 8,
  '[
    {"week": 1, "description": "Educação postural, exercícios de relaxamento, mobilização suave"},
    {"week": 2, "description": "Alongamentos cervicais, fortalecimento isométrico"},
    {"week": 3, "description": "Retração cervical, exercícios de estabilização"},
    {"week": 4, "description": "Fortalecimento de flexores profundos do pescoço"},
    {"week": 6, "description": "Exercícios de resistência progressiva, propriocepção"},
    {"week": 8, "description": "Programa de manutenção e autocuidado"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 4, "description": "Evitar movimentos bruscos da cervical"},
    {"week_start": 1, "week_end": 8, "description": "Evitar posições prolongadas de flexão cervical"}
  ]'::jsonb,
  '[
    {"criteria": "Redução da dor em 50%", "week": 2},
    {"criteria": "Melhora da ADM cervical", "week": 4},
    {"criteria": "Retorno às atividades normais", "week": 8}
  ]'::jsonb
),

-- Low Back Pain Protocol
('Protocolo Lombalgia Crônica', 'Lombalgia', 'patologia', 8,
  '[
    {"week": 1, "description": "Educação sobre dor, exercícios de respiração e relaxamento"},
    {"week": 2, "description": "Mobilização lombar suave, alongamentos básicos"},
    {"week": 3, "description": "Estabilização segmentar, ativação do core"},
    {"week": 4, "description": "Exercícios de ponte, prancha modificada"},
    {"week": 5, "description": "Fortalecimento de extensores lombares"},
    {"week": 6, "description": "Exercícios funcionais, agachamento"},
    {"week": 8, "description": "Programa de exercícios de manutenção"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 4, "description": "Evitar flexão lombar com carga"},
    {"week_start": 1, "week_end": 6, "description": "Evitar atividades de alto impacto"}
  ]'::jsonb,
  '[
    {"criteria": "Capacidade de manter postura neutra", "week": 3},
    {"criteria": "Prancha por 30 segundos", "week": 4},
    {"criteria": "Retorno às atividades funcionais", "week": 8}
  ]'::jsonb
),

-- Shoulder Tendinitis Protocol
('Protocolo Tendinopatia de Ombro', 'Tendinopatia do Manguito Rotador', 'patologia', 12,
  '[
    {"week": 1, "description": "Controle de dor, exercícios pendulares, crioterapia"},
    {"week": 2, "description": "ADM passiva e ativa assistida"},
    {"week": 3, "description": "Exercícios de fortalecimento isométrico"},
    {"week": 4, "description": "Fortalecimento com faixa elástica leve"},
    {"week": 6, "description": "Exercícios de rotação externa/interna"},
    {"week": 8, "description": "Fortalecimento excêntrico progressivo"},
    {"week": 10, "description": "Exercícios funcionais e específicos"},
    {"week": 12, "description": "Retorno às atividades com orientações"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 4, "description": "Evitar elevação acima de 90°"},
    {"week_start": 1, "week_end": 6, "description": "Evitar movimentos de impacto"},
    {"week_start": 1, "week_end": 8, "description": "Evitar carga excessiva"}
  ]'::jsonb,
  '[
    {"criteria": "Redução significativa da dor", "week": 4},
    {"criteria": "ADM funcional recuperada", "week": 6},
    {"criteria": "Força >80% do lado contralateral", "week": 10}
  ]'::jsonb
),

-- Pes Anserinus Protocol
('Protocolo Síndrome da Pata de Ganso', 'Síndrome da Pata de Ganso', 'patologia', 6,
  '[
    {"week": 1, "description": "Repouso relativo, crioterapia, alongamentos leves"},
    {"week": 2, "description": "Alongamentos de isquiotibiais e adutores"},
    {"week": 3, "description": "Fortalecimento isométrico de quadríceps"},
    {"week": 4, "description": "Exercícios em cadeia fechada"},
    {"week": 5, "description": "Fortalecimento progressivo, propriocepção"},
    {"week": 6, "description": "Retorno gradual às atividades"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 3, "description": "Evitar atividades que causem dor"},
    {"week_start": 1, "week_end": 4, "description": "Evitar corrida e impacto"}
  ]'::jsonb,
  '[
    {"criteria": "Ausência de dor à palpação", "week": 2},
    {"criteria": "Subir escadas sem dor", "week": 4}
  ]'::jsonb
),

-- Ankle Sprain Protocol
('Protocolo Entorse de Tornozelo', 'Entorse de Tornozelo Grau II', 'patologia', 6,
  '[
    {"week": 1, "description": "PRICE (Proteção, Repouso, Gelo, Compressão, Elevação)"},
    {"week": 2, "description": "Mobilização precoce, exercícios de ADM"},
    {"week": 3, "description": "Fortalecimento com faixa elástica"},
    {"week": 4, "description": "Propriocepção em superfície estável"},
    {"week": 5, "description": "Propriocepção em superfície instável, treino funcional"},
    {"week": 6, "description": "Retorno ao esporte com uso de tornozeleira"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 2, "description": "Evitar carga total no tornozelo"},
    {"week_start": 1, "week_end": 4, "description": "Evitar inversão forçada"}
  ]'::jsonb,
  '[
    {"criteria": "Carga total sem dor", "week": 2},
    {"criteria": "Equilíbrio unipodal 30s", "week": 4},
    {"criteria": "Hop test funcional", "week": 6}
  ]'::jsonb
),

-- Tennis Elbow Protocol
('Protocolo Epicondilite Lateral', 'Cotovelo de Tenista', 'patologia', 8,
  '[
    {"week": 1, "description": "Repouso relativo, uso de órtese, crioterapia"},
    {"week": 2, "description": "Alongamentos de extensores do punho"},
    {"week": 3, "description": "Exercícios isométricos de extensores"},
    {"week": 4, "description": "Fortalecimento concêntrico leve"},
    {"week": 5, "description": "Exercícios excêntricos progressivos"},
    {"week": 6, "description": "Aumento de carga, exercícios funcionais"},
    {"week": 8, "description": "Retorno às atividades com modificações"}
  ]'::jsonb,
  '[
    {"week_start": 1, "week_end": 4, "description": "Evitar atividades que causem dor"},
    {"week_start": 1, "week_end": 6, "description": "Evitar preensão forte"}
  ]'::jsonb,
  '[
    {"criteria": "Preensão sem dor", "week": 4},
    {"criteria": "Força de preensão >80%", "week": 6}
  ]'::jsonb
)

ON CONFLICT DO NOTHING;