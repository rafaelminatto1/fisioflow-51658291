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
	},
	{
		id: 'mus_hamstrings',
		pt: 'Isquiotibiais',
		en: 'Hamstrings',
		aliases_pt: ['posterior da coxa', 'bíceps femoral', 'semitendíneo', 'semimembranáceo'],
		aliases_en: ['posterior thigh', 'biceps femoris', 'semitendinosus', 'semimembranosus'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
	},
	{
		id: 'mus_gluteus_maximus',
		pt: 'Glúteo Máximo',
		en: 'Gluteus Maximus',
		aliases_pt: ['glúteo', 'bumbum'],
		aliases_en: ['glutes', 'buttocks'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
	},
	{
		id: 'mus_gluteus_medius',
		pt: 'Glúteo Médio',
		en: 'Gluteus Medius',
		aliases_pt: ['glúteo medio', 'abdutor do quadril'],
		aliases_en: ['hip abductor', 'glute medius'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
	},
	{
		id: 'mus_gastrocnemius',
		pt: 'Gastrocnêmio',
		en: 'Gastrocnemius',
		aliases_pt: ['panturrilha', 'batata da perna', 'gastrocnemio'],
		aliases_en: ['calf', 'calf muscle'],
		category: 'muscle',
		subcategory: 'Membro Inferior',
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
		aliases_pt: ['tendinite', 'tendinose', 'inflamação no tendão'],
		aliases_en: ['tendinitis', 'tendinosis', 'tendon inflammation'],
		category: 'condition',
	},
	{
		id: 'con_cts',
		pt: 'Síndrome do Túnel do Carpo',
		en: 'Carpal Tunnel Syndrome',
		aliases_pt: ['STC', 'túnel do carpo'],
		aliases_en: ['CTS', 'carpal tunnel'],
		category: 'condition',
	},
	{
		id: 'con_osteoarthritis',
		pt: 'Osteoartrite',
		en: 'Osteoarthritis',
		aliases_pt: ['artrose', 'osteoartrose', 'desgaste articular'],
		aliases_en: ['OA', 'arthrosis', 'joint wear and tear', 'degenerative joint disease'],
		category: 'condition',
	},
	{
		id: 'con_plantar_fasciitis',
		pt: 'Fascite Plantar',
		en: 'Plantar Fasciitis',
		aliases_pt: ['esporão', 'dor na sola do pé'],
		aliases_en: ['plantar fasciopathy', 'heel spur syndrome'],
		category: 'condition',
	},
	{
		id: 'con_sciatica',
		pt: 'Ciática',
		en: 'Sciatica',
		aliases_pt: ['dor ciática', 'nervo ciático', 'lombociatalgia'],
		aliases_en: ['sciatic pain', 'lumbar radiculopathy'],
		category: 'condition',
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
	},
	{
		id: 'exe_deadlift',
		pt: 'Levantamento Terra',
		en: 'Deadlift',
		aliases_pt: ['terra'],
		aliases_en: ['deadlifts'],
		category: 'exercise',
	},
	{
		id: 'exe_bridge',
		pt: 'Ponte',
		en: 'Bridge',
		aliases_pt: ['ponte glútea', 'elevação pélvica'],
		aliases_en: ['glute bridge', 'pelvic bridge'],
		category: 'exercise',
	},
	{
		id: 'exe_plank',
		pt: 'Prancha',
		en: 'Plank',
		aliases_pt: ['prancha abdominal'],
		aliases_en: ['front plank', 'plank hold'],
		category: 'exercise',
	},
	{
		id: 'exe_lunge',
		pt: 'Avanço',
		en: 'Lunge',
		aliases_pt: ['passada', 'afundo'],
		aliases_en: ['lunges', 'split squat'],
		category: 'exercise',
	},

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
	},
	{
		id: 'tst_anterior_drawer',
		pt: 'Gaveta Anterior',
		en: 'Anterior Drawer Test',
		aliases_pt: ['teste de gaveta anterior'],
		aliases_en: ['anterior drawer'],
		category: 'test',
		subcategory: 'Joelho / Tornozelo',
	},
	{
		id: 'tst_slr',
		pt: 'Elevação da Perna Reta',
		en: 'Straight Leg Raise Test',
		aliases_pt: ['teste de lasegue', 'slr', 'lasègue'],
		aliases_en: ['slr test', 'lasegue test'],
		category: 'test',
		subcategory: 'Coluna Lombar',
	},
	{
		id: 'tst_hawkins',
		pt: 'Teste de Hawkins-Kennedy',
		en: 'Hawkins-Kennedy Test',
		aliases_pt: ['hawkins', 'teste de impacto de hawkins'],
		aliases_en: ['hawkins test', 'hawkins impingement test'],
		category: 'test',
		subcategory: 'Ombro',
	}
];
