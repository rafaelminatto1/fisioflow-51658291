-- Migration: Atualizar templates com conteúdo baseado em evidências científicas
-- Data: 2025-01-13
-- Descrição: Atualiza templates existentes e adiciona novos protocolos com observações clínicas, contraindicações e referências

-- ============================================================
-- ATUALIZAÇÃO DE TEMPLATES EXISTENTES
-- ============================================================

-- 1. PÓS-OP LCA - FASE 1
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de proteção do enxerto (0-6 semanas). Priorizar ganho de extensão completa, controle de edema e ativação de quadríceps. Fortalecimento de isquiotibiais é essencial para proteger o enxerto. Evitar flexão >90° nas primeiras 4 semanas para reduzir estresse no enxerto.',
  contraindications = 'Flexão ativa de joelho >90° nas primeiras 4 semanas pós-op. Exercícios de cadeia cinética aberta em extensão completa (0-45°) nas primeiras 6 semanas. Massura patelar agressiva. Retorno ao esporte antes de 6 meses.',
  precautions = 'Progressão baseada em critérios funcionais, não apenas tempo. Monitorar dor anterior ao joelho que indica sobrecarga patelar. Evitar apoio excessivo em membros inferiores durante exercícios de cadeia cinética fechada.',
  progression_notes = 'Critérios para progredir: extensão completa, sem edema, controle motor adequado de quadríceps, marcha sem auxílio. Progressão para Fase 2 geralmente entre semanas 4-6.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'AAOS Clinical Practice Guideline for ACL Injury Management (2022)',
    'APTA Clinical Practice Guidelines for ACL Rehabilitation (2022)',
    'Verhagen et al. Exercise-based rehabilitation for ACL injuries systematic review (2025)',
    'Arundale et al. JOSPT Exercise-Based Knee and ACL Prevention (2023)'
  ]
WHERE name = 'Pós-Op LCA - Fase 1';

-- 2. PÓS-OP LCA - FASE 2
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de fortalecimento (6-12 semanas). Priorizar fortalecimento de quadríceps, glúteos e core. Iniciar propriocepção avançada. Foco em exercícios de cadeia cinética fechada para fortalecimento funcional com menor estresse no enxerto.',
  contraindications = 'Exercícios de alta carga antes de 12 semanas. Pliometria antes de 16 semanas. Exercícios que causam dor ou edema significativo.',
  precautions = 'Monitorar alinhamento do joelho durante agachamentos (valgo dinâmico). Progressão gradual de carga. Atentar para assimetrias de força entre membros.',
  progression_notes = 'Critérios: 80% de força simétrica (Limb Symmetry Index), agachamento unilateral sem compensações, equilíbrio estável. Geralmente prograda para Fase 3 entre semanas 10-14.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Aspetar Clinical Guidelines for ACL Reconstruction Rehabilitation',
    'MGH Rehabilitation Protocol for ACL (2023)',
    'Mass General Hospital ACL Rehabilitation Protocol'
  ]
WHERE name = 'Pós-Op LCA - Fase 2';

-- 3. PÓS-OP LCA - FASE 3
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de retorno ao esporte (12+ semanas). Priorizar pliometria, agilidade, esportes específicos. Testes funcionais obrigatórios antes de liberação completa. Foco em potência, velocidade e reatividade neuromuscular.',
  contraindications = 'Retorno ao esporte sem completar testes funcionais. Retorno sem força >90% do membro contralateral. Retorno com instabilidade ou dor.',
  precautions = 'Retorno gradual e progressivo. Iniciar com drills não competitivos antes de contato completo. Reavaliar constantemente após retorno.',
  progression_notes = 'Critérios de retorno ao esporte: LSIs >90% em força e potência, testes funcionais within 10% (hop tests, agility), confiança psicológica, sem edema ou dor. Tempo mínimo 9 meses para reduzir risco de re-lesão.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Aspetar Return to Sport Criteria after ACLR',
    'Grindem et al. ACL-RSI score for return to sport readiness',
    'Arundale et al. JOSPT Exercise-Based Knee and ACL Prevention (2023)'
  ]
WHERE name = 'Pós-Op LCA - Fase 3';

-- 4. PÓS-OP MANGUITO ROTADOR - INICIAL
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de proteção (0-6 semanas). Objetivo: proteger reparo do manguito enquanto ganha amplitude passiva. Pendulares e exercícios passivos são prioritários. Evitar ativação ativa do manguito rotador nas primeiras 4-6 semanas.',
  contraindications = 'Elevação ativa do braço nas primeiras 6 semanas. Rotação ativa contra resistência. Exercícios que causem dor aguda. Movimentos bruscos.',
  precautions = 'Usar tipóia conforme orientação cirúrgica. Não forçar amplitude se houver dor resistente. Evitar extensão combinada com rotação interna (posição de risco).',
  progression_notes = 'Critérios para progredir: amplitude passiva satisfatória (flexão >120°, rotação externa 40°), sem dor importante. Geralmente prograda entre semanas 6-8.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'MOON Shoulder Group Post-Operative Rotator Cuff Repair Protocol',
    'Mass General Hospital Rehabilitation Protocol for Rotator Cuff Repair',
    'van der Meijden et al. Healing phases after rotator cuff repair'
  ]
WHERE name = 'Pós-Op Manguito Rotador - Inicial';

-- 5. PÓS-OP MANGUITO ROTADOR - AVANÇADO
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de fortalecimento (6+ semanas). Priorizar fortalecimento progressivo do manguito rotador, deltóide e estabilizadores de escápula. Incluir exercícios excêntricos para tendinopatias associadas. Foco em controle escapular antes de elevação ativa.',
  contraindications = 'Exercícios pesados acima da cabeça antes de 12 semanas. Fortalecimento em posição de impacto (90° abdução). Dor que persiste >24h após exercício.',
  precautions = 'Progressão lenta de carga. Priorizar controle motor antes de aumentar peso. Evitar compensações com elevação de escápula (shrug).',
  progression_notes = 'Critérios: força adequada sem dor, amplitude completa, padrão de movimento normal. Pode progredir para exercícios funcionais e retornar gradualmente a atividades.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'Escamilla et al. Optimal Management of Shoulder Impingement Syndrome (2014)',
    'Physio-pedia Evidence Based Interventions for Shoulder Pain',
    'HSS Non-Operative Shoulder Impingement Rehab Guidelines'
  ]
WHERE name = 'Pós-Op Manguito Rotador - Avançado';

-- 6. LOMBALGIA CRÔNICA
UPDATE public.exercise_templates
SET
  clinical_notes = 'Foco em estabilização segmentar e educação postural. Combinação de exercícios de core (transverso do abdômen, multífido) com mobilização da coluna. Método McKenzie útil para hérnias discais com preferência de extensão. Exercícios de baixa impacto são preferíveis.',
  contraindications = 'Exercícios que exacerbam dor radicular. Flexões exacerbadas de tronco na presença de hérnia discal aguda. Exercícios de alta impacto durante crises.',
  precautions = 'Evitar compensações respiratórias (prender respiração). Atentar para aumento de dor irradiada para MMII. Progressão gradual de complexidade.',
  progression_notes = 'Critérios de progressão: redução de dor >50%, capacidade de manter contração de core durante atividades funcionais. Geralmente 4-8 semanas para melhora significativa.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'NCBI/NIH McKenzie Back Exercises StatPearls (2023)',
    'Slater et al. McKenzie Method effectiveness in low back pain (2018)',
    'Core stabilization exercises effectiveness review (2024)',
    'JOSPT Clinical Practice Guidelines for Low Back Pain'
  ]
WHERE name = 'Lombalgia Crônica';

-- 7. CERVICALGIA TENSIONAL
UPDATE public.exercise_templates
SET
  clinical_notes = 'Foco em reeducação postural e alongamento da cadeia cervical posterior. Fortalecimento de flexores profundos do pescoço (craniocervical flexion). Exercícios de escápula para reduzir sobrecarga cervical. Educação sobre ergonomia e pausas ativas.',
  contraindications = 'Exercícios que exacerbam dor ou parestesias. Mobilizações rápidas ou forçadas. Exercícios em presença de sinais de mielopatia.',
  precautions = 'Evitar protrusão de cabeça durante exercícios. Atentar para tontura ou sintomas autonômicos. Não forçar amplitude se houver resistência dolorosa.',
  progression_notes = 'Critérios: redução de dor, melhor mobilidade cervical, capacidade de manter postura neutra por períodos prolongados. Geralmente 4-6 semanas.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'JOSPT Neck Pain Revision 2017 Clinical Practice Guidelines',
    'Exercises for Mechanical Neck Disorders systematic review (2015)',
    'MDPI Best Evidence Rehabilitation for Chronic Neck Pain (2019)'
  ]
WHERE name = 'Cervicalgia Tencional';

-- 8. HÉRNIA DE DISCO LOMBAR
UPDATE public.exercise_templates
SET
  clinical_notes = 'Protocolo McKenzie é evidenciado para hérnias discais com preferência de extensão. Identificar se paciente é "responder" ou "não-responder" à extensão. Para respondedores: progressão de extensões em decúbito, em pé, e centralização da dor. Associar com estabilização de core.',
  contraindications = 'Flexões exacerbadas se piora com flexão (discogenic pain). Exercícios que peripheralizam a dor. High-impact activities durante crise.',
  precautions = 'Monitorar resposta à extensão (centralização vs peripheralização). Parar se dor irradiada aumenta. Progressão baseada em sintomas, não tempo.',
  progression_notes = 'Critérios: dor centralizada, amplitude lombar melhorada, força de MMII normal. Fase aguda: 1-2 semanas. Fase subaguda: 2-6 semanas.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'NCBI StatPearls McKenzie Back Exercises (2023)',
    'Biomechanical Analysis of McKenzie Method (2025)',
    'McKenzie Extension Exercises effectiveness trial (2025)'
  ]
WHERE name = 'Hérnia de Disco Lombar';

-- 9. ENTORSE DE TORNOZELO - FASE AGUDA
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase inicial (0-72h): PRICE (Protection, Rest, Ice, Compression, Elevation). Iniciar mobilização leve tão logo tolerado para prevenir rigidez. Exercícios de dorsiflexão para prevenir contractura de gastrocnêmio/sóleo.',
  contraindications = 'Carga pesada na fase aguda. Exercícios que causem dor intensa. Imobilização prolongada >72h pode prejudicar recuperação.',
  precautions = 'Progressão baseada em dor e edema. Não forçar amplitude se dor significativa. Monitorar sinais de lesão mais grave (fratura, lesão ligamentar grave).',
  progression_notes = 'Critérios para progredir: redução de edema, tolerância à carga, amplitude de movimento ≥80%. Geralmente 3-7 dias.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Mass General Hospital Physical Therapy Guidelines for Lateral Ankle Sprain',
    'Proprioceptive Training for Prevention of Ankle Sprains (PMC, 2017)',
    'Evidence-based treatment for ankle injuries (PMC, 2012)'
  ]
WHERE name = 'Entorse de Tornozelo - Fase Aguda';

-- 10. ENTORSE DE TORNOZELO - FORTALECIMENTO
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fase de fortalecimento e propriocepção (após fase aguda). Priorizar fortalecimento de fibulares, tibial anterior e gastrocnêmio. Treino de equilíbrio unipodal em superfícies progressivamente instáveis é essencial para prevenir recidivas. Exercícios funcionais e agilidade.',
  contraindications = 'Exercícios que causam dor ou instabilidade. Retorno a esportes sem equilíbrio adequado.',
  precautions = 'Atentar para valgo de tornozelo durante exercícios. Progressão gradual de dificuldade proprioceptiva. Usar suporte se necessário nas fases iniciais.',
  progression_notes = 'Critérios: força simétrica, equilíbrio unipodal >30s com olhos fechados, agility test within 10%. Retorno ao esporte em 2-6 semanas conforme gravidade.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'PMC5737043 Proprioceptive Training for Ankle Sprain Prevention (2017)',
    'Sanford Health Ankle Sprain Rehabilitation Guideline',
    'JOSPT Physical Therapy After Ankle Sprain (2021)'
  ]
WHERE name = 'Entorse de Tornozelo - Fortalecimento';

-- 11. FASCITE PLANTAR
UPDATE public.exercise_templates
SET
  clinical_notes = 'Combinação de alongamento da fáscia plantar específico e alongamento de gastrocnêmio/sóleo. Evidence supports: alongamento de fáscia plantar por 10 minutos/dia + alongamento de panturrilha. Fortalecimento de intrínsecos do pé para suporte de arco longitudinal.',
  contraindications = 'Exercícios que exacerbam dor matinal significativa. Corrida ou impacto durante fase aguda.',
  precautions = 'Alongar preferencialmente pela manhã e após períodos sentado. Dor leve pós-exercício é aceitável, dor intensa não. Calçado adequado é essencial.',
  progression_notes = 'Melhora esperada em 4-8 semanas com alongamento consistente. Critérios: redução de dor matinal, tolerância à marcha prolongada.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'PMC Comprehensive Physiotherapy Rehabilitation Protocol (2024)',
    'Heel Pain Plantar Fasciitis Revision 2023 (65 citations)',
    'RACGP Stretching for Plantar Fasciitis Guidelines (2021)'
  ]
WHERE name = 'Fascite Plantar';

-- 12. TENDINOPATIA PATELAR
UPDATE public.exercise_templates
SET
  clinical_notes = 'Programa excêntrico é gold standard para tendinopatia patelar. Decline squats (agachamentos em declive) evidenciados para isolar quadríceps e reduzir carga patelar. Protocolo de Alfredson modificado: 3 séries de 15 reps, excêntrico lento (3-5s), concentrado, fase concêntrica assistida.',
  contraindications = 'Exercícios que causam dor >5/10 ou dor persistente >24h. Treino intenso de plyometria durante fase aguda.',
  precautions = 'Dor leve durante exercício é aceitável e necessária para adaptação. Monitorar resposta 24h após. Não pular fases de progressão.',
  progression_notes = 'Protocolo mínimo 6-12 semanas. Critérios: dor ≤2/10 durante atividade, capacidade para decline squats com carga normal.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Physio-pedia Effective Quadriceps Training in Patellofemoral Pain',
    'JOSPT Physical Therapist-Guided Quadriceps Strengthening (2014)',
    'BJSM Quadriceps or hip exercises for PFPS (2023, 27 citations)'
  ]
WHERE name = 'Tendinopatia Patelar';

-- 13. BURSITE TROCANTÉRICA
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fortalecimento de glúteo médio é essencial para reduzir compressão do trocânter. Exercícios: side-lying clamshell, glute bridges, banded sidesteps, lateral walks. Evitar exercícios com adução excessiva de quadril (crossing legs) que irrita bursa.',
  contraindications = 'Exercícios que causam dor aguda no trocânter maior. Exercícios em cadeia cinética fechada com valgo de joelho.',
  precautions = 'Progressão isométrica → isotônica → funcional. Atentar para compensação com tensor da fáscia lata em vez de glúteo médio.',
  progression_notes = 'Melhora em 6-8 semanas com exercícios consistentes. Critérios: dor ≤2/10, força de abdução adequada, marcha sem dor.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'E3 Rehab Hip Bursitis Exercise Progressions',
    'Dr Jeffrey Peng Best Exercises for Trochanteric Bursitis',
    'MyHealth Alberta Trochanteric Bursitis Exercises'
  ]
WHERE name = 'Bursite Trocantérica';

-- 14. REABILITAÇÃO AVE - MEMBRO SUPERIOR
UPDATE public.exercise_templates
SET
  clinical_notes = 'Foco em recuperação de função do membro superior afetado. Exercícios de alcance, preensão, destreza e coordenação óculo-manual. Uso de mirror therapy evidenciado para dor fantasma e heminegligência. Progressão de passiva → ativa assistida → ativa.',
  contraindications = 'Exercícios que causam espasticidade exacerbada. Sobrecarga antes de recuperação de tônus muscular.',
  precautions = 'Atentar para ombro doloroso/subluxado em hemiplegia. Usar suporte adequado. Monitorar fadiga que pode piorar qualidade de movimento.',
  progression_notes = 'Recuperação mais significativa nos primeiros 3-6 meses. Critérios: preensão funcional, alcance útil sem compensações.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'Physio-pedia Stroke Rehabilitation Evidence',
    'Cochrane Review Constraint-Induced Movement Therapy',
    'Neuroplasticity principles in stroke recovery'
  ]
WHERE name = 'Reabilitação AVE - Membro Superior';

-- 15. REABILITAÇÃO AVE - MARCHA
UPDATE public.exercise_templates
SET
  clinical_notes = 'Treino de marcha com foco em padrão safisfatório. Fortalecimento de MMII (quadríceps, glúteos, tibial anterior). Equilíbrio estático e dinâmico. Uso de FES (functional electrical stimulation) se indicado para foot drop.',
  contraindications = 'Marcha sem assistência se risco de quedas significativo.',
  precautions = 'Supervisão constante durante treino de marcha. Usar barras paralelas ou assistência conforme necessário. Atentar para espasticidade que interfere na marcha.',
  progression_notes = 'Progressão: barra paralela → andador → bengala → independente. Tempo variável conforme severidade (semanas a meses).',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'Physio-pedia Stroke Gait Rehabilitation',
    'Task-specific training for gait after stroke',
    'Bodyweight-supported treadmill training evidence'
  ]
WHERE name = 'Reabilitação AVE - Marcha';

-- 16. PARKINSON - MOBILIDADE
UPDATE public.exercise_templates
SET
  clinical_notes = 'Exercícios de grande amplitude para combater rigidez. Marcha com pistas visuais e auditivas. Treino de transferências e equilíbrio para prevenir quedas. Box training para mobilidade axial. Exercícios cognitivo-motores simultâneos (dual-task).',
  contraindications = 'Exercícios com risco de queda se não supervisionados.',
  precautions = 'Atentar para hipotensão ortostática. Monitorar medicação ON/OFF para otimizar exercícios. Supervisão para exercícios de equilíbrio.',
  progression_notes = 'Exercícios diários são ideais. Melhora mantida enquanto programa continua. Foco em qualidade de movimento.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'Physio-pedia Parkinson Disease Rehabilitation',
    'Exercise intensity recommendations for Parkinson',
    'Dance and boxing programs for PD (Parkinson specific)'
  ]
WHERE name = 'Parkinson - Mobilidade';

-- 17. PREVENÇÃO DE QUEDAS EM IDOSOS
UPDATE public.exercise_templates
SET
  clinical_notes = 'Multicomponent exercise program: força + equilíbrio + treino funcional. Otago Exercise Programme é evidenciado. Incluir: equilíbrio estático (tandem, unipodal), equilíbrio dinâmico (marcha, transfers), fortalecimento de MMII, treino de ortostatismo.',
  contraindications = 'Exercícios de alto risco se não supervisionados.',
  precautions = 'Supervisão para exercícios de equilíbrio desafiadores. Adaptar conforme comorbidades e limitações. Progressão conservadora.',
  progression_notes = 'Programa mínimo 12 semanas com 2-3x/semana. Redução de 30-40% em quedas com programas consistentes.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Cochrane Review Exercise for preventing falls in older people',
    'Otago Exercise Programme evidence',
    'CDC STEADI fall prevention program'
  ]
WHERE name = 'Prevenção de Quedas em Idosos';

-- 18. OSTEOPOROSE - FORTALECIMENTO
UPDATE public.exercise_templates
SET
  clinical_notes = 'Carga axial e impacto moderado são estimulantes ósseos. Exercícios: impacto controlado (step, marcha rápida), fortalecimento com carga, exercícios de postura e equilíbrio. Evitar flexão exacerbada de coluna (risco de fraturas vertebrais).',
  contraindications = 'Flexão intensa de tronco (risk of vertebral fracture). Rotação combinada com flexão. High impact activities em osteoporose severa.',
  precautions = 'Progressão muito gradual de impacto. Atentar para dor vertebral que pode indicar microfratura. Ensinar higiene postural.',
  progression_notes = 'Programa mínimo 6-12 meses para impacto em densidade óssea. Manter exercícios vitalícios.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'Physio-pedia Osteoporosis Exercise Guidelines',
    'ACSM Exercise Guidelines for Osteoporosis',
    'Bone loading exercise recommendations'
  ]
WHERE name = 'Osteoporose - Fortalecimento';

-- 19. ARTROSE DE JOELHO
UPDATE public.exercise_templates
SET
  clinical_notes = 'Fortalecimento de quadríceps é cornerstone. Exercícios de cadeia cinética fechada preferíveis (menos carga patelar). Incluir: wall sit, leg press com arco limitado, ponte de glúteo, alongamento de isquiotibiais. Aeróbico de baixo impacto (bicicleta, caminhada) para controle de peso.',
  contraindications = 'Exercícios de alto impacto (corrida, pulos). Agachamentos profundos com dor.',
  precautions = 'Respeitar limites de dor. Arco de movimento doloroso deve ser evitado. Progressão lenta de carga.',
  progression_notes = 'Programa 6-12 semanas para melhora significativa. Manter exercícios vitalícios para manutenção.',
  evidence_level = 'A',
  bibliographic_references = ARRAY[
    'AAOS Treatment of Knee Osteoarthritis Guidelines',
    'Quadriceps strengthening for knee OA systematic review',
    'Exercise therapy for knee OA (Cochrane Review)'
  ]
WHERE name = 'Artrose de Joelho';

-- 20. FIBROMIALGIA - AERÓBICO LEVE
UPDATE public.exercise_templates
SET
  clinical_notes = 'Início MUITO gradual para evitar flare-ups. Começar 5-10 minutos, progressar 1-2 min por sessão. Tipos: caminhada, hidroginástica (ideal), bicicleta. Adicionar fortalecimento leve após adaptação aeróbica. Educação sobre "good days/bad days" e ajuste de intensidade.',
  contraindications = 'Alta intensidade ou longa duração na fase inicial. Exercícios que exacerbam dor significativamente.',
  precautions = 'Progressão conservadora essencial. Monitorar dor 24h pós-exercício. Pacientes devem aprender a autogerenciar intensidade.',
  progression_notes = 'Objetivo: 150 min/semana de atividade moderada em 3-6 meses. Melhora de dor e fadiga com consistência.',
  evidence_level = 'B',
  bibliographic_references = ARRAY[
    'EULAR recommendations for fibromyalgia management',
    'Exercise therapy for fibromyalgia systematic review',
    'Graded exercise activity for chronic pain'
  ]
WHERE name = 'Fibromialgia - Aeróbico Leve';

-- ============================================================
-- INSERÇÃO DE NOVOS PROTOCOLOS BASEADOS EM EVIDÊNCIAS
-- ============================================================

-- Novo Protocolo: PÓS-OP ARTROPLASTIA TOTAL DE JOELHO (ATJ)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Pós-Op ATJ - Fase Inicial (0-2 semanas)',
  'Reabilitação inicial pós-artroplastia total de joelho focada em ADM e controle de edema',
  'Pós-Operatório',
  'Artroplastia Total de Joelho',
  'Fase Inicial',
  'Priorizar extensão completa (crucial para marcha funcional) e flexão progressiva até 90°. Exercícios de bombeio (pompage) para edema. Mobilização patelar para prevenir aderências. Fortalecimento isométrico de quadríceps iniciado precocemente.',
  'Flexão ativa resistida >90° nas primeiras 2 semanas. Exercícios de cadeia cinética abada com carga. Massagem patelar agressiva.',
  'Usar CPM (Continuous Passive Motion) se indicado. Controle de dor adequado para permitir exercícios. Monitorar sinais de infecção ou trombose.',
  'Critérios: extensão completa ou <5° de déficit, flexão ≥90°, marcha com andador, edema controlado. Geralmente 2 semanas.',
  'A',
  ARRAY[
    'MGH Rehabilitation Protocol for Total Knee Arthroplasty',
    'PMC Rehabilitation Techniques Before and After TKA (2024)',
    'AAOS Total Knee Replacement Exercise Guide',
    'OrthoInfo TKA Rehabilitation Guidelines'
  ]
);

-- Novo Protocolo: PÓS-OP ATJ - FASE INTERMEDIÁRIA
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Pós-Op ATJ - Fase Intermediária (2-6 semanas)',
  'Reabilitação intermediária pós-artroplastia total de joelho focada em fortalecimento',
  'Pós-Operatório',
  'Artroplastia Total de Joelho',
  'Fase Intermediária',
  'Progressão de fortalecimento: isométrico → isotônico sem carga → com carga. Priorizar quadríceps e glúteos. Iniciar treino de escada (subir com bom, descer com operated). Propriocepção básica (unipodal com apoio).',
  'Exercícios de alto impacto. Exercícios que causam dor severa.',
  'Progressão baseada em dor e fadiga. Arco de movimento funcional (0-110°) antes de desafios maiores.',
  'Critérios: marcha independente sem bengala, escada com corrimão, flexão >100°, força >3/5. Geralmente 6 semanas.',
  'A',
  ARRAY[
    'MGH Rehabilitation Protocol for Total Knee Arthroplasty',
    'PMC Rehabilitation Techniques Before and After TKA (2024)',
    'Sports Surgery Clinic TKA Guidelines'
  ]
);

-- Novo Protocolo: PÓS-OP ATJ - FASE AVANÇADA
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Pós-Op ATJ - Fase Avançada (6+ semanas)',
  'Reabilitação avançada pós-artroplastia total de joelho focada em função',
  'Pós-Operatório',
  'Artroplastia Total de Joelho',
  'Fase Avançada',
  'Fortalecimento avançado com carga progressiva. Treino funcional: escada sem corrimão, agachamentos parciais, ciclismo. Propriocepção avançada (superfícies instáveis). Atividades recreacionais gradativas.',
  'Esportes de alto impacto (corrida, salto). Exercícios de deep squat que estressam implante.',
  'Retorno a atividades deve ser gradual. Evitar esportes de impactoalto para longevidade do implante.',
  'Critérios: marcha normal, escada normal, força >4/5, sem dor significativa. Retorno a driving permitido quando força e reflexos adequados.',
  'B',
  ARRAY[
    'HSS Best Exercises After Knee Replacement',
    'Home Therapy Exercises After TKA',
    'E3 Rehab Total Knee Replacement Rehabilitation'
  ]
);

-- Novo Protocolo: PÓS-OP ARTROPLASTIA TOTAL DE QUADRIL (ATQ)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Pós-Op ATQ - Protocolo Completo',
  'Reabilitação completa pós-artroplastia total de quadril com precauções de luxação',
  'Pós-Operatório',
  'Artroplastia Total de Quadril',
  'Protocolo Completo',
  'Precauções de luxação: evitar flexão >90°, adução e rotação interna combinada nas primeiras 6-12 semanas. Exercícios: abdução de glúteo médio, ponte, fortalecimento de quadríceps, marcha com andador → bengala → independente.',
  'Posição de "frog legs" (flexão + adução + rotação interna). Cruzar pernas. Flexão de quadril >90° nas primeiras 6 semanas.',
  'Educação sobre precauções é essencial. Usar travesseiro entre pernas para dormir. Altura adequada de cadeira e vaso sanitário.',
  'Critérios: marcha independente sem bengala, escada normal, ADM funcional. Geralmente 6-12 semanas.',
  'A',
  ARRAY[
    'Mass General Hospital Rehabilitation Protocol for THA',
    'Brigham and Women Hospital THA/Hemiarthroplasty Protocol',
    'AAOS Total Hip Replacement Exercise Guide',
    'Royal Berkshire NHS Hip Replacement Exercises'
  ]
);

-- Novo Protocolo: CAPSULITE ADESIVA (OMBRO CONGELADO)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Capsulite Adesiva - Protocolo Completo',
  'Reabilitação completa para capsulite adesiva (ombro congelado) baseada em evidências',
  'Patologia',
  'Capsulite Adesiva',
  'Protocolo Completo',
  'Fase congelante: exercícios pendulares e leves alongamentos. Fase de descongelamento: mobilização ativo-assistida, wall walks, table slides, towel stretch. Diatermia profunda + alongamento é mais eficaz que alongamento isolado. Exercícios domiciliares diários essenciais.',
  'Mobilizações forçadas que causam dor intensa. Exercícios de alta resistência em fase aguda.',
  'Dor leve pós-exercício é aceitável, dor severa não. Consistência é chave - alongamentos 2-3x ao dia.',
  'Recuperação pode levar 12-24 meses. Melhora significativa geralmente em 6-12 semanas com programa consistente.',
  'A',
  ARRAY[
    'NCBI/PMC Adhesive Capsulitis Evidence Review (2010, 202 citations)',
    'JOSPT Frozen Shoulder Evidence-Based Model (2009, 437 citations)',
    'MGH Rehabilitation Protocol for Frozen Shoulder',
    'ResearchGate Systematic Review 2023'
  ]
);

-- Novo Protocolo: SÍNDROME DO IMPACTO DO OMBRO
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Síndrome do Impacto - Protocolo Não-Cirúrgico',
  'Reabilitação conservadora para síndrome do impacto subacromial',
  'Patologia',
  'Síndrome do Impacto',
  'Não-Cirúrgico',
  'Fase 1: repouso relativo + exercícios pendulares + anti-inflamatório. Fase 2: fortalecimento de manguito (rotação externa/interna em 0° abdução), serrátil anterior, rombóides. Fase 3: elevação progressiva até 90°, exercícios de escápula. Evitar elevação >90° com carga na fase inicial.',
  'Exercícios de elevação acima de 90° com carga na fase inicial. Exercícios que causam painful arc.',
  'Priorizar estabilização de escápula antes de fortalecer manguito. Evitar shrug compensatório durante exercícios.',
  'Programa 6-12 semanas. Critérios: sem painful arc, força adequada, função completa.',
  'A',
  ARRAY[
    'Escamilla et al. Optimal Management of Shoulder Impingement (2014, 154 citations)',
    'Physio-pedia Evidence-Based Interventions for Shoulder Pain',
    'HSS Non-Operative Rehab Guidelines for Shoulder Impingement'
  ]
);

-- Novo Protocolo: DOR LOMBAR MECÂNICA - MÉTODO MCKENZIE
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Lombalgia - Método McKenzie Completo',
  'Protocolo completo de exercícios de McKenzie para lombalgia mecânica',
  'Coluna',
  'Lombalgia Mecânica',
  'McKenzie',
  'Identificar se paciente é "responder" (melhora com extensão) ou "non-responder" (piora ou neutro). Para respondedores: progressão de extensão em decúbito → extensão em pé → extensão com desvio. Adicionar flexões apenas se não houver piora. Educação em postura e autotratamento é componente essencial.',
  'Exercícios que peripheralizam a dor (pioram irradiação). Flexões exacerbadas em respondedores à extensão.',
  'Monitorar centralização vs peripheralização. Se dor peripheraliza, PARAR exercício e reavaliar. Não forçar amplitude.',
  'Aguda: 1-2 semanas para melhora significativa. Crônica: 4-8 semanas. Autogestão é objetivo final.',
  'A',
  ARRAY[
    'NCBI StatPearls McKenzie Back Exercises (2023)',
    'Slater et al. McKenzie Method effectiveness (2018, 28 citations)',
    'McKenzie Extension Exercises trial (2025)',
    'Biomechanical Analysis McKenzie vs Core Stability (2025)'
  ]
);

-- Novo Protocolo: LESÃO DO MENISCO
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Lesão Meniscal - Tratamento Conservador',
  'Protocolo conservador para lesões meniscais baseado em evidências',
  'Patologia',
  'Lesão Meniscal',
  'Conservador',
  'Objetivos: extensão completa (bloqueio é contraindicação relativa a tratamento conservador), fortalecimento de quadríceps e glúteos, melhora de propriocepção. Exercícios: wall sit, leg press, step up/down, ponte. Evitar deep squats e rotações que podem irritar menisco.',
  'Bloqueio de extensão (locking) - indica cirurgia. Dor que piora apesar de 6-12 semanas de reabilitação adequada.',
  'Respeitar limites de dor. Evitar posições que "pinçam" o menisco (deep squat + rotação). Progressão funcional.',
  '6-12 semanas de reabilitação. Cirurgia se sem melhora após 12 semanas ou se bloqueio persistente.',
  'B',
  ARRAY[
    'MGH Rehabilitation Protocol for Meniscal Repair',
    'Evidence-based weight-bearing protocols after meniscal repair (PMC, 2025)',
    'Nonoperative Meniscus Rehabilitation Protocol',
    'MedBridge Effective Meniscus Injury Exercises'
  ]
);

-- Novo Protocolo: HALLUX VALGUS (BUNION) - PÓS-OP
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Pós-Op Hallux Valgus - Protocolo Completo',
  'Reabilitação pós-cirúrgica de Hallux Valgus (joanete)',
  'Pós-Operatório',
  'Hallux Valgus',
  'Protocolo Completo',
  'Fase 0-2 semanas: descarga conforme orientação (parcial ou total), elevação para edema, mobilização suave de dedos. Fase 2-6 semanas: progressão de carga, exercícios ROM de hálux, fortalecimento de intrínsecos, marcha reeducada. Fase 6+ semanas: retorno a calçado normal, atividades gradativas.',
  'Carga total quando contraindicado pelo cirurgião. Calçado de ponta fina ou salto alto antes de 8-12 semanas.',
  'Seguir orientação específica do cirurgião sobre carga. Uso de sandália pós-cirúrgica conforme indicado. Edema pode persistir por meses.',
  'Retorno a calçado normal em 8-12 semanas. Retorno a esportes em 3-6 meses conforme procedimento.',
  'B',
  ARRAY[
    'Mass General Hospital PT Guidelines for Hallux Valgus Correction',
    'David Gordon Ortho Post-Op Rehab Protocol',
    'Rehabilitation Program After Hallux Valgus Surgery',
    'Kaiser Permanente Great Toe Joint Exercises'
  ]
);

-- Novo Protocolo: TENDINOPATIA DE AQUILES
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Tendinopatia de Aquiles - Protocolo Alfredson',
  'Programa excêntrico evidenciado para tendinopatia de Aquiles',
  'Patologia',
  'Tendinopatia de Aquiles',
  'Alfredson Excêntrico',
  'Protocolo de Alfredson: elevação calcanhar em solo/bordil (2 séries de 15 reps, 2x ao dia). Fase excêntrica lenta (3-5s), fase concêntrica com auxílio do membro sadio. Progressão adicionando mochila com carga. Funciona melhor em tendinopatia crônica (>3 meses).',
  'Programa agudo de exercícios na fase inflamatória aguda. Dor >7/10 que indica ruptura ou processo agudo severo.',
  'Dor durante exercício é NECESSÁRIA para adaptação, mas não deve ser incapacitante. Monitorar resposta 24h após.',
  'Protocolo mínimo 12 semanas. Melhora significativa geralmente após 6-8 semanas. Retorno gradual a corrida após 12 semanas sem dor.',
  'A',
  ARRAY[
    'Alfredson et al. Eccentric training for Achilles tendinopathy',
    'Cochrane Review Exercise therapy for Achilles tendinopathy',
    'Physio-pedia Achilles Tendinopathy Rehabilitation'
  ]
);

-- Novo Protocolo: CERVICALGIA - ESTABILIZAÇÃO
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Cervicalgia - Fortalecimento Deep Neck Flexors',
  'Protocolo de fortalecimento de flexores profundos do pescoço para cervicalgia',
  'Coluna',
  'Cervicalgia',
  'Deep Neck Flexors',
  'Craniocervical flexion test: pressão lingual (tongue against palate) + retração chin (chin tuck). Progressão com biofeedback pressure. 10 segundos hold x 10 reps. Fortalece longo do pescoço e reto anterior da cabeça. Evidenciado para cervicalgia mecânica e cefaleia tensional.',
  'Exercícios que exacerbam dor ou parestesias. Fortalecimento com pescoço em extensão (não específico).',
  'Manter pescoço neutro durante exercício. Evitar protrusão de cabeça. Não reter respiração.',
  'Programa 6-8 semanas. Critérios: redução de dor, aumento de CRF (cranio-cervical flexion) endurance.',
  'A',
  ARRAY[
    'JOSPT Clinical Practice Guidelines for Neck Pain (2017, 1258 citations)',
    'Exercises for Mechanical Neck Disorders systematic review (2015, 526 citations)',
    'MDPI Best Evidence Rehabilitation for Chronic Neck Pain (2019, 155 citations)'
  ]
);

-- Novo Protocolo: INSTABILIDADE PATELOFEMORAL
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Instabilidade Patelo-femoral - Protocolo Completo',
  'Reabilitação para dor/instabilidade patelo-femoral baseada em evidências',
  'Patologia',
  'Instabilidade Patelo-femoral',
  'Protocolo Completo',
  'Foco: fortalecimento de quadríceps (especialmente VMO) e glúteo médio. Exercícios de cadeia cinética fechada preferíveis (menor carga patelar). Incluir: wall sit, step down, leg press 0-45°, clamshell, side-lying abduction. Taping da patela pode ser usado inicialmente para permitir exercícios.',
  'Exercícios de cadeia cinética abada em extensão (0-45°) na fase aguda. Deep squats com dor patelar.',
  'Monitorar valgo dinâmico durante exercícios. Corrigir alinhamento do joelho. Progressão baseada em dor.',
  'Programa 6-12 semanas. Retorno gradual a esportes após força e controle motor adequados.',
  'A',
  ARRAY[
    'Physio-pedia Effective Quadriceps Training in PFPS',
    'JOSPT Physical Therapist-Guided Quadriceps Strengthening (2014, 169 citations)',
    'BJSM Quadriceps or hip exercises for PFPS (2023)',
    '6-week evidence-based exercise program (2021)'
  ]
);

-- Novo Protocolo: OMBRO DOLOROSO (NÃO ESPECÍFICO)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Ombro Doloroso - Protocolo Escapuloumeral',
  'Protocolo de reabilitação para dor de ombro não específica focado em padrão escapuloumeral',
  'Patologia',
  'Ombro Doloroso',
  'Escapuloumeral',
  'Restaurar ritmo escapuloumeral antes de fortalecer manguito. Fase 1: mobilização escapular (wall slides, serrátil punch, rows). Fase 2: fortalecimento de manguito em posição segura (rotações em 0°). Fase 3: elevação progressiva mantendo ritmo normal. Low load, high reps inicialmente.',
  'Exercícios que causam painful arc >60°. Fortalecimento em posição de impacto.',
  'Evitar shrug compensatório. Paciência com ritmo escapuloumeral - pode levar 2-4 semanas para normalizar.',
  'Programa 8-12 semanas. Critérios: sem dor, ADM completa, força adequada, padrão escapuloumeral normal.',
  'B',
  ARRAY[
    'Physio-pedia Evidence-Based Interventions for Shoulder Pain',
    'Optimal Management of Shoulder Impingement Syndrome (PMC, 2014)',
    'Scapular Dyskinesis Rehabilitation Guidelines'
  ]
);

-- Novo Protocolo: DOR FEMOROPATELAR (CONDILOMALELA)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Dor Femoropatelar - Protocolo Conservador',
  'Protocolo conservador para condromalácia patelar baseado em evidências',
  'Patologia',
  'Dor Femoropatelar',
  'Conservador',
  'Similar a PFPS: fortalecimento de quadríceps com ênfase em VMO, glúteo médio. Exercícios de cadeia cinética fechada (leg press 0-45°). Patellar taping para permitir exercícios. Alongamento de isquiotibiais e quadríceps. Evitar deep squats e stairs inicialmente.',
  'Exercícios que causam dor anterior significativa. Deep squats na fase aguda.',
  'Progressão baseada em dor. Retomar atividades gradativamente (stairs, agachamentos).',
  'Programa 8-12 semanas. Melhora gradual esperada.',
  'B',
  ARRAY[
    'JOSPT Physical Therapist-Guided Quadriceps Strengthening',
    'BJSM Quadriceps or hip exercises for PFPS (2023)',
    'Patellofemoral Pain Rehabilitation Guidelines'
  ]
);

-- Novo Protocolo: EPICONDILITE LATERAL (COTOVELO DE TENISTA)
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Epicondilite Lateral - Protocolo Tyler Twist',
  'Programa excêntrico evidenciado para epicondilite lateral',
  'Patologia',
  'Epicondilite Lateral',
  'Excêntrico',
  'Protocolo excêntrico com Theraband: Tyler Twist para extensores. 3 séries de 15 reps, 2x ao dia. Fase excêntrica lenta (3-5s), concêntrica rápida. Associar com alongamento de extensores e flexores. Exercícios de fortalecimento de músculos do antebraço e mão.',
  'Exercícios que causam dor >7/10. Atividades que exacerbam sintomas durante fase aguda.',
  'Dor moderada é esperada durante exercício. Monitorar resposta 24h após.',
  'Protocolo mínimo 6-12 semanas. Melhora geralmente após 6-8 semanas.',
  'B',
  ARRAY[
    'Tyler Twist eccentric exercise protocol',
    'Cochrane Review Tennis Elbow Treatment',
    'Physio-pedia Lateral Epicondylitis Rehabilitation'
  ]
);

-- Novo Protocolo: SÍNDROME DO TÚNEL DO CARPO
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Síndrome do Túnel do Carpo - Protocolo Conservador',
  'Reabilitação conservadora para síndrome do túnel do carpo leve a moderada',
  'Patologia',
  'Síndrome do Túnel do Carpo',
  'Conservador',
  'Exercícios de nerve gliding (tendon gliding e nerve gliding). Alongamento de flexores e extensores de punho. Exercícios de destreza digital. Uso de splint noturno em posição neutra. Ergonomia no trabalho essencial. Fortalecimento após fase aguda.',
  'Exercícios que exacerbam parestesias ou dor severa. Atividades repetitivas sem pausas.',
  'Exercícios devem ser feitos várias vezes ao dia. Pausas frequentes durante atividades.',
  'Programa 6-12 semanas. Cirurgia se sem melhora após 12 semanas ou se déficit neurológico progressivo.',
  'B',
  ARRAY[
    'Physio-pedia Carpal Tunnel Syndrome Rehabilitation',
    'AAOS Carpal Tunnel Syndrome Treatment Guidelines',
    'Nerve Gliding Exercises for CTS'
  ]
);

-- Novo Protocolo: ESCOLIOSE - EXERCÍCIOS ESSENCIAIS
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Escoliose - Schroth Method (Básico)',
  'Exercícios baseados no método Schroth para escoliose idiopática',
  'Patologia',
  'Escoliose',
  'Schroth Básico',
  'Princípios: correção postural consciente, alongamento de concavidade, fortalecimento de convexidade. Exercícios: correção em pronação, "muscle cylinder" breathing, correção em supino. Objetivo: reduzir curva, melhorar estética, reduzir dor. Requer instrução especializada.',
  'Exercícios de flexão exacerbada. Exercícios de alta carga na coluna.',
  'Deve ser supervisionado por fisioterapeuta treinado em Schroth. Progressão lenta e consistente.',
  'Programa mínimo 6-12 meses. Melhora mantida com exercícios de manutenção vitalícios.',
  'C',
  ARRAY[
    'Schroth Method for Scoliosis Research',
    'Physio-pedia Scoliosis Rehabilitation',
    'SEAS (Scientific Exercise Approach to Scoliosis) evidence'
  ]
);

-- Novo Protocolo: REABILITAÇÃO CARDÍACA - FASE I
INSERT INTO public.exercise_templates (name, description, category, condition_name, template_variant, clinical_notes, contraindications, precautions, progression_notes, evidence_level, bibliographic_references)
VALUES (
  'Reabilitação Cardíaca - Fase I Hospitalar',
  'Programa de exercícios iniciais para reabilitação cardíaca em ambiente hospitalar',
  'Cardiologia',
  'Pós-Evento Cardíaco',
  'Fase I',
  'Iniciar 24-48h pós-evento estável. Exercícios: circundução de MMSS, marcha em lugar, sentar-levantar, caminhada curta. Monitorização contínua de sinais vitais. Objetivos: prevenir deleterious effects do repouso, educar para fase II.',
  'Instabilidade hemodinâmica. Arritmias não controladas. Dor anginosa ativa. Alterações ECG isquêmicas.',
  'Monitorização contínua essencial. Interromper se: dor torácica, dispneia desproporcional, tontura, PA anormal. Progressão muito conservadora.',
  'Duração: durante internação (3-7 dias). Critérios para alta: deambulação independente, entender limites.',
  'A',
  ARRAY[
    'AACVPR Guidelines for Cardiac Rehabilitation',
    'WHO Cardiac Rehabilitation Recommendations',
    'AHA/ACC Cardiac Rehabilitation Guidelines'
  ]
);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
