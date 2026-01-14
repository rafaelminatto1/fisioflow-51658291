// Definições detalhadas de músculos por região do corpo
// Organizado por vista (frente/costa) e região anatômica

export interface Muscle {
  code: string;
  name: string;
  nameEn: string;
}

export interface MuscleGroup {
  code: string;
  name: string;
  muscles: Muscle[];
}

// Regiões da vista frontal
export const FRONT_MUSCLE_GROUPS: MuscleGroup[] = [
  {
    code: 'head_front',
    name: 'Cabeça',
    muscles: [
      { code: 'frontalis', name: 'Frontal', nameEn: 'Frontalis' },
      { code: 'orbicularis_oculi', name: 'Orbicular dos Olhos', nameEn: 'Orbicularis Oculi' },
      { code: 'nasalis', name: 'Nasal', nameEn: 'Nasalis' },
      { code: 'orbicularis_oris', name: 'Orbicular da Boca', nameEn: 'Orbicularis Oris' },
      { code: 'masseter', name: 'Masseter', nameEn: 'Masseter' },
      { code: 'temporalis', name: 'Temporal', nameEn: 'Temporalis' },
    ],
  },
  {
    code: 'neck_front',
    name: 'Pescoço',
    muscles: [
      { code: 'sternocleidomastoid', name: 'Esternocleidomastoideo', nameEn: 'Sternocleidomastoid' },
      { code: 'platysma', name: 'Platisma', nameEn: 'Platysma' },
      { code: 'scalenes', name: 'Escalenos', nameEn: 'Scalenes' },
      { code: 'hyoid', name: 'Hioideu', nameEn: 'Hyoid' },
    ],
  },
  {
    code: 'shoulder_left_front',
    name: 'Ombro Esquerdo',
    muscles: [
      { code: 'deltoid_anterior_left', name: 'Deltoide Anterior', nameEn: 'Anterior Deltoid' },
      { code: 'pectoralis_minor_left', name: 'Peitoral Menor', nameEn: 'Pectoralis Minor' },
      { code: 'supraspinatus_left', name: 'Supraespinhoso', nameEn: 'Supraspinatus' },
      { code: 'coracobrachialis_left', name: 'Coracobraquial', nameEn: 'Coracobrachialis' },
    ],
  },
  {
    code: 'shoulder_right_front',
    name: 'Ombro Direito',
    muscles: [
      { code: 'deltoid_anterior_right', name: 'Deltoide Anterior', nameEn: 'Anterior Deltoid' },
      { code: 'pectoralis_minor_right', name: 'Peitoral Menor', nameEn: 'Pectoralis Minor' },
      { code: 'supraspinatus_right', name: 'Supraespinhoso', nameEn: 'Supraspinatus' },
      { code: 'coracobrachialis_right', name: 'Coracobraquial', nameEn: 'Coracobrachialis' },
    ],
  },
  {
    code: 'chest_left',
    name: 'Peito Esquerdo',
    muscles: [
      { code: 'pectoralis_major_clavicular_left', name: 'Peitoral Maior Clavicular', nameEn: 'Clavicular Pectoralis' },
      { code: 'pectoralis_major_sternal_left', name: 'Peitoral Maior Esternal', nameEn: 'Sternal Pectoralis' },
      { code: 'serratus_anterior_left', name: 'Serrátil Anterior', nameEn: 'Serratus Anterior' },
      { code: 'intercostals_left', name: 'Intercostais', nameEn: 'Intercostals' },
    ],
  },
  {
    code: 'chest_right',
    name: 'Peito Direito',
    muscles: [
      { code: 'pectoralis_major_clavicular_right', name: 'Peitoral Maior Clavicular', nameEn: 'Clavicular Pectoralis' },
      { code: 'pectoralis_major_sternal_right', name: 'Peitoral Maior Esternal', nameEn: 'Sternal Pectoralis' },
      { code: 'serratus_anterior_right', name: 'Serrátil Anterior', nameEn: 'Serratus Anterior' },
      { code: 'intercostals_right', name: 'Intercostais', nameEn: 'Intercostals' },
    ],
  },
  {
    code: 'arm_left_front',
    name: 'Braço Esquerdo',
    muscles: [
      { code: 'biceps_brachii_left', name: 'Bíceps Braquial', nameEn: 'Biceps Brachii' },
      { code: 'brachialis_left', name: 'Braquial', nameEn: 'Brachialis' },
      { code: 'coracobrachialis_arm_left', name: 'Coracobraquial', nameEn: 'Coracobrachialis' },
      { code: 'triceps_brachii_long_left', name: 'Tríceps Braquial (cabeça longa)', nameEn: 'Long Head Triceps' },
    ],
  },
  {
    code: 'arm_right_front',
    name: 'Braço Direito',
    muscles: [
      { code: 'biceps_brachii_right', name: 'Bíceps Braquial', nameEn: 'Biceps Brachii' },
      { code: 'brachialis_right', name: 'Braquial', nameEn: 'Brachialis' },
      { code: 'coracobrachialis_arm_right', name: 'Coracobraquial', nameEn: 'Coracobrachialis' },
      { code: 'triceps_brachii_long_right', name: 'Tríceps Braquial (cabeça longa)', nameEn: 'Long Head Triceps' },
    ],
  },
  {
    code: 'abdomen_upper',
    name: 'Abdômen Superior',
    muscles: [
      { code: 'rectus_abdominis_upper', name: 'Reto Abdominal Superior', nameEn: 'Upper Rectus Abdominis' },
      { code: 'external_oblique_upper_left', name: 'Obliquo Externo Esq.', nameEn: 'External Oblique' },
      { code: 'external_oblique_upper_right', name: 'Obliquo Externo Dir.', nameEn: 'External Oblique' },
      { code: 'internal_oblique_upper', name: 'Obliquo Interno', nameEn: 'Internal Oblique' },
    ],
  },
  {
    code: 'forearm_left_front',
    name: 'Antebraço Esquerdo',
    muscles: [
      { code: 'flexor_carpi_radialis_left', name: 'Flexor Radial do Carpo', nameEn: 'Flexor Carpi Radialis' },
      { code: 'flexor_carpi_ulnaris_left', name: 'Flexor Ulnar do Carpo', nameEn: 'Flexor Carpi Ulnaris' },
      { code: 'palmaris_longus_left', name: 'Palmar Longo', nameEn: 'Palmaris Longus' },
      { code: 'flexor_digitorum_left', name: 'Flexor dos Dedos', nameEn: 'Flexor Digitorum' },
      { code: 'pronator_teres_left', name: 'Pronador Redondo', nameEn: 'Pronator Teres' },
    ],
  },
  {
    code: 'forearm_right_front',
    name: 'Antebraço Direito',
    muscles: [
      { code: 'flexor_carpi_radialis_right', name: 'Flexor Radial do Carpo', nameEn: 'Flexor Carpi Radialis' },
      { code: 'flexor_carpi_ulnaris_right', name: 'Flexor Ulnar do Carpo', nameEn: 'Flexor Carpi Ulnaris' },
      { code: 'palmaris_longus_right', name: 'Palmar Longo', nameEn: 'Palmaris Longus' },
      { code: 'flexor_digitorum_right', name: 'Flexor dos Dedos', nameEn: 'Flexor Digitorum' },
      { code: 'pronator_teres_right', name: 'Pronador Redondo', nameEn: 'Pronator Teres' },
    ],
  },
  {
    code: 'abdomen_lower',
    name: 'Abdômen Inferior',
    muscles: [
      { code: 'rectus_abdominis_lower', name: 'Reto Abdominal Inferior', nameEn: 'Lower Rectus Abdominis' },
      { code: 'pyramidalis', name: 'Piramidal', nameEn: 'Pyramidalis' },
      { code: 'external_oblique_lower_left', name: 'Obliquo Externo Esq.', nameEn: 'External Oblique' },
      { code: 'external_oblique_lower_right', name: 'Obliquo Externo Dir.', nameEn: 'External Oblique' },
    ],
  },
  {
    code: 'hand_left',
    name: 'Mão Esquerda',
    muscles: [
      { code: 'thenar_eminence_left', name: 'Eminência Tenar', nameEn: 'Thenar Eminence' },
      { code: 'hypothenar_left', name: 'Eminência Hipotenar', nameEn: 'Hypothenar' },
      { code: 'interossei_dorsal_left', name: 'Interósseos Dorsais', nameEn: 'Dorsal Interossei' },
      { code: 'interossei_palmar_left', name: 'Interósseos Palmares', nameEn: 'Palmar Interossei' },
      { code: 'lumbricals_left', name: 'Lombriquais', nameEn: 'Lumbricals' },
    ],
  },
  {
    code: 'hand_right',
    name: 'Mão Direita',
    muscles: [
      { code: 'thenar_eminence_right', name: 'Eminência Tenar', nameEn: 'Thenar Eminence' },
      { code: 'hypothenar_right', name: 'Eminência Hipotenar', nameEn: 'Hypothenar' },
      { code: 'interossei_dorsal_right', name: 'Interósseos Dorsais', nameEn: 'Dorsal Interossei' },
      { code: 'interossei_palmar_right', name: 'Interósseos Palmares', nameEn: 'Palmar Interossei' },
      { code: 'lumbricals_right', name: 'Lombriquais', nameEn: 'Lumbricals' },
    ],
  },
  {
    code: 'hip_left_front',
    name: 'Quadril Esquerdo',
    muscles: [
      { code: 'iliopsoas_left', name: 'Iliopsoas', nameEn: 'Iliopsoas' },
      { code: 'sartorius_left', name: 'Sartório', nameEn: 'Sartorius' },
      { code: 'tensor_fasciae_latae_left', name: 'Tensor da Fáscia Lata', nameEn: 'Tensor Fasciae Latae' },
      { code: 'pectineus_left', name: 'Pectíneo', nameEn: 'Pectineus' },
    ],
  },
  {
    code: 'hip_right_front',
    name: 'Quadril Direito',
    muscles: [
      { code: 'iliopsoas_right', name: 'Iliopsoas', nameEn: 'Iliopsoas' },
      { code: 'sartorius_right', name: 'Sartório', nameEn: 'Sartorius' },
      { code: 'tensor_fasciae_latae_right', name: 'Tensor da Fáscia Lata', nameEn: 'Tensor Fasciae Latae' },
      { code: 'pectineus_right', name: 'Pectíneo', nameEn: 'Pectineus' },
    ],
  },
  {
    code: 'thigh_left_front',
    name: 'Coxa Esquerda',
    muscles: [
      { code: 'rectus_femoris_left', name: 'Reto Femoral', nameEn: 'Rectus Femoris' },
      { code: 'vastus_lateralis_left', name: 'Vasto Lateral', nameEn: 'Vastus Lateralis' },
      { code: 'vastus_medialis_left', name: 'Vasto Medial', nameEn: 'Vastus Medialis' },
      { code: 'vastus_intermedius_left', name: 'Vasto Intermédio', nameEn: 'Vastus Intermedius' },
      { code: 'adductor_longus_left', name: 'Adutor Longo', nameEn: 'Adductor Longus' },
      { code: 'adductor_magnus_left', name: 'Adutor Magno', nameEn: 'Adductor Magnus' },
      { code: 'gracilis_left', name: 'Grácil', nameEn: 'Gracilis' },
    ],
  },
  {
    code: 'thigh_right_front',
    name: 'Coxa Direita',
    muscles: [
      { code: 'rectus_femoris_right', name: 'Reto Femoral', nameEn: 'Rectus Femoris' },
      { code: 'vastus_lateralis_right', name: 'Vasto Lateral', nameEn: 'Vastus Lateralis' },
      { code: 'vastus_medialis_right', name: 'Vasto Medial', nameEn: 'Vastus Medialis' },
      { code: 'vastus_intermedius_right', name: 'Vasto Intermédio', nameEn: 'Vastus Intermedius' },
      { code: 'adductor_longus_right', name: 'Adutor Longo', nameEn: 'Adductor Longus' },
      { code: 'adductor_magnus_right', name: 'Adutor Magno', nameEn: 'Adductor Magnus' },
      { code: 'gracilis_right', name: 'Grácil', nameEn: 'Gracilis' },
    ],
  },
  {
    code: 'knee_left',
    name: 'Joelho Esquerdo',
    muscles: [
      { code: 'patellar_tendon_left', name: 'Tendão Patelar', nameEn: 'Patellar Tendon' },
      { code: 'quadriceps_tendon_left', name: 'Tendão Quadríceps', nameEn: 'Quadriceps Tendon' },
      { code: 'pes_anserinus_left', name: 'Pata de Ganso', nameEn: 'Pes Anserinus' },
    ],
  },
  {
    code: 'knee_right',
    name: 'Joelho Direito',
    muscles: [
      { code: 'patellar_tendon_right', name: 'Tendão Patelar', nameEn: 'Patellar Tendon' },
      { code: 'quadriceps_tendon_right', name: 'Tendão Quadríceps', nameEn: 'Quadriceps Tendon' },
      { code: 'pes_anserinus_right', name: 'Pata de Ganso', nameEn: 'Pes Anserinus' },
    ],
  },
  {
    code: 'calf_left_front',
    name: 'Panturrilha Esquerda',
    muscles: [
      { code: 'tibialis_anterior_left', name: 'Tibial Anterior', nameEn: 'Tibialis Anterior' },
      { code: 'extensor_digitorum_left', name: 'Extensor dos Dedos', nameEn: 'Extensor Digitorum' },
      { code: 'extensor_hallucis_left', name: 'Extensor do Hálux', nameEn: 'Extensor Hallucis' },
      { code: 'peroneus_longus_left', name: 'Peroneal Longo', nameEn: 'Peroneus Longus' },
      { code: 'peroneus_brevis_left', name: 'Peroneal Curto', nameEn: 'Peroneus Brevis' },
    ],
  },
  {
    code: 'calf_right_front',
    name: 'Panturrilha Direita',
    muscles: [
      { code: 'tibialis_anterior_right', name: 'Tibial Anterior', nameEn: 'Tibialis Anterior' },
      { code: 'extensor_digitorum_right', name: 'Extensor dos Dedos', nameEn: 'Extensor Digitorum' },
      { code: 'extensor_hallucis_right', name: 'Extensor do Hálux', nameEn: 'Extensor Hallucis' },
      { code: 'peroneus_longus_right', name: 'Peroneal Longo', nameEn: 'Peroneus Longus' },
      { code: 'peroneus_brevis_right', name: 'Peroneal Curto', nameEn: 'Peroneus Brevis' },
    ],
  },
  {
    code: 'ankle_left',
    name: 'Tornozelo Esquerdo',
    muscles: [
      { code: 'tibialis_posterior_tendon_left', name: 'Tendão Tibial Posterior', nameEn: 'Tibialis Posterior' },
      { code: 'achilles_tendon_left', name: 'Tendão de Aquiles', nameEn: 'Achilles Tendon' },
    ],
  },
  {
    code: 'ankle_right',
    name: 'Tornozelo Direito',
    muscles: [
      { code: 'tibialis_posterior_tendon_right', name: 'Tendão Tibial Posterior', nameEn: 'Tibialis Posterior' },
      { code: 'achilles_tendon_right', name: 'Tendão de Aquiles', nameEn: 'Achilles Tendon' },
    ],
  },
  {
    code: 'foot_left',
    name: 'Pé Esquerdo',
    muscles: [
      { code: 'extensor_digitorum_brevis_left', name: 'Extensor Curto dos Dedos', nameEn: 'Extensor Digitorum Brevis' },
      { code: 'flexor_digitorum_brevis_left', name: 'Flexor Curto dos Dedos', nameEn: 'Flexor Digitorum Brevis' },
      { code: 'abductor_hallucis_left', name: 'Abdutor do Hálux', nameEn: 'Abductor Hallucis' },
      { code: 'abductor_digiti_minimi_left', name: 'Abdutor do 5º Dedo', nameEn: 'Abductor Digiti Minimi' },
      { code: 'intrinsic_foot_left', name: 'Intrínsecos do Pé', nameEn: 'Intrinsic Foot Muscles' },
    ],
  },
  {
    code: 'foot_right',
    name: 'Pé Direito',
    muscles: [
      { code: 'extensor_digitorum_brevis_right', name: 'Extensor Curto dos Dedos', nameEn: 'Extensor Digitorum Brevis' },
      { code: 'flexor_digitorum_brevis_right', name: 'Flexor Curto dos Dedos', nameEn: 'Flexor Digitorum Brevis' },
      { code: 'abductor_hallucis_right', name: 'Abdutor do Hálux', nameEn: 'Abductor Hallucis' },
      { code: 'abductor_digiti_minimi_right', name: 'Abdutor do 5º Dedo', nameEn: 'Abductor Digiti Minimi' },
      { code: 'intrinsic_foot_right', name: 'Intrínsecos do Pé', nameEn: 'Intrinsic Foot Muscles' },
    ],
  },
];

// Regiões da vista traseira (costas)
export const BACK_MUSCLE_GROUPS: MuscleGroup[] = [
  {
    code: 'head_back',
    name: 'Cabeça',
    muscles: [
      { code: 'occipitalis', name: 'Occipital', nameEn: 'Occipitalis' },
      { code: 'auricular', name: 'Auricular', nameEn: 'Auricular' },
    ],
  },
  {
    code: 'neck_back',
    name: 'Pescoço',
    muscles: [
      { code: 'trapezius_upper', name: 'Trapézio Superior', nameEn: 'Upper Trapezius' },
      { code: 'splenius_capitis', name: 'Esplênio da Cabeça', nameEn: 'Splenius Capitis' },
      { code: 'splenius_cervicis', name: 'Esplênio do Pescoço', nameEn: 'Splenius Cervicis' },
      { code: 'levator_scapulae', name: 'Levantador da Escápula', nameEn: 'Levator Scapulae' },
    ],
  },
  {
    code: 'shoulder_left_back',
    name: 'Ombro Esquerdo',
    muscles: [
      { code: 'deltoid_posterior_left', name: 'Deltoide Posterior', nameEn: 'Posterior Deltoid' },
      { code: 'infraspinatus_left', name: 'Infraespinhoso', nameEn: 'Infraspinatus' },
      { code: 'teres_minor_left', name: 'Teres Menor', nameEn: 'Teres Minor' },
      { code: 'teres_major_left', name: 'Teres Maior', nameEn: 'Teres Major' },
    ],
  },
  {
    code: 'shoulder_right_back',
    name: 'Ombro Direito',
    muscles: [
      { code: 'deltoid_posterior_right', name: 'Deltoide Posterior', nameEn: 'Posterior Deltoid' },
      { code: 'infraspinatus_right', name: 'Infraespinhoso', nameEn: 'Infraspinatus' },
      { code: 'teres_minor_right', name: 'Teres Menor', nameEn: 'Teres Minor' },
      { code: 'teres_major_right', name: 'Teres Maior', nameEn: 'Teres Major' },
    ],
  },
  {
    code: 'upper_back_left',
    name: 'Costas Superior Esquerda',
    muscles: [
      { code: 'trapezius_middle_left', name: 'Trapézio Médio', nameEn: 'Middle Trapezius' },
      { code: 'rhomboid_minor_left', name: 'Romboide Menor', nameEn: 'Rhomboid Minor' },
      { code: 'rhomboid_major_left', name: 'Romboide Maior', nameEn: 'Rhomboid Major' },
    ],
  },
  {
    code: 'upper_back_right',
    name: 'Costas Superior Direita',
    muscles: [
      { code: 'trapezius_middle_right', name: 'Trapézio Médio', nameEn: 'Middle Trapezius' },
      { code: 'rhomboid_minor_right', name: 'Romboide Menor', nameEn: 'Rhomboid Minor' },
      { code: 'rhomboid_major_right', name: 'Romboide Maior', nameEn: 'Rhomboid Major' },
    ],
  },
  {
    code: 'arm_left_back',
    name: 'Braço Esquerdo',
    muscles: [
      { code: 'triceps_brachii_lateral_left', name: 'Tríceps (cabeça lateral)', nameEn: 'Lateral Head Triceps' },
      { code: 'triceps_brachii_medial_left', name: 'Tríceps (cabeça medial)', nameEn: 'Medial Head Triceps' },
      { code: 'anconeus_left', name: 'Ancôneo', nameEn: 'Anconeus' },
    ],
  },
  {
    code: 'arm_right_back',
    name: 'Braço Direito',
    muscles: [
      { code: 'triceps_brachii_lateral_right', name: 'Tríceps (cabeça lateral)', nameEn: 'Lateral Head Triceps' },
      { code: 'triceps_brachii_medial_right', name: 'Tríceps (cabeça medial)', nameEn: 'Medial Head Triceps' },
      { code: 'anconeus_right', name: 'Ancôneo', nameEn: 'Anconeus' },
    ],
  },
  {
    code: 'middle_back_left',
    name: 'Costas Média Esquerda',
    muscles: [
      { code: 'latissimus_dorsi_left', name: 'Grande Dorsal', nameEn: 'Latissimus Dorsi' },
      { code: 'erector_spinae_thoracic_left', name: 'Erector da Coluna Torácica', nameEn: 'Thoracic Erector Spinae' },
    ],
  },
  {
    code: 'middle_back_right',
    name: 'Costas Média Direita',
    muscles: [
      { code: 'latissimus_dorsi_right', name: 'Grande Dorsal', nameEn: 'Latissimus Dorsi' },
      { code: 'erector_spinae_thoracic_right', name: 'Erecto da Coluna Torácica', nameEn: 'Thoracic Erector Spinae' },
    ],
  },
  {
    code: 'forearm_left_back',
    name: 'Antebraço Esquerdo',
    muscles: [
      { code: 'extensor_carpi_radialis_left', name: 'Extensor Radial do Carpo', nameEn: 'Extensor Carpi Radialis' },
      { code: 'extensor_carpi_ulnaris_left', name: 'Extensor Ulnar do Carpo', nameEn: 'Extensor Carpi Ulnaris' },
      { code: 'extensor_digitorum_back_left', name: 'Extensor dos Dedos', nameEn: 'Extensor Digitorum' },
      { code: 'supinator_left', name: 'Supinador', nameEn: 'Supinator' },
      { code: 'brachioradialis_left', name: 'Braquiorradial', nameEn: 'Brachioradialis' },
    ],
  },
  {
    code: 'forearm_right_back',
    name: 'Antebraço Direito',
    muscles: [
      { code: 'extensor_carpi_radialis_right', name: 'Extensor Radial do Carpo', nameEn: 'Extensor Carpi Radialis' },
      { code: 'extensor_carpi_ulnaris_right', name: 'Extensor Ulnar do Carpo', nameEn: 'Extensor Carpi Ulnaris' },
      { code: 'extensor_digitorum_back_right', name: 'Extensor dos Dedos', nameEn: 'Extensor Digitorum' },
      { code: 'supinator_right', name: 'Supinador', nameEn: 'Supinator' },
      { code: 'brachioradialis_right', name: 'Braquiorradial', nameEn: 'Brachioradialis' },
    ],
  },
  {
    code: 'lower_back_left',
    name: 'Lombar Esquerda',
    muscles: [
      { code: 'erector_spinae_lumbar_left', name: 'Eretor da Coluna Lombar', nameEn: 'Lumbar Erector Spinae' },
      { code: 'multifidus_left', name: 'Multífido', nameEn: 'Multifidus' },
      { code: 'quadratus_lumborum_left', name: 'Quadrado Lombar', nameEn: 'Quadratus Lumborum' },
    ],
  },
  {
    code: 'lower_back_right',
    name: 'Lombar Direita',
    muscles: [
      { code: 'erector_spinae_lumbar_right', name: 'Eretor da Coluna Lombar', nameEn: 'Lumbar Erector Spinae' },
      { code: 'multifidus_right', name: 'Multífido', nameEn: 'Multifidus' },
      { code: 'quadratus_lumborum_right', name: 'Quadrado Lombar', nameEn: 'Quadratus Lumborum' },
    ],
  },
  {
    code: 'glute_left',
    name: 'Glúteo Esquerdo',
    muscles: [
      { code: 'gluteus_maximus_left', name: 'Glúteo Máximo', nameEn: 'Gluteus Maximus' },
      { code: 'gluteus_medius_left', name: 'Glúteo Médio', nameEn: 'Gluteus Medius' },
      { code: 'gluteus_minimus_left', name: 'Glúteo Mínimo', nameEn: 'Gluteus Minimus' },
      { code: 'piriformis_left', name: 'Piriforme', nameEn: 'Piriformis' },
    ],
  },
  {
    code: 'glute_right',
    name: 'Glúteo Direito',
    muscles: [
      { code: 'gluteus_maximus_right', name: 'Glúteo Máximo', nameEn: 'Gluteus Maximus' },
      { code: 'gluteus_medius_right', name: 'Glúteo Médio', nameEn: 'Gluteus Medius' },
      { code: 'gluteus_minimus_right', name: 'Glúteo Mínimo', nameEn: 'Gluteus Minimus' },
      { code: 'piriformis_right', name: 'Piriforme', nameEn: 'Piriformis' },
    ],
  },
  {
    code: 'thigh_left_back',
    name: 'Coxa Esquerda',
    muscles: [
      { code: 'biceps_femoris_left', name: 'Bíceps Femoral', nameEn: 'Biceps Femoris' },
      { code: 'semitendinosus_left', name: 'Semitendinoso', nameEn: 'Semitendinosus' },
      { code: 'semimembranosus_left', name: 'Semimembranoso', nameEn: 'Semimembranosus' },
    ],
  },
  {
    code: 'thigh_right_back',
    name: 'Coxa Direita',
    muscles: [
      { code: 'biceps_femoris_right', name: 'Bíceps Femoral', nameEn: 'Biceps Femoris' },
      { code: 'semitendinosus_right', name: 'Semitendinoso', nameEn: 'Semitendinosus' },
      { code: 'semimembranosus_right', name: 'Semimembranoso', nameEn: 'Semimembranosus' },
    ],
  },
  {
    code: 'calf_left_back',
    name: 'Panturrilha Esquerda',
    muscles: [
      { code: 'gastrocnemius_left', name: 'Gastrocnêmio', nameEn: 'Gastrocnemius' },
      { code: 'soleus_left', name: 'Sóleo', nameEn: 'Soleus' },
      { code: 'plantaris_left', name: 'Plantar', nameEn: 'Plantaris' },
      { code: 'popliteus_left', name: 'Poplíteo', nameEn: 'Popliteus' },
    ],
  },
  {
    code: 'calf_right_back',
    name: 'Panturrilha Direita',
    muscles: [
      { code: 'gastrocnemius_right', name: 'Gastrocnêmio', nameEn: 'Gastrocnemius' },
      { code: 'soleus_right', name: 'Sóleo', nameEn: 'Soleus' },
      { code: 'plantaris_right', name: 'Plantar', nameEn: 'Plantaris' },
      { code: 'popliteus_right', name: 'Poplíteo', nameEn: 'Popliteus' },
    ],
  },
  {
    code: 'ankle_left_back',
    name: 'Tornozelo Esquerdo (Posterior)',
    muscles: [
      { code: 'flexor_retinaculum_left', name: 'Retináculo dos Flexores', nameEn: 'Flexor Retinaculum' },
      { code: 'tarsal_tunnel_left', name: 'Túnel do Tarso', nameEn: 'Tarsal Tunnel' },
    ],
  },
  {
    code: 'ankle_right_back',
    name: 'Tornozelo Direito (Posterior)',
    muscles: [
      { code: 'flexor_retinaculum_right', name: 'Retináculo dos Flexores', nameEn: 'Flexor Retinaculum' },
      { code: 'tarsal_tunnel_right', name: 'Túnel do Tarso', nameEn: 'Tarsal Tunnel' },
    ],
  },
];

// Função para obter músculos por região
export function getMusclesByRegion(regionCode: string, view: 'front' | 'back'): Muscle[] {
  const groups = view === 'front' ? FRONT_MUSCLE_GROUPS : BACK_MUSCLE_GROUPS;
  const group = groups.find(g => g.code === regionCode);
  return group?.muscles || [];
}

// Função para obter grupo muscular por código
export function getMuscleGroup(regionCode: string, view: 'front' | 'back'): MuscleGroup | undefined {
  const groups = view === 'front' ? FRONT_MUSCLE_GROUPS : BACK_MUSCLE_GROUPS;
  return groups.find(g => g.code === regionCode);
}

// Função para obter todos os grupos musculares
export function getAllMuscleGroups(view: 'front' | 'back'): MuscleGroup[] {
  return view === 'front' ? FRONT_MUSCLE_GROUPS : BACK_MUSCLE_GROUPS;
}
