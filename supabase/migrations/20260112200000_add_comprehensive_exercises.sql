-- Migration: Adicionar exercícios completos ao banco de dados
-- Data: 2025-01-12
-- Descrição: Adiciona 50+ exercícios de fisioterapia organizados por categoria

-- ============================================
-- EXERCÍCIOS DE FORTALECIMENTO - MEMBRO INFERIOR
-- ============================================

-- Joelho
INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Agachamento com Suporte', 'Fortalecimento', 'Iniciante', ARRAY['Pós-Operatório LCA', 'Fraqueza Quadríceps'], ARRAY['Artrose Severa', 'Dor Aguda'], ARRAY['Quadríceps', 'Glúteos'], ARRAY['Cadeira', 'Barra'], 'Agachamento com apoio das mãos para segurança', 'Segure em uma cadeira ou barra. Flexione os joelhos até 45 graus, mantendo as costas retas. Retorne à posição inicial.'),

('Agachamento Parelde (Wall Sit)', 'Fortalecimento', 'Iniciante', ARRAY['Pós-Operatório Joelho', 'Fraqueza Quadríceps'], ARRAY['Patologia Patelar Aguda'], ARRAY['Quadríceps'], ARRAY['Parede'], 'Isométrico de quadríceps contra a parede', 'Apoie as costas na parede e desça até os joelhos em 90 graus. Mantenha a posição por 20-30 segundos.'),

('Leg Press 45°', 'Fortalecimento', 'Iniciante', ARRAY['Pós-Operatório LCA', 'Fraqueza MMII'], ARRAY['Dor Aguda Joelho'], ARRAY['Quadríceps', 'Glúteos'], ARRAY['Leg Press'], 'Fortalecimento de MMII em máquina', 'Sente-se no equipamento. Empurre a plataforma estendendo os joelhos. Controle o retorno. Arco de movimento limitado conforme fase.'),

('Extensão de Joelho em Cadeia Cinética Aberta', 'Fortalecimento', 'Intermediário', ARRAY['Pós-Operatório LCA Fase Tardia', 'Fraqueza Quadríceps'], ARRAY['Pós-Operatório LCA Precoce', 'Dor Femoropatelar'], ARRAY['Quadríceps'], ARRAY['Carga ankle', 'Polia'], 'Fortalecimento isolado do quadríceps', 'Sentado com joelho a 90°, estenda o joelho completamente. Retorne com controle. Pode adicionar carga no tornozelo.'),

('Flexão de Joelho em Pronação', 'Fortalecimento', 'Intermediário', ARRAY['Pós-Operatório Hamstring', 'Fraqueza Isquiotibiais'], ARRAY['Dor Aguda Posterior Joelho'], ARRAY['Isquiotibiais'], ARRAY['Carga ankle', 'Polia'], 'Fortalecimento dos isquiotibiais', 'Deitado de barriga para baixo, flexione o joelho aproximando o calcanhar do glúteo. Retorne com controle.'),

('Elevação de Panturrilha em Pé', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Tríceps Sural', 'Tendinopatia Aquiles'], ARRAY['Fratura Recente Tornozelo'], ARRAY['Panturrilha', 'Sóleo'], ARRAY['Parede', 'Step'], 'Fortalecimento de panturrilha', 'Em pé sobre a ponta dos pés, eleve os calcanhares o máximo possível. Mantenha 2 segundos e desça.'),

('Elevação de Panturrilha Sentado', 'Fortalecimento', 'Iniciante', ARRAY['Tendinopatia Aquiles', 'Fraqueza Sóleo'], ARRAY['Dor Aguda Tendão'], ARRAY['Sóleo'], ARRAY['Cadeira', 'Carga'], 'Fortalecimento do sóleo', 'Sentado com joelhos em 90°, eleve os calcanhares pressionando as coxas. Retorne com controle.'),

('Step Up', 'Fortalecimento', 'Intermediário', ARRAY['Pós-Operatório LCA', 'Fraqueza MMII'], ARRAY['Dor Aguda Joelho'], ARRAY['Quadríceps', 'Glúteos'], ARRAY['Step', 'Degrau'], 'Subida de degrau unilateral', 'Suba um degrau com uma perna, desça com a mesma. Mantenha o joelho alinhado. Alterne as pernas.'),

('Step Down', 'Fortalecimento', 'Intermediário', ARRAY['Pós-Operatório LCA', 'Instabilidade Patelo-femural'], ARRAY['Dor Aguda Joelho'], ARRAY['Quadríceps'], ARRAY['Step', 'Degrau'], 'Descida controlada de degrau', 'Em pé sobre um degrau, desça tocando o calcanhar oposto no chão. Retorne subindo. Mantenha o joelho alinhado.'),

('Afundo Frontal (Lunge)', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza MMII', 'Assimetria de Força'], ARRAY['Dor Aguda Joelho'], ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais'], ARRAY['Peso Corporal', 'Halteres'], 'Afundo unilateral para MMII', 'Dê um passo à frente e flexione ambos os joelhos a 90°. O joelho de trás quase toca o chão. Retorne à posição inicial.'),

('Ponte de Glúteo Bilateral', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Glúteos', 'Lombalgia'], ARRAY['Dor Lombar Aguda'], ARRAY['Glúteos', 'Isquiotibiais', 'Core'], ARRAY['Colchonete'], 'Fortalecimento de glúteos e posterior', 'Deitado dorsal, joelhos flexionados, eleve a pélvis até alinhamento ombro-quadril-joelho. Mantenha 2-3 segundos e desça.'),

('Ponte de Glúteo Unilateral', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Glúteos', 'Assimetria'], ARRAY['Dor Lombar Aguda'], ARRAY['Glúteo Médio', 'Glúteo Máximo'], ARRAY['Colchonete'], 'Ponte com uma perna estendida', 'Deitado dorsal, eleve a pélvis com uma perna flexionada e a outra estendida no ar. Mantenha 2-3 segundos.'),

('Abdução de Quadril em Pé', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Glúteo Médio', 'Joelho Valgo'], ARRAY['Dor Aguda Quadril'], ARRAY['Glúteo Médio'], ARRAY['Faixa Elástica', 'Parede'], 'Abertura lateral da perna', 'Em pé com faixa no tornozelo, abra a perna lateralmente contra resistência. Mantenha o tronco estável.'),

('Clamshell (Concha)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Glúteo Médio', 'Joelho Valgo'], ARRAY['Dor Aguda Quadril'], ARRAY['Glúteo Médio'], ARRAY['Colchonete', 'Faixa Elástica'], 'Abertura de joelhos deitado lateral', 'Deitado lateral com joelhos flexionados, abra o joelho de cima mantendo os pés juntos. Retorne com controle.'),

('Monster Walk (Caminhada Monster)', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Glúteos', 'Instabilidade Joelho'], ARRAY['Dor Aguda Quadril'], ARRAY['Glúteos'], ARRAY['Faixa Elástica'], 'Caminhada lateral com faixa elástica', 'Com faixa nos tornozelos, caminhe lateralmente mantendo tensão. Mantenha semiflexão de joelhos.'),

('Deadlift (Levantamento Terra) com Halteres', 'Fortalecimento', 'Intermediário', ARRAY['Fortalecimento Posterior', 'Prevenção Lombalgia'], ARRAY['Hérnia Discal Aguda'], ARRAY['Glúteos', 'Isquiotibiais', 'Eretores Espinhais'], ARRAY['Halteres', 'Barra'], 'Levantamento de peso do chão', 'Com pés na largura dos ombros, flexione quadril mantendo coluna reta. Segure o peso e retorne à posição inicial.'),

('RDL (Romanian Deadlift)', 'Fortalecimento', 'Avançado', ARRAY['Fortalecimento Isquiotibiais', 'Potência'], ARRAY['Dor Lombar'], ARRAY['Isquiotibiais', 'Glúteos'], ARRAY['Halteres', 'Barra'], 'Deadlift com joelhos semi-flexionados', 'Com joelhos levemente flexionados, incline tronco à frente mantendo coluna reta. Sinta alongar posterior. Retorne.');

-- Quadril
INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('4 Apoios (Four Point kneeling)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Core', 'Lombalgia'], ARRAY['Dor Aguda Coluna'], ARRAY['Core', 'Ombros'], ARRAY['Colchonete'], 'Estabilização de coluna em 4 apoios', 'Apoie mãos e joelhos. Eleve um braço ou perna mantendo coluna neutra. Alterne lados.'),

('Bird-dog (Cachorro e Pássaro)', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Core', 'Instabilidade Lombar'], ARRAY['Dor Aguda Coluna'], ARRAY['Core', 'Glúteos'], ARRAY['Colchonete'], 'Extensão oposta braço-perna', 'Em 4 apoios, estenda braço oposto à perna elevada. Mantenha coluna neutra. Retorne e alterne.'),

('Prancha Abdominal (Plank)', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Core', 'Prevenção Lombalgia'], ARRAY['Dor Aguda Coluna'], ARRAY['Core', 'Abdômen'], ARRAY['Colchonete'], 'Isométrico de core em antebraço', 'Apoie antebraços e ponta dos pés. Mantenha corpo em linha reta. Contraia abdômen e glúteos.'),

('Side Plank (Prancha Lateral)', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Oblíquos', 'Lombalgia'], ARRAY['Dor Aguda Coluna'], ARRAY['Oblíquos', 'Core'], ARRAY['Colchonete'], 'Isométrico de oblíquos', 'Deitado lateral, apoie antebraço. Eleve pélvis mantendo corpo reto. Mantenha 20-30 segundos.'),

('Dead Bug', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Core', 'Lombalgia'], ARRAY['Dor Aguda Coluna'], ARRAY['Core', 'Abdômen'], ARRAY['Colchonete'], 'Estabilização dinâmica de core', 'Deitado dorsal com braços e pernas elevados. Estenda braço oposto à perna mantendo lombar no chão. Retorne e alterne.'),

('Abdominal Crupeado', 'Fortalecimento', 'Iniciante', ARRAY['Fortalecimento Abdômen'], ARRAY['Dor Lombar', 'Hérnia Discal'], ARRAY['Abdômen'], ARRAY['Colchonete'], 'Flexão de tronco clássico', 'Deitado dorsal, joelhos flexionados, mãos atrás da cabeça. Eleve tronco contraindo abdômen. Retorne com controle.'),

('Abdominal Oblíquo', 'Fortalecimento', 'Intermediário', ARRAY['Fortalecimento Oblíquos'], ARRAY['Dor Lombar'], ARRAY['Oblíquos'], ARRAY['Colchonete'], 'Rotação de tronco para oblíquos', 'Deitado dorsal, uma mão atrás da cabeça. Elevar ombro contralateral ao joelho flexionado. Alterne lados.');

-- ============================================
-- EXERCÍCIOS DE FORTALECIMENTO - MEMBRO SUPERIOR
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Rotação Externa de Ombro com Faixa', 'Fortalecimento', 'Iniciante', ARRAY['Tendinopatia Manguito', 'Instabilidade Ombro'], ARRAY['Bursite Aguda', 'Lesão SLAP'], ARRAY['Manguito Rotador'], ARRAY['Faixa Elástica'], 'Rotação externa com cotovelo apoiado', 'Cotovelo colado ao corpo a 90°. Segure faixa com mão afetada. Rode para fora contra resistência. Retorne com controle.'),

('Rotação Interna de Ombro com Faixa', 'Fortalecimento', 'Iniciante', ARRAY['Tendinopatia Manguito'], ARRAY['Instabilidade Anterior', 'Lesão SLAP'], ARRAY['Manguito Rotador', 'Peitoral Maior'], ARRAY['Faixa Elástica'], 'Rotação interna contra resistência', 'Cotovelo colado ao corpo a 90°. Segure faixa com mão sadia. Rode para dentro contra resistência. Retorne com controle.'),

('Elevação Lateral de Ombro (0-90°)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Deltóide', 'Manguito Rotador'], ARRAY['Síndrome Impacto', 'Bursite Subacromial'], ARRAY['Deltóide Médio', 'Manguito'], ARRAY['Halteres', 'Faixa'], 'Abdução de ombro até 90°', 'Em pé ou sentado, eleve braço lateralmente até 90°. Mantenha 2 segundos e desça com controle. Não acima de 90°.'),

('Elevação Frontal de Ombro', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Deltóide Anterior'], ARRAY['Síndrome Impacto'], ARRAY['Deltóide Anterior'], ARRAY['Halteres', 'Faixa'], 'Flexão de ombro', 'Em pé, eleve braço à frente até 90°. Mantenha 2 segundos e desça com controle.'),

('Extensão de Ombro em Pronação', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Deltóide Posterior', 'Manguito'], ARRAY['Dor Aguda Ombro'], ARRAY['Deltóide Posterior'], ARRAY['Halteres', 'Faixa'], 'Extensão de ombro deitado', 'Deitado de barriga para baixo, braço pendente. Eleve braço para trás até o tronco. Retorne com controle.'),

('Prone Y-T-W', 'Fortalecimento', 'Intermediário', ARRAY['Tendinopatia Manguito', 'Instabilidade'], ARRAY['Impacto Agudo'], ARRAY['Manguito', 'Deltóide', 'Rombóides'], ARRAY['Colchonete', 'Halteres'], 'Exercício em Y, T e W deitado', 'Deitado de barriga para baixo, eleve braços formando Y, T e W. Mantenha cada posição 2-3 segundos.'),

('Push-up Plus', 'Fortalecimento', 'Intermediário', ARRAY['Tendinopatia Manguito', 'Serrátil'], ARRAY['Dor Aguda Ombro'], ARRAY['Serrátil Anterior', 'Peitoral', 'Tríceps'], ARRAY['Chão', 'Parede'], 'Flexão de braço com protração extra', 'Em posição de flexão de braços, desça e suba. No topo, protraia escápulas adicionamente. Retorne.'),

('Rowing com Faixa Elástica', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Rombóides', 'Postura Corcunda'], ARRAY['Dor Aguda Coluna'], ARRAY['Rombóides', 'Deltóide Posterior', 'Bíceps'], ARRAY['Faixa Elástica'], 'Puxada horizontal', 'Segure faixa à frente com braços estendidos. Puxe para trás squeezing escápulas. Retorne com controle.'),

('Remada Curvada (Barbell Row)', 'Fortalecimento', 'Avançado', ARRAY['Fortalecimento Dorso', 'Postura'], ARRAY['Dor Lombar'], ARRAY['Dorsais', 'Rombóides', 'Bíceps'], ARRAY['Barra', 'Halteres'], 'Puxada de barra com tronco inclinado', 'Incline tronco à frente mantendo coluna reta. Puxe barra direcionando cotovelos para trás. Retorne com controle.'),

('Face Pull', 'Fortalecimento', 'Intermediário', ARRAY['Fraqueza Rombóides', 'Manguito Posterior'], ARRAY['Dor Aguda Ombro'], ARRAY['Rombóides', 'Manguito', 'Deltóide Posterior'], ARRAY['Polia', 'Rope'], 'Puxada em direção ao rosto', 'Na polia alta, use rope. Puxe em direção ao rosto abduzindo ombros. Retorne com controle.'),

('Flexão de Cotovelo (Bicep Curl)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Bíceps', 'Reabilitação Cotovelo'], ARRAY['Epicondilite Lateral'], ARRAY['Bíceps Braquial'], ARRAY['Halteres', 'Faixa', 'Barra'], 'Flexão de cotovelo', 'Em pé com halteres, flexione cotovelos elevando as mãos aos ombros. Retorne com controle.'),

('Extensão de Cotovelo (Tricep)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Tríceps', 'Instabilidade Cotovelo'], ARRAY['Epicondilite Medial'], ARRAY['Tríceps Braquial'], ARRAY['Halteres', 'Faixa'], 'Extensão de cotovelo', 'Em pé com halter sobre a cabeça, estenda cotovelo. Retorne com controle. Alternativa: sentado com apoio.'),

('Extensão de Punho', 'Fortalecimento', 'Iniciante', ARRAY['Epicondilite Lateral', 'Fraqueza Extensores'], ARRAY['Dor Aguda Punho'], ARRAY['Extensores Punho'], ARRAY['Halteres', 'Faixa'], 'Extensão de punho com carga', 'Antebraço apoiado, halter na mão. Estenda punho e retorne com controle.'),

('Flexão de Punho', 'Fortalecimento', 'Iniciante', ARRAY['Epicondilite Medial', 'Fraqueza Flexores'], ARRAY['Dor Aguda Punho'], ARRAY['Flexores Punho'], ARRAY['Halteres', 'Faixa'], 'Flexão de punho com carga', 'Antebraço apoiado, palma para cima. Flexione punho e retorne com controle.'),

('Desvio Radial de Punho', 'Fortalecimento', 'Iniciante', ARRAY['Tendinopatia De Quervain', 'Fraqueza ABD'], ARRAY['Dor Aguda Punho'], ARRAY['Abdutor Curto', 'Extensor Longo'], ARRAY['Halteres', 'Faixa'], 'Abdução do polegar com punho fechado', 'Punho fechado, polegar estendido. Mova punho em direção ao polegar contra carga. Retorne.'),

('Squeeze de Bola (Espalmar)', 'Fortalecimento', 'Iniciante', ARRAY['Fraqueza Mão', 'Síndrome Túnel Carpo'], ARRAY['Dor Aguda Punho'], ARRAY['Mão', 'Dedos'], ARRAY['Bola', 'Espalmar'], 'Apertar bola de borracha', 'Segure bola espremedora. Aperte e segure 3-5 segundos. Relaxe e repita.'),

('Extensão de Dedos', 'Fortalecimento', 'Iniciante', ARRAY['Garras dos Dedos', 'Fraqueza Extensores'], ARRAY['Dor Aguda Dedos'], ARRAY['Extensores Dedos'], ARRAY['Borracha'], 'Abertura dos dedos contra borracha', 'Dedos unidos com borracha em volta. Abra dedos contra resistência. Retorne.');

-- ============================================
-- EXERCÍCIOS DE ALONGAMENTO
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Alongamento de Isquiotibiais em Pé', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Isquiotibiais', 'Lombalgia'], ARRAY['Lesão Aguda Hamstring'], ARRAY['Isquiotibiais'], ARRAY[''], 'Alongamento de posterior em pé', 'Em pé, elevar um pé apoiado em superfície elevada. Incline tronco à frente mantendo coluna reta. Segure 30 segundos.'),

('Alongamento de Quadríceps em Pé', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Quadríceps'], ARRAY['Prótese Joelho'], ARRAY['Quadríceps'], ARRAY['Parede'], 'Alongamento de anterior de coxa', 'Em pé apoie uma mão na parede. Flexione joelho oposto levando calcanhar ao glúteo. Segure 30 segundos.'),

('Alongamento de Panturrilha na Parede', 'Alongamento', 'Iniciante', ARRAY['Encurtação Tríceps Sural', 'Fascite Plantar'], ARRAY['Fratura Recente'], ARRAY['Panturrilha', 'Sóleo'], ARRAY['Parede'], 'Alongamento de gastrocnêmio', 'Apoie mãos na parede, um pé à frente. Flexione joelho anterior mantendo posterior estendido. Segure 30s.'),

('Alongamento de Panturrilha Sentado (Sóleo)', 'Alongamento', 'Iniciante', ARRAY['Encurtação Sóleo', 'Tendinopatia Aquiles'], ARRAY['Fratura Recente'], ARRAY['Sóleo'], ARRAY[''], 'Alongamento de sóleo sentado', 'Sentado com joelho flexionado, puxe o pé em dorsiflexão mantendo joelho flexionado. Segure 30 segundos.'),

('Alongamento de Glúteo Supino', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Glúteos', 'Lombalgia'], ARRAY['Prótese Quadril'], ARRAY['Glúteos', 'Piriforme'], ARRAY['Colchonete'], 'Alongamento posterior de quadril', 'Deitado dorsal, cruzar uma perna sobre a coxa oposta. Puxar a coxa flexionada em direção ao tórax. Segure 30s.'),

('Alongamento de Psoas (Ilíaco)', 'Alongamento', 'Iniciante', ARRAY['Encurtação Psoas', 'Hiperlordose'], ARRAY['Prótese Quadril'], ARRAY['Psoas', 'Ilíaco'], ARRAY['Colchonete'], 'Alongamento de flexor de quadril', 'Ajoelhe com uma perna à frente. Incline tronco à frente elevando braço do lado ajoelhado. Segure 30s.'),

('Alongamento de Adutores', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Adutores'], ARRAY['Dor Aguda Quadril'], ARRAY['Adutores'], ARRAY['Colchonete'], 'Abertura de pernas sentado', 'Sentado com solas dos pés juntas, empurre joelhos em direção ao chão. Incline tronco à frente. Segure 30s.'),

('Gato-Vaca (Cat-Cow)', 'Alongamento', 'Iniciante', ARRAY['Rigidez Coluna', 'Lombalgia Crônica'], ARRAY['Hérnia Aguda', 'Estenose'], ARRAY['Coluna', 'Core'], ARRAY['Colchonete'], 'Mobilização de coluna em 4 apoios', 'Em 4 apoios, arredonde coluna inspirando (gato). Depois arqueie coluna expirando (vaca). Repita 10 vezes.'),

('Alongamento de Rombóides na Parede', 'Alongamento', 'Iniciante', ARRAY['Postura Corcunda', 'Rigidez Dorso'], ARRAY['Dor Aguda Ombro'], ARRAY['Rombóides', 'Dorsais'], ARRAY['Parede'], 'Alongamento de dorso em parede', 'De pé de frente para parede, apoie mãos. Afastar-se da parede mantendo braços estendidos. Segure 30s.'),

('Alongamento de Peitoral na Porta', 'Alongamento', 'Iniciante', ARRAY['Ombros Rolidos Anteriormente'], ARRAY['Dor Aguda Ombro'], ARRAY['Peitoral Maior e Menor'], ARRAY['Porta'], 'Alongamento de peitoral', 'Apoie antebraços em batente de porta com cotovelos a 90°. Incline corpo à frente. Segure 30s.'),

('Alongamento de Bíceps na Parede', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Bíceps'], ARRAY['Tendinite Aguda'], ARRAY['Bíceps'], ARRAY['Parede'], 'Alongamento de bíceps braquial', 'De frente para parede, apoie mão com palma para baixo. Estenda cotovelo e gire corpo oposto. Segure 30s.'),

('Alongamento de Tríceps por Trás', 'Alongamento', 'Iniciante', ARRAY['Encurtamento Tríceps'], ARRAY['Dor Aguda Ombro'], ARRAY['Tríceps'], ARRAY[''], 'Alongamento de posterior de braço', 'Leve um braço atrás da cabeça. Com a outra mão, puxe o cotovelo em direção à cabeça. Segure 30s.');

-- ============================================
-- EXERCÍCIOS DE EQUILÍBRIO E PROPRIOCEPÇÃO
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Equilíbrio Unipodal Solo', 'Equilíbrio', 'Iniciante', ARRAY['Instabilidade Tornozelo', 'Fraqueza MMII'], ARRAY['Fratura Recente'], ARRAY['Tornozelo', 'Panturrilha'], ARRAY[''], 'Manter-se sobre uma perna', 'Em pé, eleve uma perna mantendo equilíbrio na outra. Comece com olhos abertos 30s, progredindo para olhos fechados.'),

('Equilíbrio em Disco Instável', 'Equilíbrio', 'Intermediário', ARRAY['Pós-Entorse Tornozelo', 'Instabilidade Joelho'], ARRAY['Fratura Recente'], ARRAY['Tornozelo', 'Joelho', 'Core'], ARRAY['Disco Equilíbrio'], 'Equilíbrio sobre superfície instável', 'Em pé sobre disco de equilíbrio, mantenha equilíbrio unipodal. Progredir com olhos fechados e movimentos de braço.'),

('Agachamento em Disco Instável', 'Equilíbrio', 'Avançado', ARRAY['Pós-Operatório LCA Tardia', 'Prevenção Entorses'], ARRAY['Dor Aguda Joelho'], ARRAY['Joelho', 'Tornozelo', 'Core'], ARRAY['Disco Equilíbrio'], 'Mini agachamento sobre disco', 'Em pé sobre disco, realize mini agachamentos mantendo equilíbrio. Mantenha joelhos alinhados.'),

('Star Excursion Balance Test (SEBT)', 'Equilíbrio', 'Avançado', ARRAY['Pós-Operatório LCA', 'Instabilidade Crônica'], ARRAY['Dor Aguda Joelho'], ARRAY['Joelho', 'Tornozelo', 'Core'], ARRAY[''], 'Alcance em 8 direções unipodal', 'Em pé sobre uma perna, alcance a outra perna em 8 direções. Retorne e repita. Testa equilíbrio dinâmico.'),

('Tandem Walk (Caminhada em Tandem)', 'Equilíbrio', 'Iniciante', ARRAY['Ataxia', 'Distúrbios Equilíbrio'], ARRAY['Fratura Recente'], ARRAY['Tornozelo', 'Core'], ARRAY[''], 'Caminhada em linha heel-to-toe', 'Caminhe em linha reta colocando um pé diretamente à frente do outro, calcanhar tocando a ponta do pé oposto.'),

('Single Leg Stance com Movimento de Braço', 'Equilíbrio', 'Intermediário', ARRAY['Instabilidade Tornozelo', 'Pós-LCA'], ARRAY['Fratura Recente'], ARRAY['Core', 'Tornozelo'], ARRAY[''], 'Equilíbrio dinâmico com braço', 'Em unipodal, mova braço em diferentes direções mantendo equilíbrio. Aumenta dificuldade progressivamente.'),

('BOSU Ball Squat', 'Equilíbrio', 'Intermediário', ARRAY['Propriocepção', 'Pós-Operatório Tardio'], ARRAY['Dor Aguda Joelho'], ARRAY['Joelho', 'Core', 'Tornozelo'], ARRAY['BOSU'], 'Agachamento sobre BOSU', 'Em pé sobre BOSU (plano ou invertido), realize agachamentos controlados mantendo equilíbrio.'),

('Mini-Landing Protocol', 'Equilíbrio', 'Avançado', ARRAY['Pós-LCA Fase Retorno Esporte'], ARRAY['Dor Aguda Joelho'], ARRAY['Joelho', 'Tornozelo', 'Core'], ARRAY['Step', 'Caixa'], 'Salto e aterrissagem controlada', 'Suba em caixa e salte para frente. Aterre suavemente com joelhos flexionados. Progreda altura e direções.');

-- ============================================
-- EXERCÍCIOS DE MOBILIDADE
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Mobilização Patelar', 'Mobilidade', 'Iniciante', ARRAY['Pós-Operatório Joelho', 'Rigidez Patelar'], ARRAY['Fratura Patela'], ARRAY['Patela'], ARRAY[''], 'Deslizamento da patela', 'Com joelho estendido, deslize patela medialmente, lateralmente, proximal e distal. 10 repetições cada direção.'),

('Mobilização de Tornozelo em DF', 'Mobilidade', 'Iniciante', ARRAY['Rigidez Tornozelo', 'Dorsiflexão Limitada'], ARRAY['Fratura Recente'], ARRAY['Tornozelo'], ARRAY['Faixa', 'Toalha'], 'Mobilização de dorsiflexão', 'Sentado com joelho estendido, use faixa em torno do antepé. Puxe em dorsiflexão. Segure 30s.'),

('Mobilização de Ombro com Bastão', 'Mobilidade', 'Iniciante', ARRAY['Rigidez Ombro', 'Capsulite Inicial'], ARRAY['Dor Aguda', 'Instabilidade'], ARRAY['Ombro'], ARRAY['Bastão'], 'Mobilização ativo-assistida', 'Deitado, segure bastão com ambas mãos. Use braço sadio para mover braço afetado em elevação, rotação, etc.'),

('Codman Pendular', 'Mobilidade', 'Iniciante', ARRAY['Dor Ombro', 'Capsulite', 'Pós-Cirúrgico'], ARRAY['Instabilidade'], ARRAY['Ombro'], ARRAY[''], 'Pendular de braço relaxado', 'Incline tronco à frente deixando braço pendente. Balance braço suavemente usando momentum corporal.'),

('Mobilização de Coluna Thorácica com Foam Roller', 'Mobilidade', 'Intermediário', ARRAY['Rigidez Torácica', 'Cifose'], ARRAY['Fratura Vertebral'], ARRAY['Coluna Torácica'], ARRAY['Foam Roller'], 'Extensão de torácica no rolo', 'Deitado sobre rolo abaixo da escápula, com mãos behind head. Estenda coluna sobre o rolo. Retorne.'),

('SLR com Dorsiflexão Automática', 'Mobilidade', 'Iniciante', ARRAY['Rigidez Isquiotibiais', 'Lombalgia'], ARRAY['Lesão Aguda Hamstring'], ARRAY['Isquiotibiais', 'Nervo Ciático'], ARRAY['Toalha', 'Faixa'], 'Elevação de perna com dorsiflexão', 'Deitado dorsal, eleve perna estendida com toalha. Ao alongar, adicione dorsiflexão de tornozelo.'),

('Mobilização de Nervo Ciático (Slump)', 'Mobilidade', 'Intermediário', ARRAY['Ciatalgia', 'Rigidez Neural'], ARRAY['Sinal de Lasegue +'], ARRAY['Nervo Ciático'], ARRAY[''], 'Mobilização neural em sedestação', 'Sentado, coluna em flexão, perna estendida, dorsiflexão. Progredir tensionando lentamente e retornando.'),

('Mobilização de Quadril (Capsular)', 'Mobilidade', 'Intermediário', ARRAY['Rigidez Quadril', 'Artrose Inicial'], ARRAY['Prótese Quadril'], ARRAY['Quadril', 'Cápsula Articular'], ARRAY[''], 'Mobilização em 4 direções', 'Deitado dorsal, mova perna em padrões capsulares: flexão, abdução, rotação externa/interna.'),

('Thomas Test Stretch', 'Mobilidade', 'Iniciante', ARRAY['Encurtamento Psoas', 'Hiperlordose'], ARRAY['Prótese Quadril'], ARRAY['Psoas', 'Quadril'], ARRAY['Mesa', 'Colchonete'], 'Teste/alongamento de Thomas', 'Sentado na borda da mesa, deite-se trazendo joelhos ao peito. Deixe uma perna descer livremente.'),

('Mobilização de Escápula (Wall Slides)', 'Mobilidade', 'Iniciante', ARRAY['Dismotilidade Escapular', 'Ombro Doloroso'], ARRAY['Dor Aguda'], ARRAY['Escápula', 'Ombro'], ARRAY['Parede'], 'Deslizamento de escápula na parede', 'De costas para parede, antebraços apoiados. Deslize braços acima realizando flexão e abdução.'),

('Mobilização de Nervo Mediano (Tinel e Phalen)', 'Mobilidade', 'Iniciante', ARRAY['Síndrome Túnel Carpo', 'Rigidez Neural'], ARRAY['Dor Aguda Punho'], ARRAY['Nervo Mediano'], ARRAY[''], 'Mobilização de nervo mediano', 'Mãos em oração, punhos em flexão máxima (Phalen). Percorrer nervo (Tinel). Segure 30s.'),

('Mobilização de Nervo Ulnar', 'Mobilidade', 'Iniciante', ARRAY['Compressão Nervo Ulnar', 'Rigidez Neural'], ARRAY['Dor Aguda Cotovelo'], ARRAY['Nervo Ulnar'], ARRAY[''], 'Mobilização do nervo ulnar', 'Mão em "OK sign", punho em extensão, cotovelo em extensão. Progredir tensionamento.');

-- ============================================
-- EXERCÍCIOS FUNCIONAIS
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Gait Training com Obstáculos', 'Funcional', 'Intermediário', ARRAY['Pós-Operatório LCA', 'Reabilitação Marcha'], ARRAY['Dor Aguda Joelho'], ARRAY['Marcha', 'Equilíbrio', 'MMII'], ARRAY['Cones', 'Obstáculos'], 'Marcha com desvio de obstáculos', 'Caminhe desviando obstáculos baixos. Progredir altura e distância. Treina padrão de marcha adaptado.'),

('Descida de Escada', 'Funcional', 'Intermediário', ARRAY['Pós-Operatório Joelho', 'Fraqueza MMII'], ARRAY['Dor Aguda'], ARRAY['MMII', 'Marcha'], ARRAY['Escada', 'Corrimão'], 'Treino de descida de escadas', 'Descenha escada usando corrimão. Pé afetado primeiro, depois sadio. Progredir sem corrimão.'),

('Subida de Escada', 'Funcional', 'Iniciante', ARRAY['Pós-Operatório Joelho', 'Fraqueza MMII'], ARRAY['Dor Aguda'], ARRAY['MMII', 'Marcha'], ARRAY['Escada', 'Corrimão'], 'Treino de subida de escadas', 'Suba escada usando corrimão. Pé sadio primeiro, depois afetado. Progredir sem corrimão.'),

('Sit-to-Stand', 'Funcional', 'Iniciante', ARRAY['Pós-Operatório Quadril', 'Fraqueza MMII', 'Idosos'], ARRAY['Dor Aguda Joelho'], ARRAY['MMII', 'Core'], ARRAY['Cadeira'], 'Levantar e sentar da cadeira', 'Sentado na cadeira, levante-se sem usar mãos. Retorne sentando-se lentamente. 10-15 repetições.'),

('Carregamento Lateral', 'Funcional', 'Intermediário', ARRAY['Propriocepção', 'Pós-LCA'], ARRAY['Dor Aguda Joelho'], ARRAY['Core', 'MMII', 'Equilíbrio'], ARRAY['Haltermes', 'Medicine Ball'], 'Deslocamento lateral com carga', 'Em semiflexão, desloque-se lateralmente lançando e recebendo medicine ball. Treina propriocepção e core.'),

('Lunge com Rotação', 'Funcional', 'Intermediário', ARRAY['Core', 'Pós-LCA Tardio'], ARRAY['Dor Aguda Joelho'], ARRAY['Core', 'MMII'], ARRAY['Medicine Ball', 'Haltermes'], 'Afundo com rotação de tronco', 'Em afundo frontal, rotacione tronco para o lado da perna anterior. Retorne e alterne lados.'),

('Squat Jump', 'Funcional', 'Avançado', ARRAY['Pós-LCA Fase Retorno Esporte', 'Potência'], ARRAY['Dor Aguda Joelho'], ARRAY['MMII', 'Potência'], ARRAY[''], 'Agachamento com salto', 'Agachamento parcial, salte explosivamente. Aterre suavemente com joelhos flexionados. 10-15 repetições.'),

('Box Jump', 'Funcional', 'Avançado', ARRAY['Pós-LCA Retorno Esporte', 'Pliometria'], ARRAY['Dor Aguda Joelho'], ARRAY['MMII', 'Potência'], ARRAY['Caixa', 'Step'], 'Salto sobre caixa', 'Em semi-agachamento, salte sobre caixa. Aterre suavemente. Desça pela caixa (não salte para baixo).'),

('Burpee Modificado', 'Funcional', 'Avançado', ARRAY['Condicionamento Geral', 'Core'], ARRAY['Dor Ombro', 'Dor Joelho'], ARRAY['Core', 'MMII', 'Condicionamento'], ARRAY[''], 'Exercício composto completo', 'Agache, mãos no chão, chute pernas atrás, retorna, agache e salte. Modificado conforme necessário.'),

('Carrying de Carga (Farmer Walk)', 'Funcional', 'Intermediário', ARRAY['Core', 'Grip Strength', 'Postura'], ARRAY['Dor Lombar'], ARRAY['Core', 'Mãos', 'MMII'], ARRAY['Haltermes', 'Kettlebells'], 'Caminhada carregando peso', 'Carregue halteres em ambas mãos e caminhe mantendo postura ereta. Aumenta distância progressivamente.');

-- ============================================
-- EXERCÍCIOS RESPIRATÓRIOS
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Respiração Diafragmática', 'Respiratório', 'Iniciante', ARRAY['Ansiedade', 'Dor Lombar', 'Disfunção Diafragma'], ARRAY[''], ARRAY['Diafragma', 'Core'], ARRAY[''], 'Respiração profunda abdominal', 'Deitado dorsal, mão no abdômen. Respire profundamente sentindo mão elevar. Exale lentamente. 10 respirações.'),

('Respiração Costal Inferior', 'Respiratório', 'Iniciante', ARRAY['Respiração Superior Predominante', 'Dor Cervical'], ARRAY[''], ARRAY['Diafragma', 'Costelas'], ARRAY[''], 'Expansão de base de tórax', 'Deitado, mãos nas costelas inferiores. Respire expandindo lateralmente. Evite elevação de ombros.'),

('Respiração 4-7-8', 'Respiratório', 'Iniciante', ARRAY['Ansiedade', 'Insônia', 'Estresse'], ARRAY[''], ARRAY['Diafragma'], ARRAY[''], 'Técnica respiratória relaxante', 'Inspire em 4 segundos, segure 7, expire em 8. Reduz ansiedade e ativa parassimpático.'),

('Respiração com Labios Franzidos (Pursed Lip)', 'Respiratório', 'Iniciante', ARRAY['DPOC', 'Dispneia', 'Ansiedade'], ARRAY[''], ARRAY['Diafragma', 'Pulmões'], ARRAY[''], 'Expiração prolongada resistida', 'Inspire pelo nariz, expire lentamente por lábios franzidos como assoprando vela. Melhora oxigenação.'),

('Huff Cough', 'Respiratório', 'Iniciante', ARRAY['DPOC', 'Expectoração', 'Pneumonia'], ARRAY[''], ARRAY['Diafragma', 'Abdômen'], ARRAY[''], 'Tosse com expiração forçada', 'Respire fundo, segure, expire com "ha" forçado (huff). Ajuda a mobilizar secreções.'),

('Espirometria Incentivada', 'Respiratório', 'Iniciante', ARRAY['Pós-Operatório Abdominal', 'Pneumonia', 'Atelectasia'], ARRAY[''], ARRAY['Pulmões', 'Diafragma'], ARRAY['Espirometro'], 'Respiração com feedback visual', 'Use espirômetro incentivador. Respire fundo elevando as esferas. 10-15 repetições.'),

('Expansão Torácica unilateral', 'Respiratório', 'Intermediário', ARRAY['Atelectasia', 'Pós-Operatório Torácico'], ARRAY[''], ARRAY['Pulmões', 'Costelas'], ARRAY[''], 'Expansão de um pulmão isoladamente', 'Deitado sobre lado não afetado, inspire profundamente expandindo pulmão superior. 10 respirações.');

-- ============================================
-- EXERCÍCIOS DE RELAXAMENTO
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Relaxamento Progressivo de Jacobson', 'Relaxamento', 'Iniciante', ARRAY['Ansiedade', 'Tensão Muscular', 'Insônia'], ARRAY[''], ARRAY['Todos'], ARRAY[''], 'Tensão e relaxamento muscular progressivo', 'Deitado, tensione cada grupo muscular por 5s, relaxe por 10s. Progredir por todo corpo.'),

('Rolling com Foam Roller', 'Relaxamento', 'Iniciante', ARRAY['Dor Muscular', 'Faixa Fascial Restrita'], ARRAY['Osteoporose', 'Fratura'], ARRAY['Fáscia', 'Músculos'], ARRAY['Foam Roller'], 'Automassagem com rolo', 'Role sobre áreas tensionadas por 30-60s. Evite articulações e áreas dolorosas agudas.'),

('Stretching Global Ativo', 'Relaxamento', 'Iniciante', ARRAY['Rigidez Global', 'Estresse', 'Postura'], ARRAY['Dor Aguda'], ARRAY['Todos'], ARRAY[''], 'Série de alongamentos ativos globais', 'Cadeias de alongamentos em múltiplas posições. Mantém cada posição 30s alongando e relaxando.');

-- ============================================
-- EXERCÍCIOS DE COORDENAÇÃO
-- ============================================

INSERT INTO exercises (name, category, difficulty, indicated_pathologies, contraindicated_pathologies, body_parts, equipment, description, instructions) VALUES
('Coordenação Óculo-Manual', 'Coordenação', 'Iniciante', ARRAY[' AVC', 'Traumatismo Craniano', 'Parkinson'], ARRAY[''], ARRAY['Oculomotor', 'Mãos'], ARRAY['Bola', 'Alvo'], 'Arremessar e receber bola', 'Arremesse bola contra parede e receba. Progredir distância e velocidade. Treina coordenação.'),

('Coordenação Digital (Dedos)', 'Coordenação', 'Iniciante', ARRAY['Parkinson', 'Tremor'], ARRAY[''], ARRAY['Mãos', 'Dedos'], ARRAY[''], 'Movimentos independentes de dedos', 'Toque ponta do polegar a cada dedo sucessivamente. Progredir velocidade. Faça em ambas mãos.'),

('Marcha com Padrões Cruzados', 'Coordenação', 'Intermediário', ARRAY['AVC', 'Ataxia'], ARRAY[''], ARRAY['Marcha', 'Coordenação'], ARRAY[''], 'Cruzar linha média ao caminhar', 'Caminhe elevando joelhos e tocando mão oposta. Progredir padrão e complexidade.'),

('Tapete de Pisos Diferentes', 'Coordenação', 'Intermediário', ARRAY['Ataxia', 'Distúrbio Propriocepção'], ARRAY['Fratura Recente'], ARRAY['Marcha', 'Equilíbrio', 'Pés'], ARRAY['Tapete', 'Superfícies'], 'Caminhar sobre texturas variadas', 'Caminhe sobre superfícies variadas (macio, firme, irregular). Melhora feedback proprioceptivo.');
