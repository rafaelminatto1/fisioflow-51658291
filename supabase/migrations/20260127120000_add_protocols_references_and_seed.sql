-- Add references column to exercise_protocols table
ALTER TABLE exercise_protocols 
ADD COLUMN IF NOT EXISTS "references" jsonb DEFAULT '[]'::jsonb;

-- Seed high-quality protocols
INSERT INTO exercise_protocols (
    name, 
    condition_name, 
    protocol_type, 
    weeks_total, 
    milestones, 
    restrictions, 
    progression_criteria, 
    "references",
    clinical_tests,
    organization_id
) VALUES 
-- 1. LCA (ACL) Reconstruction - Hamstring Graft
(
    'Reconstrução de LCA (Enxerto Isquiotibiais)',
    'Rotura de Ligamento Cruzado Anterior',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Controle de dor e edema, ADM 0-90°, ativação de quadríceps"},
        {"week": 4, "description": "Marcha normal sem muletas, ADM completa, fortalecimento CCF"},
        {"week": 12, "description": "Início de corrida, saltos leves, fortalecimento intenso"},
        {"week": 24, "description": "Retorno ao esporte (critérios de alta)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Sem cadeia cinética aberta (CCA) de quadríceps em ângulos finais (90-0°)"},
        {"week_start": 0, "week_end": 2, "description": "Uso de muletas até controle de quadríceps"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Extensão total igual ao lado contralateral"},
        {"type": "Strength", "value": "Sem lag de extensão em SLR"},
        {"type": "Functional", "value": "Marcha sem claudicação"}
    ]'::jsonb,
    '[
        {"title": "Anterior Cruciate Ligament Reconstruction Rehabilitation: MOON Guidelines", "authors": "Wright RW et al.", "year": 2015, "journal": "Sports Health", "url": "https://journals.sagepub.com/doi/10.1177/1941738114538372"},
        {"title": "Rehabilitation after ACL reconstruction: a scientific basis", "authors": "Van Melick N et al.", "year": 2016, "journal": "Knee Surg Sports Traumatol Arthrosc"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL -- No specific organization (system global)
),

-- 2. LCA (ACL) Reconstruction - Patellar Tendon Graft
(
    'Reconstrução de LCA (Tendão Patelar)',
    'Rotura de Ligamento Cruzado Anterior',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Foco em extensão completa imediata, controle de dor anterior"},
        {"week": 6, "description": "Fortalecimento excêntrico progressivo, propriocepção avançada"},
        {"week": 16, "description": "Treino pliométrico, mudanças de direção"},
        {"week": 24, "description": "Testes funcionais para retorno (Hop Tests > 90%)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Cuidado com dor anterior no joelho (sítio doadora)"},
        {"week_start": 0, "week_end": 4, "description": "Evitar agachamento profundo (>90°) com carga excessiva"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Dor < 2/10 na escala visual"},
        {"type": "Effusion", "value": "Sem derrame articular"}
    ]'::jsonb,
    '[
        {"title": "Current Concepts for Anterior Cruciate Ligament Reconstruction: A Criterion-Based Rehabilitation Progression", "authors": "Adams D et al.", "year": 2012, "journal": "JOSPT"},
        {"title": "Patellar tendon versus hamstring tendon autograft for anterior cruciate ligament rupture in adults", "authors": "Mouzopoulos G et al.", "year": 2021, "journal": "Cochrane Database Syst Rev"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 3. Meniscectomy (Partial)
(
    'Meniscectomia Parcial (Artroscopia)',
    'Lesão de Menisco',
    'pos_operatorio',
    8,
    '[
        {"week": 1, "description": "Carga conforme tolerado, ADM livre, analgesia"},
        {"week": 2, "description": "Bicicleta, elíptico, fortalecimento global"},
        {"week": 4, "description": "Início de trote, agachamentos funcionais"},
        {"week": 8, "description": "Retorno total a atividades de impacto"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 1, "description": "Evitar impacto excessivo"},
        {"week_start": 0, "week_end": 2, "description": "Respeitar dor e derrame"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "ADM completa e indolor"},
        {"type": "Strength", "value": "Força de 90% do contralateral"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation following meniscectomy", "authors": "Brindle T et al.", "year": 2001, "journal": "J Athl Train"},
        {"title": "Exercise therapy for meniscal tears: a systematic review", "authors": "Kise NJ et al.", "year": 2016, "journal": "BMJ"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 4. Meniscus Repair
(
    'Sutura de Menisco (Reparo)',
    'Lesão de Menisco (Reparável)',
    'pos_operatorio',
    20,
    '[
        {"week": 1, "description": "Carga parcial/restrita, Brace em extensão, ADM 0-90°"},
        {"week": 6, "description": "Carga total, retirada do brace, ADM progressiva > 90°"},
        {"week": 12, "description": "Início de agachamentos profundos, trote leve"},
        {"week": 20, "description": "Retorno ao esporte gradual"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Não fletir com carga > 90°"},
        {"week_start": 0, "week_end": 4, "description": "Sem pivoteio ou torção com carga"}
    ]'::jsonb,
    '[
        {"type": "Healing", "value": "Sem dor na linha articular"},
        {"type": "Functional", "value": "Salto unipodal indolor"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation Following Meniscal Repair", "authors": "Spang RC III et al.", "year": 2018, "journal": "Low Extrem Rev"},
        {"title": "Meniscal Repair Rehabilitation Guidelines", "authors": "Vanderbilt Sports Medicine", "year": 2019, "journal": "Protocol"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 5. Total Knee Arthroplasty (TKA)
(
    'Artroplastia Total de Joelho (ATJ)',
    'Osteoartrose de Joelho',
    'pos_operatorio',
    16,
    '[
        {"week": 1, "description": "Mobilização precoce, treino de marcha com andador, extensão terminal"},
        {"week": 4, "description": "Marcha independente ou bengala, ADM 0-110°, subir escadas"},
        {"week": 8, "description": "Fortalecimento funcional, equilíbrio, ADM 0-120°"},
        {"week": 16, "description": "Atividades de recreação (golfe, natação), alta"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "Evitar esportes de alto impacto (corrida, saltos)"},
        {"week_start": 0, "week_end": 4, "description": "Cuidado com cicatrização da ferida operatória"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Pelo menos 0-110°"},
        {"type": "Functional", "value": "Timed Up and Go (TUG) < 10s"}
    ]'::jsonb,
    '[
        {"title": "Clinical Practice Guidelines for Rehabilitation of the Patient with Total Knee Arthroplasty", "authors": "Jette DU et al.", "year": 2020, "journal": "Physical Therapy"},
        {"title": "Rehabilitation protocols following total knee arthroplasty: a review of study designs and outcome measures", "authors": "Artz N et al.", "year": 2015}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 6. Rotator Cuff Repair (Small/Medium Tear)
(
    'Reparo do Manguito Rotador (Pequeno/Médio)',
    'Rotura do Manguito Rotador',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Tipoia (Sling), pendular, cotovelo/punho"},
        {"week": 6, "description": "Retirada da tipoia, ADM ativa assistida, isometria"},
        {"week": 12, "description": "Fortalecimento isotônico leve, controle escapular"},
        {"week": 24, "description": "Retorno a atividades acima da cabeça"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Sem elevação ativa do braço (AAROM apenas)"},
        {"week_start": 0, "week_end": 12, "description": "Sem levantamento de peso > 1kg"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "ADM passiva completa antes de fortalecer"},
        {"type": "Pain", "value": "Movimento indolor"}
    ]'::jsonb,
    '[
        {"title": "Consensus Statement on Rehabilitation Following Arthroscopic Rotator Cuff Repair", "authors": "Thigpen CA et al.", "year": 2016, "journal": "JOSPT"},
        {"title": "Rehabilitation after Rotator Cuff Repair", "authors": "Conti M et al.", "year": 2015, "journal": "Knee Surg Sports Traumatol Arthrosc"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 7. Rotator Cuff Repair (Massive Tear)
(
    'Reparo do Manguito Rotador (Massiva)',
    'Rotura Massiva do Manguito Rotador',
    'pos_operatorio',
    32,
    '[
        {"week": 1, "description": "Tipoia por 6-8 semanas, mobilização cervical/punho"},
        {"week": 8, "description": "Início ADM passiva lenta, piscina terapêutica"},
        {"week": 16, "description": "Início ADM ativa assistida, fortalecimento deltoide/escápula"},
        {"week": 32, "description": "Fortalecimento progressivo, retorno funcional limitado"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "Extrema cautela com ADM ativa"},
        {"week_start": 0, "week_end": 24, "description": "Evitar movimentos bruscos acima da cabeça"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Funcional (pode não ser total)"},
        {"type": "Strength", "value": "Capacidade de elevar braço sem dor"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation following massive rotator cuff repair: a review", "authors": "Collin P et al.", "year": 2014, "journal": "Orthop Traumatol Surg Res"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 8. Bankart Repair (Shoulder Instability)
(
    'Reparo de Bankart (Instabilidade Anterior)',
    'Luxação Recidivante de Ombro',
    'pos_operatorio',
    20,
    '[
        {"week": 1, "description": "Tipoia 4-6 semanas, evitar rotação externa e abdução combinadas"},
        {"week": 6, "description": "ADM ativa progressiva, fortalecimento manguito (neutro)"},
        {"week": 12, "description": "Fortalecimento em posições mais vulneráveis controladas"},
        {"week": 20, "description": "Retorno ao esporte (colisão apenas após 6 meses)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Rotação externa limitada a 30°"},
        {"week_start": 0, "week_end": 12, "description": "Evitar posição de ''High Five'' (Abdução + RE máxima)"}
    ]'::jsonb,
    '[
        {"type": "Stability", "value": "Teste de Apreensão negativo"},
        {"type": "Strength", "value": "Força simétrica rotadores"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation After Arthroscopic Bankart Repair", "authors": "Gaunt BW et al.", "year": 2010, "journal": "Sports Health"},
        {"title": "Shoulder instability rehabilitation", "authors": "Jaggi A et al.", "year": 2017}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 9. Superior Labral Tear from Anterior to Posterior (SLAP) Repair
(
    'Reparo de SLAP (Tipo II)',
    'Lesão Labral Superior (SLAP)',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Tipoia 4 semanas, evitar tensão no bíceps"},
        {"week": 6, "description": "ADM completa, isometria leve"},
        {"week": 10, "description": "Início de fortalecimento de bíceps leve"},
        {"week": 24, "description": "Retorno arremesso/atividade overhead"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 8, "description": "Sem contração ativa de bíceps (fletir cotovelo contra resistência)"},
        {"week_start": 0, "week_end": 4, "description": "Limitar rotação externa"}
    ]'::jsonb,
    '[
        {"type": "Strength", "value": "Bíceps indolor e forte"},
        {"type": "Function", "value": "Mecanismo de arremesso correto"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation Guidelines for SLAP Lesion Repair Type II", "authors": "Wilk KE et al.", "year": 2005, "journal": "JOSPT"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 10. Latarjet Procedure
(
    'Procedimento de Latarjet',
    'Instabilidade Glenoumeral com Perda Óssea',
    'pos_operatorio',
    16,
    '[
        {"week": 1, "description": "Tipoia, mov passivo imediato (mais agressivo que Bankart)"},
        {"week": 4, "description": "ADM ativa assistida, consolidação óssea iniciando"},
        {"week": 8, "description": "Fortalecimento progressivo"},
        {"week": 16, "description": "Retorno a esporte de contato (se consolidação confirmada)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Respeitar cicatrização óssea (coracóide)"}
    ]'::jsonb,
    '[
        {"type": "Imaging", "value": "Consolidação óssea ao Raio-X/TC"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation Following the Latarjet Procedure", "authors": "Waltrip RL et al.", "year": 2019}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 11. Achilles Tendon Repair
(
    'Reparo do Tendão de Aquiles',
    'Rotura do Tendão de Aquiles',
    'pos_operatorio',
    26,
    '[
        {"week": 1, "description": "Bota ortopédica (equino), sem carga ou carga parcial"},
        {"week": 4, "description": "Progressão para plantígrado, carga total com bota"},
        {"week": 8, "description": "Retirada da bota, fortalecimento panturrilha (sentado)"},
        {"week": 12, "description": "Fortalecimento em pé (bilateral -> unilateral)"},
        {"week": 20, "description": "Retorno corrida e pliometria"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Evitar dorsiflexão passiva forçada"},
        {"week_start": 0, "week_end": 12, "description": "Evitar alongamento agressivo"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Single Leg Heel Raise (>20 reps)"},
        {"type": "ROM", "value": "Dorsiflexão simétrica"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation after Achilles tendon rupture", "authors": "Silbernagel KG et al.", "year": 2020, "journal": "BJSM"},
        {"title": "Achilles Tendon Rupture Rehabilitation Protocol", "authors": "Chiodo CP et al.", "year": 2010}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 12. Achilles Tendinopathy (Conservative)
(
    'Tendinopatia de Aquiles (Alfredson)',
    'Tendinopatia de Aquiles',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Controle de carga, isometria para analgesia"},
        {"week": 2, "description": "Protocolo de Alfredson (Excêntrico) ou Silbernagel (Heavy Slow)"},
        {"week": 6, "description": "Introdução de pliometria leve"},
        {"week": 12, "description": "Manutenção e retorno total"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar picos de carga compressiva em insercional"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Dor matinal reduzida"},
        {"type": "Function", "value": "VISA-A Score > 80"}
    ]'::jsonb,
    '[
        {"title": "Heavy Slow Resistance versus Eccentric Training for Achilles Tendinopathy", "authors": "Beyer R et al.", "year": 2015, "journal": "Am J Sports Med"},
        {"title": "Achilles Tendinopathy: Current Concepts", "authors": "Cook JL et al.", "year": 2016}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 13. Ankle Sprain (Lateral) - Conservative
(
    'Entorse de Tornozelo (Grau II/III)',
    'Entorse Lateral do Tornozelo',
    'patologia',
    8,
    '[
        {"week": 1, "description": "POLICE (Protection, Optimal Loading, Ice...), ADM livre sem dor"},
        {"week": 2, "description": "Fortalecimento fibulares, propriocepção estática"},
        {"week": 4, "description": "Propriocepção dinâmica, trote"},
        {"week": 8, "description": "Esporte com proteção (taping/brace)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar mecanismo de lesão (inversão forçada)"}
    ]'::jsonb,
    '[
        {"type": "Test", "value": "Star Excursion Balance Test (SEBT) simétrico"},
        {"type": "Safety", "value": "Sem instabilidade subjetiva"}
    ]'::jsonb,
    '[
        {"title": "Diagnosis, prevention and treatment of common ankle sprains", "authors": "Vuurberg G et al.", "year": 2018, "journal": "ROAG Guideline / BJSM"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 14. Plantar Fasciitis
(
    'Fascite Plantar (Conservador)',
    'Fascite Plantar',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Alongamento fáscia/panturrilha, palmilhas, gelo"},
        {"week": 4, "description": "Fortalecimento intrínsecos do pé, Rathleff protocol (High Load)"},
        {"week": 8, "description": "Retorno gradual a volume de corrida/caminhada"},
        {"week": 12, "description": "Prevenção de recidiva"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar caminhar descalço"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Dor ao primeiro passo da manhã ausente"}
    ]'::jsonb,
    '[
        {"title": "High-load strength training improves outcome in patients with plantar fasciitis", "authors": "Rathleff MS et al.", "year": 2015, "journal": "Scand J Med Sci Sports"},
        {"title": "Clinical Practice Guidelines: Heel Pain - Plantar Fasciitis", "authors": "Martin RL et al.", "year": 2014, "journal": "JOSPT"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 15. Total Hip Arthroplasty (THA) - Posterior Approach
(
    'Artroplastia Total de Quadril (Via Posterior)',
    'Coxartrose',
    'pos_operatorio',
    12,
    '[
        {"week": 1, "description": "Marcha com andador, cuidados luxação, isometria glúteo"},
        {"week": 4, "description": "Marcha independente/bengala, fortalecimento abdutores"},
        {"week": 8, "description": "Treino de marcha avançado, funcionais básicos"},
        {"week": 12, "description": "Alta para atividades leves"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Precauções: Flexão > 90°, Adução além da linha média, Rotação Interna"}
    ]'::jsonb,
    '[
        {"type": "Safety", "value": "Conhecimento das precauções"},
        {"type": "Function", "value": "Marcha segura sem claudicação de Trendelenburg"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation protocols after total hip arthroplasty", "authors": "Di Monaco M et al.", "year": 2009},
        {"title": "Physical Activity after Total Hip Arthroplasty", "authors": "Dorr LD et al."}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 16. Total Hip Arthroplasty (THA) - Anterior Approach
(
    'Artroplastia Total de Quadril (Via Anterior)',
    'Coxartrose',
    'pos_operatorio',
    12,
    '[
        {"week": 1, "description": "Marcha imediata, menos restrições, foco em extensão"},
        {"week": 3, "description": "Normalização da marcha rápida, fortalecimento geral"},
        {"week": 8, "description": "Retorno funcional completo"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar extensão excessiva + rotação externa"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Retorno rápido a AVDs"}
    ]'::jsonb,
    '[
        {"title": "Anterior approach total hip arthroplasty rehabilitation", "authors": "Various", "year": 2018}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 17. Femoroacetabular Impingement (FAI) - Arthroscopy
(
    'Artroscopia de Quadril (IFA)',
    'Impacto Femoroacetabular',
    'pos_operatorio',
    16,
    '[
        {"week": 1, "description": "Carga parcial 2-4 semanas, evitar flexão > 90°, bicicleta leve"},
        {"week": 4, "description": "Início fortalecimento glúteo/core, normalizar marcha"},
        {"week": 10, "description": "Corrida linear, agachamento controlado"},
        {"week": 16, "description": "Retorno ao esporte com cortes e giros"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Evitar flexão de quadril ativa (Tendinite Psoas)"},
        {"week_start": 0, "week_end": 4, "description": "Rotação externa limitada"}
    ]'::jsonb,
    '[
        {"type": "Strength", "value": "Força adutores/abdutores simétrica"},
        {"type": "Pain", "value": "Teste de FADIR negativo/indolor"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation after Hip Arthroscopy", "authors": "Griffin DR et al.", "year": 2016, "journal": "Warwick Agreement"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 18. Hamstring Strain (Grade II)
(
    'Lesão Muscular Isquiotibiais (Grau II)',
    'Estiramento de Isquiotibiais',
    'patologia',
    8,
    '[
        {"week": 1, "description": "Gelo, compressão, mobilização indolor, isometria"},
        {"week": 3, "description": "Excêntrico leve (Lengen-then-Load), corrida leve"},
        {"week": 6, "description": "Sprints progressivos, nórdicos (Nordic Hamstring)"},
        {"week": 8, "description": "Retorno competição"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar alongamento estático agressivo"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Askling H-Test negativo"},
        {"type": "Strength", "value": "Simetria dinamômetro"}
    ]'::jsonb,
    '[
        {"title": "Acute hamstring injuries: a clinical update", "authors": "Heiderscheit BC et al.", "year": 2010, "journal": "JOSPT"},
        {"title": "Aspetar Hamstring Protocol", "authors": "Tol JL et al.", "year": 2014}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 19. Patellofemoral Pain Syndrome (PFPS)
(
    'Síndrome da Dor Patelofemoral',
    'Condromalácia / Dor Anterior',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Redução de volume de carga, fortalecimento quadril (glúteo medio)"},
        {"week": 4, "description": "Fortalecimento quadríceps (cadeia fechada > aberta, ângulos indolores)"},
        {"week": 8, "description": "Controle motor, reeducação de marcha/corrida"},
        {"week": 12, "description": "Retorno pleno"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar agachamento profundo se doloroso"}
    ]'::jsonb,
    '[
        {"type": "Score", "value": "Kujala Score > 85"}
    ]'::jsonb,
    '[
        {"title": "Consensus Statement on Exercise Therapy for Patellofemoral Pain", "authors": "Crossley KM et al.", "year": 2016, "journal": "BJSM"},
        {"title": "Hip and Knee Strengthening for PFPS", "authors": "Lack S et al.", "year": 2018}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 20. Low Back Pain (Nonspecific) - Motor Control
(
    'Lombalgia Inespecífica (Controle Motor)',
    'Dor Lombar Crônica',
    'patologia',
    10,
    '[
        {"week": 1, "description": "Ativação de transverso/multifidus, dissociação pélvica"},
        {"week": 4, "description": "Progressão de pranchas, Bird-Dog, Deadbug"},
        {"week": 8, "description": "Integração funcional (agachamento, levantamento terra leve)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar medo do movimento (Cinesiofobia)"}
    ]'::jsonb,
    '[
        {"type": "Score", "value": "Oswestry < 20%"}
    ]'::jsonb,
    '[
        {"title": "Motor control exercises for chronic low back pain", "authors": "Saragiotto BT et al.", "year": 2016, "journal": "Cochrane"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 21. Lumbar Disc Herniation (Conservative)
(
    'Hérnia Discal Lombar (Conservador/McKenzie)',
    'Radiculopatia Lombar',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Centralização da dor (Extensão repetida ou direção preferencial)"},
        {"week": 3, "description": "Estabilização neutra, mobilização neural"},
        {"week": 8, "description": "Fortalecimento core e membros inferiores"},
        {"week": 12, "description": "Prevenção e ergonomia"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar flexão lombar sustentada (sentar por longos períodos)"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Centralização completa (sem dor na perna)"}
    ]'::jsonb,
    '[
        {"title": "Mechanical Diagnosis and Therapy (MDT)", "authors": "McKenzie R"},
        {"title": "Diagnosis and treatment of lumbar disc herniation", "authors": "Kreiner DS et al.", "year": 2014, "journal": "NASS Guidelines"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 22. Spinal Fusion (Lumbar)
(
    'Artrodese Lombar',
    'Espondilolistese / Instabilidade',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Marcha assistida, log roll para deitar/levantar"},
        {"week": 6, "description": "Início fisioterapia ativa leve, estabilização"},
        {"week": 12, "description": "Fortalecimento progressivo, caminhada longa"},
        {"week": 24, "description": "Retorno atividades pesadas (se consolidado)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "No BLT (No Bending, Lifting, Twisting)"}
    ]'::jsonb,
    '[
        {"type": "Imaging", "value": "Fusão confirmada"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation after Lumbar Fusion", "authors": "Abbott A et al.", "year": 2010}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 23. Neck Pain (Mechanical)
(
    'Cervicalgia Mecânica',
    'Dor Cervical',
    'patologia',
    6,
    '[
        {"week": 1, "description": "Mobilidade torácica, retração cervical, calor/massagem"},
        {"week": 3, "description": "Fortalecimento flexores profundos e escapulares"},
        {"week": 6, "description": "Ergonomia e manutenção"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar posturas prolongadas"}
    ]'::jsonb,
    '[
        {"type": "Score", "value": "NDI (Neck Disability Index) < 10%"}
    ]'::jsonb,
    '[
        {"title": "Neck Pain: Clinical Practice Guidelines", "authors": "Blanpied PR et al.", "year": 2017, "journal": "JOSPT"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 24. Lateral Epicondylitis (Tennis Elbow)
(
    'Epicondilite Lateral',
    'Cotovelo de Tenista',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Repouso relativo, órtese de contra-força, isometria punho"},
        {"week": 4, "description": "Mobilização neural, massagem transversa, excêntrico punho"},
        {"week": 8, "description": "Fortalecimento ombro/escápula, retorno gradual esporte"},
        {"week": 12, "description": "Ajuste de equipamento (raquete, mouse)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar preensão forte repetitiva"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Teste de Cozen negativo"}
    ]'::jsonb,
    '[
        {"title": "Physical therapy management of lateral epicondylalgia", "authors": "Coombes BK et al.", "year": 2015}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 25. Carpal Tunnel Release
(
    'Liberação do Túnel do Carpo',
    'Síndrome do Túnel do Carpo',
    'pos_operatorio',
    8,
    '[
        {"week": 1, "description": "Elevação, movimento dedos, controle de cicatriz"},
        {"week": 3, "description": "Fortalecimento leve de preensão, desensibilização"},
        {"week": 6, "description": "Retorno trabalho manual leve"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar força de preensão máxima"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Sensibilidade normal, força recuperada"}
    ]'::jsonb,
    '[
        {"title": "Post-operative rehabilitation for carpal tunnel release", "authors": "Peters S et al.", "year": 2016}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 26. Distal Radius Fracture (ORIF)
(
    'Fratura de Rádio Distal (Fixação Interna)',
    'Fratura de Punho',
    'pos_operatorio',
    12,
    '[
        {"week": 1, "description": "Tala/Órtese, edema control, movimento dedos/ombro"},
        {"week": 2, "description": "Início ADM punho (se estável), supinação/pronação"},
        {"week": 6, "description": "Fortalecimento progressivo (massinha, pesinhos)"},
        {"week": 12, "description": "Carga total (apoio de mão)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Sem carga de peso sobre a mão"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Funcional para AVDs"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation of Distal Radius Fractures", "authors": "Quadlbauer S et al.", "year": 2020}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 27. Frozen Shoulder (Adhesive Capsulitis)
(
    'Capsulite Adesiva (Congelamento)',
    'Ombro Congelado',
    'patologia',
    24,
    '[
        {"week": 1, "description": "Fase dolorosa: Analgesia, movimento suave, injeção corticoide? (Ref médico)"},
        {"week": 8, "description": "Fase congelada: Mobilização articular, alongamento sustentado"},
        {"week": 16, "description": "Fase descongelamento: Ganho ADM agressivo, fortalecimento"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 8, "description": "Não forçar na fase inflamatória (risco de piora)"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Recuperação lenta mas constante"}
    ]'::jsonb,
    '[
        {"title": "Shoulder pain and mobility deficits: Adhesive capsulitis", "authors": "Kelley MJ et al.", "year": 2013, "journal": "JOSPT Guidelines"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 28. Acromioclavicular Joint Repiar
(
    'Reconstrução Articulação Acromioclavicular (AC)',
    'Luxação AC Grau III-V',
    'pos_operatorio',
    20,
    '[
        {"week": 1, "description": "Tipoia estrita 6 semanas, mobilização cotovelo"},
        {"week": 6, "description": "ADM passiva ombro limitada (90°)"},
        {"week": 12, "description": "Fortalecimento ativo, ADM total"},
        {"week": 20, "description": "Retorno esporte contato"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Sem elevação ativa ou adução cruzada"}
    ]'::jsonb,
    '[
        {"type": "Structure", "value": "Estabilidade AC mantida"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation following acromioclavicular joint reconstruction", "authors": "Cote MP et al.", "year": 2016}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 29. Proximal Humerus Fracture
(
    'Fratura de Úmero Proximal (Conservador)',
    'Fratura de Ombro',
    'patologia',
    16,
    '[
        {"week": 1, "description": "Tipoia, pendular, cotovelo"},
        {"week": 4, "description": "Início ADM passiva/ativa assistida (conforme calo ósseo)"},
        {"week": 8, "description": "Ativo livre, fortalecimento leve"},
        {"week": 16, "description": "Função normal"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Imobilização relativa"}
    ]'::jsonb,
    '[
        {"type": "Imaging", "value": "Consolidação RX"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation of proximal humerus fractures", "authors": "Srivastava A et al.", "year": 2017}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 30. Total Shoulder Arthroplasty (Anatomic)
(
    'Artroplastia Total de Ombro (Anatômica)',
    'Osteoartrose de Ombro',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Tipoia 4 semanas, ADM passiva restrita (RE < 30)"},
        {"week": 4, "description": "ADM ativa assistida"},
        {"week": 10, "description": "Fortalecimento manguito/deltoide"},
        {"week": 24, "description": "Alta funcional"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Proteger reparo do subescapular (evitar RE forçada e extensão)"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "Elevação > 140°"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation following total shoulder arthroplasty", "authors": "Wilk KE et al.", "year": 2016}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),
-- 31. Reverse Total Shoulder Arthroplasty
(
    'Artroplastia Reversa de Ombro',
    'Artropatia do Manguito',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Tipoia 4-6 semanas, foco em Deltoide"},
        {"week": 6, "description": "ADM ativa leve, recrutamento deltoide"},
        {"week": 12, "description": "Fortalecimento funcional"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "Evitar extensão + adução + rotação interna (risco luxação)"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Boca-Mão funcional"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation following reverse total shoulder arthroplasty", "authors": "Boudreau S et al.", "year": 2007}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 32. Hip Adductor Strain (Groin Pain)
(
    'Distensão de Adutores (Pubalgia)',
    'Dor Inguinal do Atleta',
    'patologia',
    10,
    '[
        {"week": 1, "description": "Isometria adutores (copenhagen nível 1), core"},
        {"week": 4, "description": "Copenhagen Plank progressivo, mudanças de direção"},
        {"week": 8, "description": "Chute, pliometria específica"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar abertura excessiva da perna com dor"}
    ]'::jsonb,
    '[
        {"type": "Strength", "value": "Squeeze Test indolor"}
    ]'::jsonb,
    '[
        {"title": "Doha agreement meeting on terminology and definitions in groin pain in athletes", "authors": "Weir A et al.", "year": 2015, "journal": "BJSM"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 33. Osteoarthritis Knee (Conservative)
(
    'Osteoartrose de Joelho (Conservador)',
    'Gonartrose',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Educação, perda de peso, fortalecimento quadríceps"},
        {"week": 4, "description": "Caminhada, bicicleta, exercícios funcionais (GLAAD)"},
        {"week": 12, "description": "Manutenção a longo prazo"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "Evitar imobilidade"}
    ]'::jsonb,
    '[
        {"type": "Score", "value": "WOMAC reduzido"}
    ]'::jsonb,
    '[
        {"title": "OARSI guidelines for the non-surgical management of knee osteoarthritis", "authors": "McAlindon TE et al.", "year": 2014}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 34. IT Band Syndrome
(
    'Síndrome da Banda Iliotibial',
    'Joelho do Corredor (Lateral)',
    'patologia',
    8,
    '[
        {"week": 1, "description": "Redução carga corrida, liberação miofascial TFL/Glúteo"},
        {"week": 3, "description": "Fortalecimento abdutores quadril e core"},
        {"week": 6, "description": "Retorno progressivo corrida, ajuste de cadência"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar descidas e pistas inclinadas"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Teste de Noble negativo"}
    ]'::jsonb,
    '[
        {"title": "Iliotibial Band Syndrome: Evaluation and Management", "authors": "Baker RL et al.", "year": 2016}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 35. Shin Splints (Medial Tibial Stress Syndrome)
(
    'Canelite (Síndrome do Estresse Tibial Medial)',
    'Periostite Tibial',
    'patologia',
    8,
    '[
        {"week": 1, "description": "Repouso relativo, gelo, palmilhas?"},
        {"week": 3, "description": "Fortalecimento tibial posterior/solear, controle de pronação"},
        {"week": 6, "description": "Programa de retorno à corrida (Run-Walk)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Evitar impacto repetitivo"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Palpação indolor da borda medial da tíbia"}
    ]'::jsonb,
    '[
        {"title": "Medial Tibial Stress Syndrome: A Review", "authors": "Winters M et al.", "year": 2017}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 36. Turf Toe
(
    'Entorse da 1ª Metatarsofalangeana (Turf Toe)',
    'Hiperextensão do Hálux',
    'patologia',
    6,
    '[
        {"week": 1, "description": "Palmilha rígida, taping, gelo"},
        {"week": 3, "description": "ADM ativa, fortalecimento intrínsecos"},
        {"week": 6, "description": "Retorno esporte com proteção"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Evitar hiperextensão do dedão"}
    ]'::jsonb,
    '[
        {"type": "Function", "value": "Impulsão sem dor"}
    ]'::jsonb,
    '[
        {"title": "Turf Toe Injuries", "authors": "McCormick JJ et al.", "year": 2010}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 37. Hamstring Strain (Grade I)
(
    'Lesão Muscular Isquiotibiais (Grau I)',
    'Estiramento Leve',
    'patologia',
    3,
    '[
        {"week": 1, "description": "Movimento precoce, trote leve se indolor"},
        {"week": 2, "description": "Fortalecimento excêntrico, retorno rápido"}
    ]'::jsonb,
    '[]'::jsonb,
    '[
        {"type": "Pain", "value": "Sem dor ao alongamento"}
    ]'::jsonb,
    '[
        {"title": "Hamstring Rehabilitation", "authors": "Askling C et al."}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 38. Stroke Rehabilitation (Subacute)
(
    'Reabilitação Pós-AVC (Fase Subagúa)',
    'Acidente Vascular Encefálico',
    'patologia',
    24,
    '[
        {"week": 1, "description": "Treino de marcha com suporte, sentar-levantar, neuroplasticidade (repetição)"},
        {"week": 8, "description": "Treino de equilíbrio, uso do membro afetado (CIMT)"},
        {"week": 24, "description": "Independência em AVDs"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 24, "description": "Prevenção de quedas é prioridade"}
    ]'::jsonb,
    '[
        {"type": "Score", "value": "Escala de Berg > 45"}
    ]'::jsonb,
    '[
        {"title": "Stroke Rehabilitation Clinical Practice Guidelines", "authors": "Winstein CJ et al.", "year": 2016, "journal": "AHA/ASA"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 39. Parkinson's Disease (Early Stage)
(
    'Doença de Parkinson (Estágio Inicial)',
    'Parkinson',
    'patologia',
    0,
    '[
        {"week": 1, "description": "Exercícios de grande amplitude (BIG), pistas visuais/auditivas"},
        {"week": 8, "description": "Treino de dupla tarefa, equilíbrio, marcha"},
        {"week": 50, "description": "Manutenção contínua"}
    ]'::jsonb,
    '[]'::jsonb,
    '[
        {"type": "Function", "value": "Manter independência"}
    ]'::jsonb,
    '[
        {"title": "PT management of Parkinson Disease", "authors": "Osborne JA et al.", "year": 2022, "journal": "JOSPT CPG"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 40. Biceps Tenodesis
(
    'Tenodese de Bíceps',
    'Tendinopatia/Lesão Bíceps Longo',
    'pos_operatorio',
    12,
    '[
        {"week": 1, "description": "Tipoia 3-4 semanas, ADM passiva cotovelo"},
        {"week": 4, "description": "ADM ativa cotovelo, início ombro"},
        {"week": 8, "description": "Fortalecimento bíceps leve"},
        {"week": 12, "description": "Retorno normal (evitar cargas extremas até 4-5 meses)"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Sem flexão resistida do cotovelo (Popeye sign risk)"}
    ]'::jsonb,
    '[
        {"type": "Cosmetic", "value": "Sem deformidade Popeye"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation after Biceps Tenodesis", "authors": "Krupp RJ et al.", "year": 2009}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 41. Tibial Plateau Fracture (ORIF)
(
    'Fratura de Platô Tibial',
    'Fratura de Joelho',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Sem carga (NWB) 6-8 semanas, ADM passiva joelho, CPM"},
        {"week": 8, "description": "Início carga parcial, fortalecimento"},
        {"week": 16, "description": "Carga total, funcional"},
        {"week": 24, "description": "Retorno atividades leves"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 8, "description": "Carga proibida (risco de afundamento articular)"}
    ]'::jsonb,
    '[
        {"type": "ROM", "value": "0-120°"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation after Tibial Plateau Fracture", "authors": "Arnold JB et al.", "year": 2017}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 42. Patellar Dislocation (Conservative)
(
    'Luxação Patelar (Primeiro Episódio)',
    'Instabilidade Patelar',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Imobilizador curto, redução edema, ativação VMO"},
        {"week": 4, "description": "ADM progressiva, fortalecimento quadril/core"},
        {"week": 8, "description": "Treino proprioceptivo, corrida leve"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Evitar extensão final brusca"}
    ]'::jsonb,
    '[
        {"type": "Stability", "value": "Apprehension test negativo"}
    ]'::jsonb,
    '[
        {"title": "Management of First-Time Patellar Dislocations", "authors": "Mithoefer K et al.", "year": 2018}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 43. MPFL Reconstruction
(
    'Reconstrução do LPFM (Ligamento Patelofemoral Medial)',
    'Instabilidade Patelar Recorrente',
    'pos_operatorio',
    20,
    '[
        {"week": 1, "description": "Brace em extensão para marcha, ADM 0-90"},
        {"week": 6, "description": "Retirada brace, ADM total, fortalecimento"},
        {"week": 16, "description": "Retorno esporte"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Proteção contra lateralização da patela"}
    ]'::jsonb,
    '[
        {"type": "Stability", "value": "Patela estável"}
    ]'::jsonb,
    '[
        {"title": "Rehabilitation guidelines for MPFL reconstruction", "authors": "Fisher B et al.", "year": 2010}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 44. Quadriceps Tendon Repair
(
    'Reparo do Tendão Quadricipital',
    'Rotura do Quadríceps',
    'pos_operatorio',
    24,
    '[
        {"week": 1, "description": "Brace travado em extensão 6 semanas, carga tolerada"},
        {"week": 6, "description": "Início flexão ativa, retirada gradual brace"},
        {"week": 12, "description": "Fortalecimento intenso"},
        {"week": 24, "description": "Retorno funcional"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Não fletir ativamente o joelho"}
    ]'::jsonb,
    '[
        {"type": "Strength", "value": "Simetria quadríceps"}
    ]'::jsonb,
    '[
        {"title": "Quadriceps and Patellar Tendon Repair Rehabilitation", "authors": "Westin CD et al.", "year": 2019}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 45. Clavicle Fracture (Conservative)
(
    'Fratura de Clavícula (Conservador)',
    'Fratura de Clavícula',
    'patologia',
    10,
    '[
        {"week": 1, "description": "Tipoia 4-6 semanas"},
        {"week": 5, "description": "Início ADM ombro restrita (não elevar > 90)"},
        {"week": 8, "description": "Fortalecimento"},
        {"week": 12, "description": "Carga total"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 6, "description": "Evitar abdução > 90°"}
    ]'::jsonb,
    '[
        {"type": "Imaging", "value": "Calo ósseo presente"}
    ]'::jsonb,
    '[
        {"title": "Conservative management of clavicle fractures", "authors": "Robinson CM et al.", "year": 2004}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 46. Thoracic Outlet Syndrome
(
    'Síndrome do Desfiladeiro Torácico',
    'Compressão Neurovascular',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Mobilização de 1ª costela, alongamento peitoral/escalenos, glides neurais"},
        {"week": 4, "description": "Fortalecimento escapular (trapézio inferior/serrátil)"},
        {"week": 8, "description": "Correção postural funcional"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 4, "description": "Evitar carregar peso nos ombros (mochila)"}
    ]'::jsonb,
    '[
        {"type": "Symptoms", "value": "Sem parestesia em elevação (Roos Test)"}
    ]'::jsonb,
    '[
        {"title": "Thoracic Outlet Syndrome: A Comprehensive Review", "authors": "Hooper TL et al.", "year": 2010}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 47. Piriformis Syndrome
(
    'Síndrome do Piriforme',
    'Dor Glútea Profunda',
    'patologia',
    8,
    '[
        {"week": 1, "description": "Alongamento piriforme, liberação miofascial, glides ciáticos"},
        {"week": 3, "description": "Fortalecimento glúteo máximo e médio"},
        {"week": 6, "description": "Retorno atividade sem dor"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar sentar sobre carteira/superfície dura"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "FAIR test negativo"}
    ]'::jsonb,
    '[
        {"title": "Deep gluteal syndrome", "authors": "Martin HD et al.", "year": 2015}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 48. Spondylolisthesis (Lumbar) - Conservative
(
    'Espondilolistese Lombar (Grau I/II)',
    'Instabilidade Vertebral',
    'patologia',
    12,
    '[
        {"week": 1, "description": "Flexão (Williams), evitar extensão, core bracing"},
        {"week": 4, "description": "Estabilização dinâmica, alongamento isquiotibiais"},
        {"week": 12, "description": "Manutenção"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 12, "description": "Evitar hiperextensão lombar (ginástica, nado borboleta)"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Assintomático nas AVDs"}
    ]'::jsonb,
    '[
        {"title": "Conservative treatment of spondylolisthesis", "authors": "Kalichman L et al.", "year": 2008}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 49. De Quervain's Tenosynovitis
(
    'Tenossinovite de De Quervain',
    'Tendinite de Punho (Radial)',
    'patologia',
    6,
    '[
        {"week": 1, "description": "Tala de polegar (Spica), gelo"},
        {"week": 3, "description": "Retirada gradual, mobilização suave"},
        {"week": 6, "description": "Fortalecimento excêntrico"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 3, "description": "Evitar desvio ulnar com polegar fletido"}
    ]'::jsonb,
    '[
        {"type": "Pain", "value": "Finkelstein Test negativo"}
    ]'::jsonb,
    '[
        {"title": "Management of De Quervain''s Tenosynovitis", "authors": "Ilyas AM et al.", "year": 2007}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
),

-- 50. Post-Concussion Syndrome (Sports)
(
    'Pós-Concussão Esportiva',
    'Concussão Cerebral',
    'patologia',
    4,
    '[
        {"week": 1, "description": "Repouso cognitivo e físico, retorno gradual (Protocolo Zurich/Berlin)"},
        {"week": 2, "description": "Exercício aeróbico leve (sub-sintoma)"},
        {"week": 3, "description": "Treino sem contato"},
        {"week": 4, "description": "Retorno jogo"}
    ]'::jsonb,
    '[
        {"week_start": 0, "week_end": 2, "description": "Evitar telas excessivas, esforço mental"}
    ]'::jsonb,
    '[
        {"type": "Safety", "value": "Buffalo Concussion Treadmill Test aprovado"}
    ]'::jsonb,
    '[
        {"title": "Consensus statement on concussion in sport", "authors": "McCrory P et al.", "year": 2017, "journal": "BJSM"}
    ]'::jsonb,
    '[]'::jsonb,
    NULL
);
