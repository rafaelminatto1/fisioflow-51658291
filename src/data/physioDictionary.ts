export type PhysioTermCategory =
	| 'muscle'         // Músculos
	| 'nerve'          // Nervos
	| 'joint'          // Articulações
	| 'bone'           // Ossos
	| 'ligament'       // Ligamentos
	| 'tendon'         // Tendões
	| 'region'         // Regiões anatômicas (membro inferior, etc.)
	| 'condition'      // Patologias (LCA, STC, etc.)
	| 'exercise'       // Exercícios (agachamento = squat)
	| 'test'           // Testes clínicos
	| 'procedure'      // Procedimentos (artroplastia = arthroplasty)
	| 'movement'       // Movimentos (flexão = flexion)
	| 'equipment';     // Equipamentos e Materiais

export interface PhysioDictionaryEntry {
	id: string;
	pt: string;          // Termo em Português
	en: string;          // Termo em Inglês
	aliases_pt: string[]; // Sinônimos em PT (ex: "isquiotibiais", "posterior da coxa")
	aliases_en: string[]; // Sinônimos em EN (ex: "hamstrings", "posterior thigh")
	category: PhysioTermCategory;
	subcategory?: string;
	description_pt?: string;
	description_en?: string;
	image_url?: string;
}


export const physioDictionary: PhysioDictionaryEntry[] = [
	// ==========================================
	// MÚSCULOS
	// ==========================================
	{
		id: 'mus_quadriceps',
		pt: 'Quadríceps',
		en: 'Quadriceps',
		aliases_pt: ['quadriceps femoral', 'músculo da coxa anterior'],
		aliases_en: ['quadriceps femoris', 'anterior thigh muscle'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
		image_url: '/src/assets/images/muscles/quadriceps.png',
		description_pt: 'Grupo muscular anterior da coxa, composto pelo reto femoral, vasto lateral, vasto medial e vasto intermédio. É o principal extensor do joelho e auxilia na flexão do quadril.',
		description_en: 'Anterior thigh muscle group, composed of the rectus femoris, vastus lateralis, vastus medialis, and vastus intermedius. It is the primary knee extensor and assists in hip flexion.',
	},
	{
		id: 'mus_hamstrings',
		pt: 'Isquiotibiais',
		en: 'Hamstrings',
		aliases_pt: ['posterior da coxa', 'bíceps femoral', 'semitendíneo', 'semimembranáceo'],
		aliases_en: ['posterior thigh', 'biceps femoris', 'semitendinosus', 'semimembranosus'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
		image_url: '/src/assets/images/muscles/hamstrings.png',
		description_pt: 'Grupo muscular posterior da coxa, que inclui o bíceps femoral, semitendíneo e semimembranáceo. Responsável pela flexão do joelho e extensão do quadril.',
		description_en: 'Posterior thigh muscle group, including the biceps femoris, semitendinosus, and semimembranosus. Responsible for knee flexion and hip extension.',
	},
	{
		id: 'mus_gluteus_maximus',
		pt: 'Glúteo Máximo',
		en: 'Gluteus Maximus',
		aliases_pt: ['glúteo', 'bumbum'],
		aliases_en: ['glutes', 'buttocks'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
		image_url: '/src/assets/images/muscles/gluteus_maximus.png',
		description_pt: 'O maior e mais superficial músculo glúteo. É o principal extensor e rotador externo do quadril, fundamental para a postura bípede e locomoção.',
		description_en: 'The largest and most superficial gluteal muscle. It is the primary hip extensor and external rotator, fundamental for bipedal posture and locomotion.',
	},
	{
		id: 'mus_gluteus_medius',
		pt: 'Glúteo Médio',
		en: 'Gluteus Medius',
		aliases_pt: ['glúteo medio', 'abdutor do quadril'],
		aliases_en: ['hip abductor', 'glute medius'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
		image_url: '/src/assets/images/muscles/gluteus_medius.png',
		description_pt: 'Músculo situado abaixo do glúteo máximo. É o principal abdutor do quadril e estabilizador lateral da pelve durante a marcha (sinal de Trendelenburg).',
		description_en: 'Muscle located beneath the gluteus maximus. It is the primary hip abductor and lateral pelvic stabilizer during gait (Trendelenburg sign).',
	},
	{
		id: 'mus_gastrocnemius',
		pt: 'Gastrocnêmio',
		en: 'Gastrocnemius',
		aliases_pt: ['panturrilha', 'batata da perna', 'gastrocnemio'],
		aliases_en: ['calf', 'calf muscle'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
		image_url: '/src/assets/images/muscles/gastrocnemius.png',
		description_pt: 'Músculo biarticular da panturrilha com duas cabeças (medial e lateral). Responsável pela flexão plantar do tornozelo e auxiliar na flexão do joelho.',
		description_en: 'Biarticular calf muscle with two heads (medial and lateral). Responsible for plantar flexion of the ankle and assists in knee flexion.',
	},



	// ==========================================
	// LIGAMENTOS E TENDÕES
	// ==========================================
	{
		id: 'lig_acl',
		pt: 'LCA',
		en: 'ACL',
		aliases_pt: ['Ligamento Cruzado Anterior', 'cruzado anterior'],
		aliases_en: ['Anterior Cruciate Ligament', 'anterior cruciate'],
		category: 'ligament',
		subcategory: 'Joelho',
	},
	{
		id: 'lig_pcl',
		pt: 'LCP',
		en: 'PCL',
		aliases_pt: ['Ligamento Cruzado Posterior', 'cruzado posterior'],
		aliases_en: ['Posterior Cruciate Ligament', 'posterior cruciate'],
		category: 'ligament',
		subcategory: 'Joelho',
	},
	{
		id: 'lig_mcl',
		pt: 'LCM',
		en: 'MCL',
		aliases_pt: ['Ligamento Colateral Medial', 'colateral medial'],
		aliases_en: ['Medial Collateral Ligament', 'medial collateral'],
		category: 'ligament',
		subcategory: 'Joelho',
	},
	{
		id: 'ten_achilles',
		pt: 'Tendão de Aquiles',
		en: 'Achilles Tendon',
		aliases_pt: ['tendão calcâneo', 'tendão do calcaneo'],
		aliases_en: ['calcaneal tendon', 'heel cord'],
		category: 'tendon',
		subcategory: 'Tornozelo',
	},
	{
		id: 'ten_patellar',
		pt: 'Tendão Patelar',
		en: 'Patellar Tendon',
		aliases_pt: ['ligamento patelar', 'tendão rotuliano'],
		aliases_en: ['patellar ligament'],
		category: 'tendon',
		subcategory: 'Joelho',
	},

	// ==========================================
	// ARTICULAÇÕES E OSSOS
	// ==========================================
	{
		id: 'joi_knee',
		pt: 'Joelho',
		en: 'Knee',
		aliases_pt: ['articulação do joelho', 'femorotibial', 'patelofemoral'],
		aliases_en: ['knee joint', 'tibiofemoral joint', 'patellofemoral joint'],
		category: 'joint',
	},
	{
		id: 'joi_shoulder',
		pt: 'Ombro',
		en: 'Shoulder',
		aliases_pt: ['glenoumeral', 'articulação do ombro'],
		aliases_en: ['glenohumeral joint', 'shoulder joint'],
		category: 'joint',
	},
	{
		id: 'joi_hip',
		pt: 'Quadril',
		en: 'Hip',
		aliases_pt: ['coxofemoral', 'bacia', 'anca'],
		aliases_en: ['coxofemoral joint', 'hip joint'],
		category: 'joint',
	},
	{
		id: 'bon_femur',
		pt: 'Fêmur',
		en: 'Femur',
		aliases_pt: ['osso da coxa', 'femur'],
		aliases_en: ['thigh bone'],
		category: 'bone',
	},
	{
		id: 'bon_patella',
		pt: 'Patela',
		en: 'Patella',
		aliases_pt: ['rótula', 'rotula', 'osso do joelho'],
		aliases_en: ['kneecap'],
		category: 'bone',
	},

	// ==========================================
	// CONDIÇÕES E PATOLOGIAS
	// ==========================================
	{
		id: 'con_tendinopathy',
		pt: 'Tendinopatia',
		en: 'Tendinopathy',
		aliases_pt: ['tendinite', 'tendinose', 'inflamação no tendão', 'M77.9'],
		aliases_en: ['tendinitis', 'tendinosis', 'tendon inflammation'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/tendinopathy.png',
		description_pt: 'Termo genérico para lesões em tendões que geram dor e disfunção. Pode envolver inflamação (tendinite) ou degeneração do colágeno (tendinose). Caracteriza-se por dor à palpação e carga.',
		description_en: 'Generic term for tendon injuries causing pain and dysfunction. Can involve inflammation (tendinitis) or collagen degeneration (tendinosis). Characterized by pain upon palpation and loading.',
	},
	{
		id: 'con_cts',
		pt: 'Síndrome do Túnel do Carpo',
		en: 'Carpal Tunnel Syndrome',
		aliases_pt: ['STC', 'túnel do carpo', 'G56.0'],
		aliases_en: ['CTS', 'carpal tunnel'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/carpal_tunnel.png',
		description_pt: 'Compressão do nervo mediano ao passar pelo túnel do carpo no punho. Causa parestesia (formigamento), dor e fraqueza na mão, especialmente nos três primeiros dedos.',
		description_en: 'Compression of the median nerve as it passes through the carpal tunnel in the wrist. Causes paresthesia (tingling), pain, and weakness in the hand, especially in the first three fingers.',
	},
	{
		id: 'con_osteoarthritis',
		pt: 'Osteoartrite',
		en: 'Osteoarthritis',
		aliases_pt: ['artrose', 'osteoartrose', 'desgaste articular', 'M17.1', 'M16.1', 'M19.9'],
		aliases_en: ['OA', 'arthrosis', 'joint wear and tear', 'degenerative joint disease'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/osteoarthritis.png',
		description_pt: 'Doença articular degenerativa caracterizada pela quebra da cartilagem, alterações no osso subcondral e formação de osteófitos. Gera dor crônica e rigidez articular.',
		description_en: 'Degenerative joint disease characterized by cartilage breakdown, subchondral bone changes, and osteophyte formation. Leads to chronic pain and joint stiffness.',
	},
	{
		id: 'con_plantar_fasciitis',
		pt: 'Fascite Plantar',
		en: 'Plantar Fasciitis',
		aliases_pt: ['dor no calcanhar', 'esporão', 'M72.2'],
		aliases_en: ['heel pain', 'heel spur syndrome'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/plantar_fasciitis.png',
		description_pt: 'Inflamação da fáscia plantar, tecido conectivo que sustenta o arco do pé. Caracteriza-se por dor aguda no calcanhar, especialmente aos primeiros passos do dia.',
		description_en: 'Inflammation of the plantar fascia, connective tissue that supports the foot arch. Characterized by sharp heel pain, especially during the first steps of the day.',
	},
	{
		id: 'con_sciatica',
		pt: 'Ciática',
		en: 'Sciatica',
		aliases_pt: ['dor ciática', 'lombociatalgia', 'M54.3', 'M54.4'],
		aliases_en: ['sciatic pain', 'lumbar radiculopathy'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/sciatica.png',
		description_pt: 'Dor que irradia ao longo do trajeto do nervo ciático, geralmente causada por compressão de raiz nervosa na coluna lombar. Pode incluir formigamento e fraqueza.',
		description_en: 'Pain radiating along the sciatic nerve path, usually caused by nerve root compression in the lumbar spine. Can include tingling, numbness, and weakness.',
	},
	{
		id: 'con_low_back_pain',
		pt: 'Dor Lombar',
		en: 'Low Back Pain',
		aliases_pt: ['lombalgia', 'dor nas costas', 'lumbago', 'M54.5'],
		aliases_en: ['LBP', 'back pain', 'lumbar pain'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/low_back_pain.png',
		description_pt: 'Condição multifatorial que afeta a região lombar. Pode ser classificada como específica (causa identificável) ou inespecífica (maioria dos casos), aguda ou crônica.',
		description_en: 'Multifactorial condition affecting the lumbar region. Can be classified as specific (identifiable cause) or non-specific (most cases), acute or chronic.',
	},
	{
		id: 'con_neck_pain',
		pt: 'Cervicalgia',
		en: 'Neck Pain',
		aliases_pt: ['dor no pescoço', 'torcicolo', 'M54.2'],
		aliases_en: ['neck pain', 'cervical pain'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/neck_pain.png',
		description_pt: 'Dor localizada na coluna cervical. Frequentemente associada a má postura, tensão muscular ou alterações degenerativas discais. Pode irradiar para os ombros.',
		description_en: 'Pain localized in the cervical spine. Frequently associated with poor posture, muscle tension, or degenerative disc changes. Can radiate to the shoulders.',
	},
	{
		id: 'con_shoulder_impingement',
		pt: 'Síndrome do Impacto',
		en: 'Shoulder Impingement',
		aliases_pt: ['impacto subacromial', 'tendinite de ombro', 'M75.1'],
		aliases_en: ['subacromial impingement', 'shoulder tendinitis'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/shoulder_impingement.png',
		description_pt: 'Compressão das estruturas subacromiais (tendões do manguito rotador e bursa) durante a elevação do braço. Causa dor lateral no ombro e limitação funcional.',
		description_en: 'Compression of subacromial structures (rotator cuff tendons and bursa) during arm elevation. Causes lateral shoulder pain and functional limitation.',
	},
	{
		id: 'con_lca_injury',
		pt: 'Lesão de LCA',
		en: 'ACL Injury',
		aliases_pt: ['ruptura de cruzado anterior', 'lesão de ligamento joelho', 'S83.5'],
		aliases_en: ['ACL tear', 'anterior cruciate ligament injury'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/lca_injury.png',
		description_pt: 'Ruptura total ou parcial do Ligamento Cruzado Anterior. Geralmente ocorre em traumas de entorse com valgo ou hiperextensão, gerando instabilidade articular.',
		description_en: 'Total or partial tear of the Anterior Cruciate Ligament. Usually occurs during valgus stress or hyperextension trauma, leading to joint instability.',
	},
	{
		id: 'con_ankle_sprain',
		pt: 'Entorse de Tornozelo',
		en: 'Ankle Sprain',
		aliases_pt: ['virada de pé', 'lesão de ligamento lateral', 'S93.4'],
		aliases_en: ['twisted ankle', 'lateral ligament injury'],
		category: 'condition',
		image_url: '/src/assets/images/conditions/ankle_sprain.png',
		description_pt: 'Lesão dos ligamentos do tornozelo, mais comum no complexo lateral (inversão). Classificada em graus de I a III conforme a extensão do estiramento ou ruptura.',
		description_en: 'Injury to the ankle ligaments, most common in the lateral complex (inversion). Classified in grades I to III according to the extent of stretching or tearing.',
	},

	// ==========================================
	// EXERCÍCIOS
	// ==========================================
	{
		id: 'exe_squat',
		pt: 'Agachamento',
		en: 'Squat',
		aliases_pt: ['agachar'],
		aliases_en: ['squats'],
		category: 'exercise',
		image_url: '/src/assets/images/exercises/squat.png',
		description_pt: 'Exercício multiarticular de membros inferiores. Foco em manter a coluna neutra, iniciar com o quadril (hip hinge) e garantir o alinhamento do joelho com a ponta dos pés. Essencial para força funcional e mobilidade de quadril.',
		description_en: 'Multi-joint lower limb exercise. Focus on maintaining a neutral spine, initiating with the hip hinge, and ensuring knee alignment with the toes. Essential for functional strength and hip mobility.',
	},
	{
		id: 'exe_deadlift',
		pt: 'Levantamento Terra',
		en: 'Deadlift',
		aliases_pt: ['terra'],
		aliases_en: ['deadlifts'],
		category: 'exercise',
		image_url: '/src/assets/images/exercises/deadlift.png',
		description_pt: 'Exercício fundamental de cadeia posterior. Requer articulação do quadril estável, costas planas e trajetória da barra próxima às canelas. Ativa glúteos, isquiotibiais e eretores da espinha.',
		description_en: 'Fundamental posterior chain exercise. Requires stable hip hinging, a flat back, and bar path close to the shins. Activates glutes, hamstrings, and erector spinae.',
	},
	{
		id: 'exe_bridge',
		pt: 'Ponte',
		en: 'Bridge',
		aliases_pt: ['ponte glútea', 'elevação pélvica'],
		aliases_en: ['glute bridge', 'pelvic bridge'],
		category: 'exercise',
		image_url: '/src/assets/images/exercises/bridge.png',
		description_pt: 'Excelente para ativação isolada de glúteos e estabilidade pélvica. O paciente deve elevar a pelve mantendo os pés firmes no chão, evitando a hiperestensão lombar.',
		description_en: 'Excellent for isolated glute activation and pelvic stability. The patient should elevate the pelvis while keeping feet firm on the floor, avoiding lumbar hyperextension.',
	},
	{
		id: 'exe_plank',
		pt: 'Prancha',
		en: 'Plank',
		aliases_pt: ['prancha abdominal'],
		aliases_en: ['front plank', 'plank hold'],
		category: 'exercise',
		image_url: '/src/assets/images/exercises/plank.png',
		description_pt: 'Exercício de estabilidade isométrica do core. Requer alinhamento da cabeça aos calcanhares, estabilização escapular e ativação do transverso do abdome. Essencial para controle lombopélvico.',
		description_en: 'Isometric core stability exercise. Requires alignment from head to heels, scapular stabilization, and transverse abdominis activation. Essential for lumbopelvic control.',
	},
	{
		id: 'exe_lunge',
		pt: 'Avanço',
		en: 'Lunge',
		aliases_pt: ['passada', 'afundo'],
		aliases_en: ['lunges', 'split squat'],
		category: 'exercise',
		image_url: '/src/assets/images/exercises/lunge.png',
		description_pt: 'Exercício de base instável para força e equilíbrio. Manter ângulos de 90° em ambos os joelhos, tronco ereto e base estável. Foco em quadríceps e glúteos.',
		description_en: 'Unstable base exercise for strength and balance. Maintain 90-degree angles in both knees, an upright torso, and a stable base. Focus on quadriceps and glutes.',
	}
,


	// ==========================================
	// MOVIMENTOS
	// ==========================================
	{
		id: 'mov_flexion',
		pt: 'Flexão',
		en: 'Flexion',
		aliases_pt: ['dobrar', 'fletir'],
		aliases_en: ['bend', 'bending'],
		category: 'movement',
	},
	{
		id: 'mov_extension',
		pt: 'Extensão',
		en: 'Extension',
		aliases_pt: ['esticar', 'estender'],
		aliases_en: ['straighten', 'straightening'],
		category: 'movement',
	},
	{
		id: 'mov_abduction',
		pt: 'Abdução',
		en: 'Abduction',
		aliases_pt: ['abrir', 'afastar'],
		aliases_en: ['open', 'move away'],
		category: 'movement',
	},
	{
		id: 'mov_adduction',
		pt: 'Adução',
		en: 'Adduction',
		aliases_pt: ['fechar', 'aproximar'],
		aliases_en: ['close', 'move towards'],
		category: 'movement',
	},

	// ==========================================
	// TESTES CLÍNICOS
	// ==========================================
	{
		id: 'tst_lachman',
		pt: 'Teste de Lachman',
		en: 'Lachman Test',
		aliases_pt: ['lachman'],
		aliases_en: ['lachman\'s test'],
		category: 'test',
		subcategory: 'Joelho',
		image_url: '/src/assets/images/tests/lachman.png',
		description_pt: 'O padrão-ouro para avaliação do LCA. Com o joelho em 30° de flexão, aplica-se uma translação anterior súbita na tíbia enquanto o fêmur é estabilizado. Positivo se houver ausência de "end-feel" firme ou translação excessiva.',
		description_en: 'The gold standard for ACL assessment. With the knee in 30° of flexion, a sudden anterior translation is applied to the tibia while the femur is stabilized. Positive if there is a soft end-feel or excessive translation.',
	},
	{
		id: 'tst_anterior_drawer',
		pt: 'Gaveta Anterior',
		en: 'Anterior Drawer Test',
		aliases_pt: ['teste de gaveta anterior'],
		aliases_en: ['anterior drawer'],
		category: 'test',
		subcategory: 'Joelho / Tornozelo',
		image_url: '/src/assets/images/tests/anterior_drawer.png',
		description_pt: 'Utilizado para avaliar a integridade do LCA. Com o joelho em 90° de flexão, o terapeuta fixa o pé do paciente e traciona a tíbia anteriormente. Complementar ao teste de Lachman.',
		description_en: 'Used to assess ACL integrity. With the knee in 90° of flexion, the therapist fixes the patient\'s foot and pulls the tibia anteriorly. Complementary to the Lachman test.',
	},
	{
		id: 'tst_slr',
		pt: 'Elevação da Perna Reta',
		en: 'Straight Leg Raise Test',
		aliases_pt: ['teste de lasegue', 'slr', 'lasègue'],
		aliases_en: ['slr test', 'lasegue test'],
		category: 'test',
		subcategory: 'Coluna Lombar',
		image_url: '/src/assets/images/tests/lasegue.png',
		description_pt: 'Teste neurodinâmico para radiculopatia lombar. A perna é elevada passivamente com joelho estendido. Positivo se houver reprodução de dor radicular entre 30° e 70° de elevação.',
		description_en: 'Neurodynamic test for lumbar radiculopathy. The leg is passively raised with knee extended. Positive if radicular pain is reproduced between 30° and 70° of elevation.',
	},
	{
		id: 'tst_hawkins',
		pt: 'Teste de Hawkins-Kennedy',
		en: 'Hawkins-Kennedy Test',
		aliases_pt: ['hawkins', 'teste de impacto de hawkins'],
		aliases_en: ['hawkins test', 'hawkins impingement test'],
		category: 'test',
		subcategory: 'Ombro',
		image_url: '/src/assets/images/tests/hawkins.png',
		description_pt: 'Avalia o impacto subacromial. O braço do paciente é colocado em 90° de flexão e aplica-se uma rotação interna passiva vigorosa, comprimindo o tendão do supraespinal contra o ligamento coracoacromial.',
		description_en: 'Assesses subacromial impingement. The patient\'s arm is placed in 90° of flexion and a vigorous passive internal rotation is applied, compressing the supraspinatus tendon against the coracoacromial ligament.',
	}


];
