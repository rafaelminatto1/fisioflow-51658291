-- Seed Clinical Tests Library (PhysioTests Pro)
-- Cleans up existing templates created by system (where organization_id is null) to avoid duplicates before reseeding
DELETE FROM clinical_test_templates WHERE organization_id IS NULL;

INSERT INTO clinical_test_templates (name, target_joint, category, purpose, execution, positive_sign, sensitivity_specificity, reference, tags, type, fields_definition) VALUES

-- JOELHO (Ortopedica)
(
  'Teste de Lachman', 'Joelho', 'Ortopedica',
  'Avaliar a integridade do Ligamento Cruzado Anterior (LCA).',
  'Paciente em decúbito dorsal. Joelho fletido a 20-30°. O examinador estabiliza o fêmur distal com uma mão e aplica uma força anterior na tíbia proximal com a outra mão.',
  'Translação anterior excessiva da tíbia em comparação ao lado oposto e/ou ''end-point'' (fim de curso) macio.',
  'Sensibilidade: 85%, Especificidade: 94%',
  'Torg JS, Conrad W, Kalen V. Clinical diagnosis of anterior cruciate ligament instability in the athlete. Am J Sports Med. 1976.',
  ARRAY['LCA', 'Ligamentar'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Pivot Shift', 'Joelho', 'Ortopedica',
  'Avaliar instabilidade rotacional anterolateral (LCA).',
  'Paciente em decúbito dorsal. O examinador segura o pé do paciente, roda internamente a tíbia, aplica estresse em valgo e flexiona o joelho lentamente a partir da extensão completa.',
  'Subluxação da tíbia seguida de redução súbita (clunk) em torno de 30-40° de flexão.',
  'Sensibilidade: 24%, Especificidade: 98%',
  'Galway HR, MacIntosh DL. The lateral pivot shift. Clin Orthop Relat Res. 1980.',
  ARRAY['LCA', 'Instabilidade Rotacional'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de McMurray', 'Joelho', 'Ortopedica',
  'Avaliar lesões meniscais.',
  'Decúbito dorsal. O examinador flexiona o quadril e joelho. Para menisco medial: rotação externa da tíbia + estresse em valgo ao estender. Para lateral: rotação interna + varo.',
  'Dor na linha articular ou estalido palpável/audível.',
  'Sensibilidade: 70%, Especificidade: 71%',
  'McMurray TP. The semilunar cartilages. Br J Surg. 1942.',
  ARRAY['Menisco'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Apley', 'Joelho', 'Ortopedica',
  'Diferenciar dor meniscal de ligamentar.',
  'Paciente em prono, joelho a 90°. Compressão axial + rotação (Menisco). Distração + rotação (Ligamento).',
  'Dor na compressão sugere menisco; dor na distração sugere ligamento.',
  'Variável',
  'Apley AG. The diagnosis of meniscus injuries. J Bone Joint Surg. 1947.',
  ARRAY['Menisco', 'Ligamentar'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Thessaly', 'Joelho', 'Ortopedica',
  'Avaliar lesões meniscais sob carga.',
  'Paciente em pé, apoio unipodal, joelho a 20° flexão. Realiza rotações do corpo sobre o joelho (3x cada lado).',
  'Dor na linha articular ou sensação de bloqueio/travamento.',
  'Sensibilidade: 90%, Especificidade: 96%',
  'Karachalios T, et al. The Thessaly test. J Bone Joint Surg Am. 2005.',
  ARRAY['Menisco', 'Carga'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Gaveta Anterior (Joelho)', 'Joelho', 'Ortopedica',
  'Avaliar a integridade do LCA.',
  'Joelho fletido a 90°. Examinador senta sobre o pé do paciente e puxa a tíbia anteriormente.',
  'Translação anterior > 6mm ou fim de curso macio.',
  'Sensibilidade: 92% (Crônica), Especificidade: 91%',
  'Magee DJ. Orthopedic Physical Assessment.',
  ARRAY['LCA'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),

-- JOELHO (Esportiva / Funcional)
(
  'Single Leg Hop Test', 'Joelho', 'Esportiva',
  'Avaliar potência e simetria de membros inferiores.',
  'O paciente salta em uma perna só o mais longe possível, aterrissando de forma estável na mesma perna. Média de 3 tentativas.',
  'Diferença > 10% na distância entre os membros (LSI < 90%).',
  'Confiabilidade Alta (ICC 0.96)',
  'Noyes FR, et al. Abnormal lower limb symmetry. Am J Sports Med. 1991.',
  ARRAY['Retorno ao Esporte', 'Potência'], 'functional_test', '[{"id": "distance_cm", "label": "Distância (cm)", "type": "number", "unit": "cm", "required": true}]'::jsonb
),
(
  'Drop Jump Test', 'Joelho', 'Esportiva',
  'Avaliar controle neuromuscular e risco de lesão (Valgo Dinâmico).',
  'Paciente cai de uma caixa (30cm) e salta verticalmente imediatamente. Avalia-se o alinhamento do joelho na aterrissagem.',
  'Colapso medial dos joelhos (distância inter-joelhos diminui) ou assimetria de carga.',
  'Variável (Análise de Vídeo Recomendada)',
  'Noyes FR, et al. The drop-jump screening test. Am J Sports Med. 2005.',
  ARRAY['Biomecânica', 'Prevenção'], 'functional_test', '[{"id": "valgus_score", "label": "Avaliação do Valgo", "type": "select", "options": ["Bom", "Médio", "Ruim"], "required": true}]'::jsonb
),
(
  'Y-Balance Test (Lower Quarter)', 'Joelho', 'Esportiva',
  'Avaliar estabilidade dinâmica e controle postural.',
  'Apoio unipodal, alcançando com a perna livre nas direções Anterior, Posteromedial e Posterolateral.',
  'Diferença > 4cm no alcance anterior ou pontuação composta assimétrica.',
  'Confiabilidade Inter-examinador: 0.85-0.93',
  'Plisky PJ, et al. Star Excursion Balance Test. J Orthop Sports Phys Ther. 2006.',
  ARRAY['Equilíbrio', 'Controle Motor'], 'functional_test', 
  '[{"id": "anterior_cm", "label": "Anterior (cm)", "type": "number", "required": true}, {"id": "pm_cm", "label": "Posteromedial (cm)", "type": "number", "required": true}, {"id": "pl_cm", "label": "Posterolateral (cm)", "type": "number", "required": true}]'::jsonb
),

-- OMBRO (Ortopedica)
(
  'Teste de Neer', 'Ombro', 'Ortopedica',
  'Identificar síndrome do impacto subacromial.',
  'O examinador estabiliza a escápula do paciente e realiza a elevação passiva forçada do braço em rotação interna e flexão.',
  'Dor na região anterior ou lateral do ombro.',
  'Sensibilidade: 79%, Especificidade: 53%',
  'Neer CS 2nd. Impingement lesions. Clin Orthop Relat Res. 1983.',
  ARRAY['Impacto', 'Manguito Rotador'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Hawkins-Kennedy', 'Ombro', 'Ortopedica',
  'Identificar impacto subacromial.',
  'Ombro e cotovelo fletidos a 90°. O examinador realiza uma rotação interna passiva rápida e forçada do úmero.',
  'Dor no ombro (impacto subacromial do tendão supraespinhal).',
  'Sensibilidade: 92%, Especificidade: 25%',
  'Hawkins RJ, Kennedy JC. Impingement syndrome. Am J Sports Med. 1980.',
  ARRAY['Impacto'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Jobe (Empty Can)', 'Ombro', 'Ortopedica',
  'Testar integridade do músculo Supraespinhal.',
  'Braços abduzidos a 90° no plano escapular (30° anterior), rotação interna completa (polegares para baixo). Resistência descendente.',
  'Dor ou fraqueza muscular.',
  'Sensibilidade: 44%, Especificidade: 90%',
  'Jobe FW, Moynes DR. Rotator cuff injuries. Am J Sports Med. 1982.',
  ARRAY['Supraespinhal', 'Manguito'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Speed', 'Ombro', 'Ortopedica',
  'Avaliar tendinopatia do bíceps ou lesão SLAP.',
  'Ombro flexionado a 90°, cotovelo estendido e antebraço supinado. Resistência contra flexão.',
  'Dor no sulco bicipital.',
  'Sensibilidade: 90%, Especificidade: 14%',
  'Bennett WF. Specificity of the Speed''s test. Arthroscopy. 1998.',
  ARRAY['Bíceps', 'SLAP'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de O''Brien (Active Compression)', 'Ombro', 'Ortopedica',
  'Diagnóstico de lesão SLAP ou patologia acromioclavicular.',
  'Flexão 90°, Adução 10°, Rot Interna. Resistência. Repetir em Rot Externa.',
  'Dor na RI que melhora na RE (Profunda = Labral, Superficial = AC).',
  'Sensibilidade: 100%, Especificidade: 98% (Estudo Original)',
  'O''Brien SJ, et al. The active compression test. Am J Sports Med. 1998.',
  ARRAY['Labrum', 'AC'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Apprehension', 'Ombro', 'Ortopedica',
  'Instabilidade anterior do ombro.',
  'Supino, abdução 90°, rotação externa máxima passiva.',
  'Paciente expressa apreensão/medo de luxação (Sinal de Apreensão).',
  'Especificidade Alta',
  'Rowe CR. Prognosis in dislocations of the shoulder. J Bone Joint Surg Am. 1956.',
  ARRAY['Instabilidade'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Relocation (Jobe)', 'Ombro', 'Ortopedica',
  'Confirmar instabilidade anterior (alívio da apreensão).',
  'Após teste de apreensão positivo, aplicar força posterior na cabeça do úmero.',
  'Redução da dor ou apreensão, permitindo maior rotação externa.',
  'Aumenta a especificidade do diagnóstico de instabilidade.',
  'Jobe FW, et al. Anterior capsulolabral reconstruction. Am J Sports Med. 1991.',
  ARRAY['Instabilidade'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),

-- QUADRIL E COLUNA (Ortopedica)
(
  'Teste de Thomas', 'Quadril', 'Ortopedica',
  'Avaliar encurtamento de iliopsoas e reto femoral.',
  'Decúbito dorsal. Paciente traz um joelho ao peito até retificar a lordose. Observa-se a perna oposta.',
  'A coxa oposta levanta da mesa (iliopsoas) ou o joelho estende (reto femoral).',
  'Variável',
  'Thomas HO. Diseases of the hip, knee and ankle joints. 1876.',
  ARRAY['Flexibilidade', 'Psoas'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de FABER (Patrick)', 'Quadril', 'Ortopedica',
  'Patologia do quadril ou disfunção sacroilíaca.',
  'Flexão, Abdução, Rotação Externa (formando um ''4''). Pressão no joelho e na EIAS oposta.',
  'Dor na virilha (quadril) ou na região posterior (SI).',
  'Sensibilidade: 88% (Doença intra-articular)',
  'Patrick J. Br Med J. 1917.',
  ARRAY['Sacroilíaca', 'Intra-articular'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Trendelenburg', 'Quadril', 'Ortopedica',
  'Avaliar força/função do Glúteo Médio.',
  'Paciente em apoio unipodal.',
  'Queda da pelve contralateral ao apoio.',
  'Sensibilidade Baixa, Especificidade Alta',
  'Hardcastle P. The significance of the Trendelenburg test. JBJS. 1985.',
  ARRAY['Glúteo Médio', 'Estabilidade'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Teste de Ober', 'Quadril', 'Ortopedica',
  'Avaliar encurtamento da banda iliotibial (BIT).',
  'Decúbito lateral. O examinador abduz e estende o quadril, depois permite a adução passiva (joelho flexionado).',
  'O joelho não toca a maca (permanece abduzido).',
  'Variável',
  'Ober FR. The role of the iliotibial band. JBJS. 1936.',
  ARRAY['Banda Iliotibial', 'Flexibilidade'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Straight Leg Raise (SLR)', 'Coluna', 'Ortopedica',
  'Avaliar irritação radicular lombar (L4-S1).',
  'Supino. Elevação passiva da perna estendida.',
  'Dor irradiada abaixo do joelho entre 30-70 graus.',
  'Sensibilidade: 91%, Especificidade: 26%',
  'Lasegue C. Archives Generales de Medecine. 1864.',
  ARRAY['Ciático', 'Lombar'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Slump Test', 'Coluna', 'Ortopedica',
  'Avaliar mecanossensibilidade neural.',
  'Sentado, mãos atrás das costas. 1. Flexão coluna 2. Flexão pescoço 3. Extensão joelho 4. Dorsiflexão.',
  'Reprodução dos sintomas que aliviam com a extensão cervical.',
  'Sensibilidade: 84%, Especificidade: 83%',
  'Maitland GD. The slump test. Aust J Physiother. 1985.',
  ARRAY['Neural', 'Ciático'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),

-- TORNOZELO (Ortopedica / Esportiva)
(
  'Teste de Thompson', 'Tornozelo', 'Ortopedica',
  'Diagnóstico de ruptura do tendão de Aquiles.',
  'Decúbito ventral, pés para fora da maca. Compressão manual da panturrilha.',
  'Ausência de flexão plantar passiva do tornozelo.',
  'Sensibilidade: 96%, Especificidade: 93%',
  'Thompson TC. A test for rupture of the plantaris tendon. JAMA. 1962.',
  ARRAY['Aquiles', 'Tendão'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Gaveta Anterior (Tornozelo)', 'Tornozelo', 'Ortopedica',
  'Avaliar integridade do ligamento talofibular anterior (LTFA).',
  'Estabilização da tíbia, tração anterior do calcâneo.',
  'Translação anterior excessiva e/ou clunk.',
  'Sensibilidade: 58%, Especificidade: 100% (Após 5 dias)',
  'Van Dijk CN. Physical examination of the ankle. 1996.',
  ARRAY['Entorse', 'Ligamentos'], 'special_test', '[{"id": "result", "label": "Resultado", "type": "select", "options": ["Positivo", "Negativo"], "required": true}]'::jsonb
),
(
  'Knee to Wall (Lunge Test)', 'Tornozelo', 'Esportiva',
  'Medir amplitude de dorsiflexão do tornozelo em cadeia fechada.',
  'Pé perpendicular à parede. Tocar joelho na parede sem elevar calcanhar. Medir distância hálux-parede.',
  'Distância < 10cm ou assimetria > 2cm.',
  'Confiabilidade Alta',
  'Bennell K, et al. Lunge measure of ankle dorsiflexion. Aust J Physiother. 1998.',
  ARRAY['Mobilidade', 'Dorsiflexão'], 'functional_test', '[{"id": "distance_cm", "label": "Distância (cm)", "type": "number", "required": true}]'::jsonb
),

-- PÓS OPERATÓRIO (PosOp)
(
  'Avaliação de Edema (Perimetria)', 'Joelho', 'PosOp',
  'Monitorar edema pós-operatório.',
  'Medição da circunferência (fita métrica) na linha articular, e 5/10/15cm acima e abaixo.',
  'Diferença > 1-2cm comparada ao lado oposto.',
  'N/A',
  'Protocolos de Reabilitação Padrão.',
  ARRAY['Edema', 'Monitoramento'], 'functional_test', '[{"id": "joint_line_cm", "label": "Linha Articular (cm)", "type": "number", "required": true}]'::jsonb
),
(
  'Teste de Extensão Passiva', 'Joelho', 'PosOp',
  'Verificar ganho de extensão completa pós-LCA.',
  'Calcanhar apoiado (Heel Prop), joelho suspenso. Medir goniometria ou distância poplítea.',
  'Incapacidade de atingir 0° (ou hiperextensão simétrica).',
  'Essencial para prevenir artrofibrose.',
  'Shelbourne KD. Accelerated rehabilitation after ACL. 1990.',
  ARRAY['ADM', 'LCA'], 'functional_test', '[{"id": "extension_deg", "label": "Graus de Extensão", "type": "number", "required": true}]'::jsonb
);

-- Note: This is an initial seed. Users can add more templates via the Admin UI.
