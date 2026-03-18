-- ========================================
-- Backup do Schema - FisioFlow
-- Timestamp: 2026-03-18T16:14:03.428Z
-- Tabelas: achievements, achievements_log, appointments, articles, blocked_slots, blocked_times, board_columns, boards, business_hours, cancellation_rules, centros_custo, clinic_profiles, clinical_test_templates, commission_payouts, conduct_library, contas_financeiras, convenios, crm_campanha_envios, crm_campanhas, daily_quests, doctors, empresas_parceiras, evaluation_templates, evolution_measurements, exercise_categories, exercise_favorites, exercise_plan_items, exercise_plans, exercise_protocols, exercise_template_items, exercise_templates, exercises, fcm_tokens, force_sessions, formas_pagamento, fornecedores, goals, medical_attachments, medical_records, nfse, nfse_config, nfse_records, notifications, organizations, package_usage, pagamentos, pathologies, pathology_required_measurements, patient_gamification, patient_goals, patient_medical_returns, patient_packages, patient_pathologies, patient_surgeries, patients, physical_examinations, profiles, projects, protocol_exercises, push_tokens, rooms, satisfaction_surveys, schedule_capacity, scheduling_notification_settings, session_attachments, session_package_templates, session_templates, sessions, surgeries, tarefas, telemedicine_rooms, therapist_commissions, transacoes, treatment_plans, user_invitations, user_vouchers, voucher_checkout_sessions, vouchers, waitlist, whatsapp_messages, wiki_page_versions, wiki_pages, xp_transactions
-- ========================================


-- ========================================
-- TABELAS E COLUNAS
-- ========================================

-- Tabela: achievements
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  xp_reward integer(32) DEFAULT 50,
  icon text,
  category text DEFAULT 'general'::text,
  requirements jsonb,
  created_at timestamp with time zone DEFAULT now(),

-- Tabela: achievements_log
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  achievement_title text NOT NULL,
  unlocked_at timestamp with time zone,
  xp_reward integer(32),

-- Tabela: appointments
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  therapist_id uuid NOT NULL,
  organization_id uuid,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone,
  duration_minutes integer(32) DEFAULT 60,
  status USER-DEFINED DEFAULT 'scheduled'::appointment_status,
  type USER-DEFINED DEFAULT 'session'::appointment_type,
  is_group boolean DEFAULT false,
  max_participants integer(32) DEFAULT 1,
  current_participants integer(32) DEFAULT 1,
  group_id uuid,
  room_id uuid,
  confirmed_at timestamp without time zone,
  confirmed_via character varying(50),
  reminder_sent_at timestamp without time zone,
  payment_status USER-DEFINED DEFAULT 'pending'::payment_status,
  payment_amount numeric(10,2),
  paid_at timestamp without time zone,
  package_id uuid,
  notes text,
  cancellation_reason text,
  cancelled_at timestamp without time zone,
  cancelled_by uuid,
  rescheduled_from uuid,
  rescheduled_to uuid,
  is_recurring boolean DEFAULT false,
  recurrence_pattern character varying(50),
  recurrence_group_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  created_by uuid,

-- Tabela: articles
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  authors text NOT NULL DEFAULT ''::text,
  summary text NOT NULL DEFAULT ''::text,
  category text NOT NULL DEFAULT 'Geral'::text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_url text,
  file_url text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: blocked_slots
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid,
  room_id uuid,
  organization_id uuid,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  reason character varying(200),
  is_all_day boolean DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: blocked_times
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  therapist_id text,
  title text NOT NULL DEFAULT 'Bloqueio'::text,
  reason text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time without time zone,
  end_time time without time zone,
  is_all_day boolean NOT NULL DEFAULT true,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: board_columns
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL,
  name text NOT NULL,
  color character varying(7) DEFAULT '#E2E8F0'::character varying,
  wip_limit integer(32),
  order_index integer(32) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: boards
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid,
  background_color character varying(7) DEFAULT '#0079BF'::character varying,
  background_image text,
  icon text DEFAULT '📋'::text,
  is_starred boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: business_hours
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  day_of_week integer(32) NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  is_closed boolean DEFAULT false,
  open_time time without time zone,
  close_time time without time zone,
  is_open boolean DEFAULT true,
  break_start time without time zone,
  break_end time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: cancellation_rules
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  min_hours_notice integer(32) DEFAULT 24,
  allow_reschedule boolean DEFAULT true,
  cancellation_fee numeric(10,2) DEFAULT 0,
  min_hours_before integer(32) DEFAULT 24,
  allow_patient_cancellation boolean DEFAULT true,
  max_cancellations_month integer(32) DEFAULT 3,
  charge_late_cancellation boolean DEFAULT false,
  late_cancellation_fee numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: centros_custo
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  codigo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: clinic_profiles
  organization_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Activity Fisioterapia'::text,
  physio_name text NOT NULL DEFAULT 'Dr. Fisioterapeuta'::text,
  crefito text NOT NULL DEFAULT ''::text,
  logo_uri text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: clinical_test_templates
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  description text,
  category text,
  instructions text,
  interpretation text,
  reference_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: commission_payouts
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  therapist_id text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sessions integer(32) DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),

-- Tabela: conduct_library
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  created_by text,
  title text NOT NULL,
  description text,
  conduct_text text NOT NULL,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: contas_financeiras
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tipo text NOT NULL,
  valor numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  descricao text,
  data_vencimento date,
  pago_em date,
  patient_id uuid,
  appointment_id uuid,
  categoria text,
  forma_pagamento text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: convenios
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  cnpj text,
  telefone text,
  email text,
  contato_responsavel text,
  valor_repasse numeric(12,2),
  prazo_pagamento_dias integer(32),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: crm_campanha_envios
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL,
  patient_id uuid,
  canal text,
  status text DEFAULT 'enviado'::text,
  enviado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: crm_campanhas
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by text,
  nome text NOT NULL,
  tipo text NOT NULL,
  conteudo text,
  status text DEFAULT 'concluida'::text,
  total_destinatarios integer(32) DEFAULT 0,
  total_enviados integer(32) DEFAULT 0,
  agendada_em timestamp with time zone,
  concluida_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: daily_quests
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  date date DEFAULT now(),
  quests_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_count integer(32) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: doctors
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  specialty text,
  crm text,
  crm_state text,
  phone text,
  email text,
  clinic_name text,
  clinic_address text,
  clinic_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,

-- Tabela: empresas_parceiras
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  contato text,
  email text,
  telefone text,
  contrapartidas text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: evaluation_templates
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying(200) NOT NULL,
  description text,
  category character varying(100),
  content jsonb,
  is_global boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: evolution_measurements
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  soap_record_id uuid,
  measurement_type text NOT NULL,
  measurement_name text NOT NULL,
  value numeric,
  unit text,
  notes text,
  custom_data jsonb,
  measured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: exercise_categories
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying(100) NOT NULL,
  name character varying(200) NOT NULL,
  description text,
  icon character varying(50),
  color character varying(20),
  order_index integer(32) DEFAULT 0,
  parent_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: exercise_favorites
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL,
  user_id text NOT NULL,
  organization_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: exercise_plan_items
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  exercise_id uuid,
  order_index integer(32) NOT NULL DEFAULT 0,
  sets integer(32),
  repetitions integer(32),
  duration integer(32),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: exercise_plans
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ativo'::text,
  start_date date,
  end_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: exercise_protocols
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying(250),
  name character varying(250) NOT NULL,
  condition_name character varying(250),
  protocol_type USER-DEFINED DEFAULT 'patologia'::protocol_type,
  evidence_level USER-DEFINED,
  description text,
  objectives text,
  contraindications text,
  weeks_total integer(32),
  phases jsonb DEFAULT '[]'::jsonb,
  milestones jsonb DEFAULT '[]'::jsonb,
  restrictions jsonb DEFAULT '[]'::jsonb,
  progression_criteria jsonb DEFAULT '[]'::jsonb,
  references jsonb DEFAULT '[]'::jsonb,
  icd10_codes ARRAY DEFAULT '{}'::text[],
  tags ARRAY DEFAULT '{}'::text[],
  clinical_tests ARRAY DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  organization_id uuid,
  created_by text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  embedding USER-DEFINED,
  wiki_page_id uuid,

-- Tabela: exercise_template_items
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  exercise_id text NOT NULL,
  order_index integer(32) NOT NULL DEFAULT 0,
  sets integer(32),
  repetitions integer(32),
  duration integer(32),
  notes text,
  week_start integer(32),
  week_end integer(32),
  clinical_notes text,
  focus_muscles ARRAY DEFAULT '{}'::text[],
  purpose text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: exercise_templates
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(500) NOT NULL,
  description text,
  category character varying(200),
  condition_name character varying(500),
  template_variant character varying(200),
  clinical_notes text,
  contraindications text,
  precautions text,
  progression_notes text,
  evidence_level USER-DEFINED,
  bibliographic_references ARRAY DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  organization_id uuid,
  created_by text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: exercises
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying(250),
  name character varying(250) NOT NULL,
  category_id uuid,
  subcategory character varying(100),
  difficulty USER-DEFINED DEFAULT 'iniciante'::exercise_difficulty,
  description text,
  instructions text,
  tips text,
  precautions text,
  benefits text,
  muscles_primary ARRAY DEFAULT '{}'::text[],
  muscles_secondary ARRAY DEFAULT '{}'::text[],
  body_parts ARRAY DEFAULT '{}'::text[],
  equipment ARRAY DEFAULT '{}'::text[],
  sets_recommended integer(32),
  reps_recommended integer(32),
  duration_seconds integer(32),
  rest_seconds integer(32),
  image_url text,
  thumbnail_url text,
  video_url text,
  pathologies_indicated ARRAY DEFAULT '{}'::text[],
  pathologies_contraindicated ARRAY DEFAULT '{}'::text[],
  icd10_codes ARRAY DEFAULT '{}'::text[],
  tags ARRAY DEFAULT '{}'::text[],
  references text,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  organization_id uuid,
  created_by text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  embedding USER-DEFINED,

-- Tabela: fcm_tokens
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL,
  user_id text NOT NULL,
  tenant_id text,
  platform text,
  device_model text,
  os_version text,
  app_version text,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: force_sessions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  protocol_name text NOT NULL,
  body_part text NOT NULL,
  side text NOT NULL DEFAULT 'RIGHT'::text,
  raw_force_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  peak_force double precision(53) NOT NULL DEFAULT 0,
  avg_force double precision(53) NOT NULL DEFAULT 0,
  duration double precision(53) NOT NULL DEFAULT 0,
  rate_of_force_development double precision(53) NOT NULL DEFAULT 0,
  sensitivity integer(32) NOT NULL DEFAULT 3,
  notes text NOT NULL DEFAULT ''::text,
  device_model text,
  device_firmware text,
  device_battery integer(32),
  sample_rate integer(32),
  measurement_mode text,
  is_simulated boolean NOT NULL DEFAULT false,
  repetitions integer(32),
  total_reps integer(32),
  avg_peak_force double precision(53),
  body_weight double precision(53),
  peak_force_n double precision(53),
  peak_force_nkg double precision(53),
  rfd_50 double precision(53),
  rfd_100 double precision(53),
  rfd_200 double precision(53),
  time_to_peak double precision(53),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: formas_pagamento
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral'::text,
  taxa_percentual numeric(5,2) NOT NULL DEFAULT 0,
  dias_recebimento integer(32) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: fornecedores
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'pj'::text,
  razao_social text NOT NULL,
  nome_fantasia text,
  cpf_cnpj text,
  inscricao_estadual text,
  email text,
  telefone text,
  celular text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  categoria text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: goals
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  description text NOT NULL,
  target_date date,
  priority integer(32) DEFAULT 0,
  status USER-DEFINED DEFAULT 'pending'::goal_status,
  achieved_at timestamp without time zone,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: medical_attachments
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  record_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint(64),
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by text,
  category text NOT NULL DEFAULT 'other'::text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: medical_records
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  chief_complaint text,
  current_history text,
  past_history text,
  family_history text,
  medications jsonb DEFAULT '[]'::jsonb,
  allergies jsonb DEFAULT '[]'::jsonb,
  physical_activity text,
  lifestyle jsonb,
  physical_exam jsonb,
  diagnosis text,
  icd10_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: nfse
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text NOT NULL,
  serie text,
  tipo text NOT NULL DEFAULT 'saida'::text,
  valor numeric(12,2) NOT NULL,
  data_emissao timestamp with time zone NOT NULL DEFAULT now(),
  data_prestacao timestamp with time zone,
  destinatario jsonb NOT NULL DEFAULT '{}'::jsonb,
  prestador jsonb NOT NULL DEFAULT '{}'::jsonb,
  servico jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho'::text,
  chave_acesso text,
  protocolo text,
  verificacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: nfse_config
  organization_id uuid NOT NULL,
  ambiente text NOT NULL DEFAULT 'homologacao'::text,
  municipio_codigo text,
  cnpj_prestador text,
  inscricao_municipal text,
  aliquota_iss numeric(5,2) NOT NULL DEFAULT 5,
  auto_emissao boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: nfse_records
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  appointment_id uuid,
  numero_nfse text,
  numero_rps text NOT NULL,
  serie_rps text NOT NULL DEFAULT 'RPS'::text,
  data_emissao timestamp with time zone DEFAULT now(),
  valor_servico numeric(10,2) NOT NULL,
  aliquota_iss numeric(5,4) DEFAULT 0.02,
  valor_iss numeric(10,2),
  valor_deducoes numeric(10,2) DEFAULT 0,
  valor_base_calculo numeric(10,2),
  iss_retido boolean DEFAULT false,
  codigo_servico text NOT NULL DEFAULT '14.01'::text,
  discriminacao text NOT NULL,
  municipio_prestacao text DEFAULT '3550308'::text,
  tomador_nome text,
  tomador_cpf_cnpj text,
  tomador_email text,
  tomador_logradouro text,
  tomador_numero text,
  tomador_complemento text,
  tomador_bairro text,
  tomador_cidade text,
  tomador_uf text,
  tomador_cep text,
  status text DEFAULT 'rascunho'::text,
  erro_message text,
  xml_rps text,
  xml_nfse text,
  numero_lote text,
  codigo_verificacao text,
  link_nfse text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: notifications
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text,
  user_id text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: organizations
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  created_at timestamp with time zone DEFAULT now(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,

-- Tabela: package_usage
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_package_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: pagamentos
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  evento_id uuid,
  appointment_id uuid,
  patient_id uuid,
  valor numeric(12,2) NOT NULL,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'paid'::text,
  pago_em date,
  observacoes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: pathologies
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  name character varying(200) NOT NULL,
  icd_code character varying(20),
  status USER-DEFINED DEFAULT 'active'::pathology_status,
  diagnosed_at date,
  treated_at date,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: pathology_required_measurements
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pathology_name text NOT NULL,
  measurement_name text NOT NULL,
  measurement_unit text,
  alert_level text,
  instructions text,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: patient_gamification
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  current_xp integer(32) DEFAULT 0,
  level integer(32) DEFAULT 1,
  current_streak integer(32) DEFAULT 0,
  longest_streak integer(32) DEFAULT 0,
  total_points integer(32) DEFAULT 0,
  last_activity_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: patient_goals
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  description text NOT NULL,
  target_date timestamp without time zone,
  status text NOT NULL DEFAULT 'em_andamento'::text,
  priority text DEFAULT 'media'::text,
  achieved_at timestamp without time zone,
  metadata jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: patient_medical_returns
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  doctor_name text,
  doctor_phone text,
  return_date date,
  return_period text,
  notes text,
  report_done boolean DEFAULT false,
  report_sent boolean DEFAULT false,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: patient_packages
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  name character varying(100) NOT NULL,
  total_sessions integer(32) NOT NULL,
  used_sessions integer(32) NOT NULL DEFAULT 0,
  remaining_sessions integer(32) NOT NULL,
  price numeric(10,2),
  status USER-DEFINED DEFAULT 'active'::package_status,
  purchased_at timestamp without time zone NOT NULL DEFAULT now(),
  expires_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  organization_id uuid,
  package_template_id uuid,
  payment_method text,
  last_used_at timestamp with time zone,
  created_by text,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: patient_pathologies
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  diagnosed_at timestamp without time zone,
  status text NOT NULL DEFAULT 'ativo'::text,
  is_primary boolean DEFAULT false,
  icd_code text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: patient_surgeries
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  surgery_name text NOT NULL,
  surgery_date date,
  surgeon_name text,
  hospital text,
  post_op_protocol text,
  surgery_type text,
  affected_side text,
  complications text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: patients
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying(150) NOT NULL,
  cpf character varying(14),
  gender USER-DEFINED,
  phone character varying(20),
  email character varying(255),
  photo_url text,
  profession character varying(100),
  organization_id uuid,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  date_of_birth date,
  archived boolean NOT NULL DEFAULT false,
  weight double precision(53),
  address jsonb,
  phone_secondary character varying(20),
  rg character varying(20),
  incomplete_registration boolean NOT NULL DEFAULT false,
  consent_data boolean DEFAULT true,
  emergency_contact jsonb,
  insurance jsonb,
  observations text,
  consent_image boolean DEFAULT false,
  blood_type character varying(10),
  marital_status character varying(50),
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  origin character varying(100),
  session_value numeric(10,2),
  referred_by character varying(150),
  education_level character varying(100),
  professional_name character varying(150),
  user_id text,
  profile_id uuid,
  professional_id uuid,
  main_condition text,
  progress integer(32) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  status character varying(100) DEFAULT 'Inicial'::character varying,

-- Tabela: physical_examinations
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  vital_signs jsonb NOT NULL DEFAULT '{}'::jsonb,
  general_appearance text,
  heent text,
  cardiovascular text,
  respiratory text,
  gastrointestinal text,
  musculoskeletal text,
  neurological text,
  integumentary text,
  psychological text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: profiles
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'authenticated'::text,
  organization_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  birth_date date,

-- Tabela: projects
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'::text,
  start_date date,
  end_date date,
  created_by uuid NOT NULL,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: protocol_exercises
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  phase_week_start integer(32) NOT NULL,
  phase_week_end integer(32),
  sets_recommended integer(32),
  reps_recommended integer(32),
  duration_seconds integer(32),
  frequency_per_week integer(32),
  progression_notes text,
  order_index integer(32) DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: push_tokens
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  expo_push_token character varying(255) NOT NULL,
  device_name character varying(100),
  device_type character varying(50),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: rooms
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name character varying(100) NOT NULL,
  capacity integer(32) DEFAULT 1,
  is_active boolean DEFAULT true,
  working_hours text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: satisfaction_surveys
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  appointment_id uuid,
  therapist_id text,
  nps_score integer(32),
  q_care_quality integer(32),
  q_professionalism integer(32),
  q_facility_cleanliness integer(32),
  q_scheduling_ease integer(32),
  q_communication integer(32),
  comments text,
  suggestions text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  response_time_hours numeric(6,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: schedule_capacity
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  day_of_week integer(32) NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  max_patients integer(32) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: scheduling_notification_settings
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  enable_reminders boolean DEFAULT true,
  reminder_hours_before integer(32) DEFAULT 24,
  enable_confirmation boolean DEFAULT true,
  send_confirmation_email boolean DEFAULT true,
  send_confirmation_whatsapp boolean DEFAULT true,
  send_reminder_24h boolean DEFAULT true,
  send_reminder_2h boolean DEFAULT true,
  send_cancellation_notice boolean DEFAULT true,
  custom_confirmation_message text,
  custom_reminder_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: session_attachments
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  patient_id uuid NOT NULL,
  file_name character varying(255) NOT NULL,
  original_name character varying(255),
  file_url text NOT NULL,
  thumbnail_url text,
  file_type USER-DEFINED DEFAULT 'other'::file_type,
  mime_type character varying(100),
  category USER-DEFINED DEFAULT 'other'::file_category,
  size_bytes integer(32),
  description text,
  uploaded_by uuid,
  uploaded_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: session_package_templates
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sessions_count integer(32) NOT NULL,
  price numeric(12,2) NOT NULL,
  validity_days integer(32) NOT NULL DEFAULT 365,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: session_templates
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  therapist_id uuid,
  name character varying(200) NOT NULL,
  description text,
  subjective jsonb,
  objective jsonb,
  assessment jsonb,
  plan jsonb,
  is_global boolean DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: sessions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  appointment_id uuid,
  therapist_id uuid,
  organization_id uuid,
  session_number integer(32),
  date timestamp without time zone NOT NULL DEFAULT now(),
  duration_minutes integer(32),
  subjective jsonb,
  objective jsonb,
  assessment jsonb,
  plan jsonb,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::session_status,
  last_auto_save_at timestamp without time zone,
  finalized_at timestamp without time zone,
  finalized_by uuid,
  replicated_from_id uuid,
  pdf_url text,
  pdf_generated_at timestamp without time zone,
  required_tests jsonb,
  alerts_acknowledged boolean DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  protocol_name text NOT NULL DEFAULT ''::text,
  body_part text NOT NULL DEFAULT ''::text,
  side text NOT NULL DEFAULT 'RIGHT'::text,
  raw_force_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  peak_force double precision(53) NOT NULL DEFAULT 0,
  avg_force double precision(53) NOT NULL DEFAULT 0,
  duration double precision(53) NOT NULL DEFAULT 0,
  rate_of_force_development double precision(53) NOT NULL DEFAULT 0,
  sensitivity integer(32) NOT NULL DEFAULT 3,
  notes text NOT NULL DEFAULT ''::text,
  device_model text,
  device_firmware text,
  device_battery integer(32),
  sample_rate integer(32),
  measurement_mode text,
  is_simulated boolean NOT NULL DEFAULT false,
  repetitions integer(32),
  total_reps integer(32),
  avg_peak_force double precision(53),
  peak_force_nkg double precision(53),
  body_weight double precision(53),
  rfd_50 double precision(53),
  rfd_100 double precision(53),
  rfd_200 double precision(53),
  peak_force_n double precision(53),
  time_to_peak double precision(53),

-- Tabela: surgeries
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL,
  name character varying(200) NOT NULL,
  surgery_date date,
  surgeon character varying(150),
  hospital character varying(150),
  post_op_protocol text,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: tarefas
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by text NOT NULL,
  responsavel_id text,
  project_id uuid,
  parent_id uuid,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'A_FAZER'::text,
  prioridade text NOT NULL DEFAULT 'MEDIA'::text,
  tipo text NOT NULL DEFAULT 'TAREFA'::text,
  data_vencimento timestamp with time zone,
  start_date timestamp with time zone,
  completed_at timestamp with time zone,
  order_index integer(32) NOT NULL DEFAULT 0,
  tags ARRAY NOT NULL DEFAULT '{}'::text[],
  checklists jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  task_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  requires_acknowledgment boolean NOT NULL DEFAULT false,
  acknowledgments jsonb NOT NULL DEFAULT '[]'::jsonb,
  board_id uuid,
  column_id uuid,

-- Tabela: telemedicine_rooms
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  patient_id text NOT NULL,
  therapist_id text,
  appointment_id text,
  room_code text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando'::text,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_minutes integer(32),
  recording_url text,
  meeting_provider text,
  meeting_url text,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: therapist_commissions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  therapist_id text NOT NULL,
  commission_rate numeric(5,2) NOT NULL DEFAULT 40.00,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

-- Tabela: transacoes
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text,
  tipo text NOT NULL,
  valor numeric(12,2) NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente'::text,
  categoria text,
  stripe_payment_intent_id text,
  stripe_refund_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: treatment_plans
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  diagnosis jsonb NOT NULL DEFAULT '[]'::jsonb,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: user_invitations
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'fisioterapeuta'::text,
  token text NOT NULL,
  invited_by text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: user_vouchers
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  voucher_id uuid NOT NULL,
  sessoes_restantes integer(32) NOT NULL,
  sessoes_totais integer(32) NOT NULL,
  data_compra timestamp with time zone NOT NULL DEFAULT now(),
  data_expiracao timestamp with time zone NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  valor_pago numeric(12,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: voucher_checkout_sessions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  voucher_id uuid NOT NULL,
  user_voucher_id uuid,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: vouchers
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  sessoes integer(32),
  validade_dias integer(32) NOT NULL DEFAULT 30,
  preco numeric(12,2) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: waitlist
  id text NOT NULL DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id text NOT NULL,
  patient_id text NOT NULL,
  preferred_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_periods jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_therapist_id text,
  priority text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'waiting'::text,
  notes text,
  refusal_count integer(32) NOT NULL DEFAULT 0,
  offered_slot text,
  offered_at timestamp with time zone,
  offer_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: whatsapp_messages
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid,
  from_phone text NOT NULL,
  to_phone text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'text'::text,
  status text NOT NULL DEFAULT 'sent'::text,
  message_id text,
  template_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

-- Tabela: wiki_page_versions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL,
  title character varying(500) NOT NULL,
  content text NOT NULL,
  html_content text,
  version integer(32) NOT NULL,
  comment character varying(500),
  created_by text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),

-- Tabela: wiki_pages
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying(350) NOT NULL,
  title character varying(500) NOT NULL,
  content text DEFAULT ''::text,
  html_content text,
  icon character varying(50),
  cover_image text,
  parent_id uuid,
  category character varying(100),
  tags ARRAY DEFAULT '{}'::text[],
  is_published boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  view_count integer(32) NOT NULL DEFAULT 0,
  version integer(32) NOT NULL DEFAULT 1,
  organization_id uuid,
  created_by text,
  updated_by text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  deleted_at timestamp without time zone,

-- Tabela: xp_transactions
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  amount integer(32) NOT NULL,
  reason text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,


-- ========================================
-- ÍNDICES
-- ========================================

-- Índice: achievements_code_unique na tabela achievements
CREATE UNIQUE INDEX achievements_code_unique ON public.achievements USING btree (code);

-- Índice: achievements_pkey na tabela achievements
CREATE UNIQUE INDEX achievements_pkey ON public.achievements USING btree (id);

-- Índice: achievements_log_pkey na tabela achievements_log
CREATE UNIQUE INDEX achievements_log_pkey ON public.achievements_log USING btree (id);

-- Índice: appointments_pkey na tabela appointments
CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

-- Índice: idx_appointments_org_date_time na tabela appointments
CREATE INDEX idx_appointments_org_date_time ON public.appointments USING btree (organization_id, date, start_time);

-- Índice: idx_appointments_organization_id na tabela appointments
CREATE INDEX idx_appointments_organization_id ON public.appointments USING btree (organization_id);

-- Índice: idx_appointments_patient_date na tabela appointments
CREATE INDEX idx_appointments_patient_date ON public.appointments USING btree (patient_id, date DESC);

-- Índice: idx_appointments_patient_id na tabela appointments
CREATE INDEX idx_appointments_patient_id ON public.appointments USING btree (patient_id);

-- Índice: idx_appointments_room_id na tabela appointments
CREATE INDEX idx_appointments_room_id ON public.appointments USING btree (room_id);

-- Índice: idx_appointments_status na tabela appointments
CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);

-- Índice: idx_appointments_therapist_date na tabela appointments
CREATE INDEX idx_appointments_therapist_date ON public.appointments USING btree (therapist_id, date);

-- Índice: idx_appointments_time_conflict na tabela appointments
CREATE INDEX idx_appointments_time_conflict ON public.appointments USING btree (therapist_id, date, start_time, end_time) WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status, 'rescheduled'::appointment_status]));

-- Índice: articles_pkey na tabela articles
CREATE UNIQUE INDEX articles_pkey ON public.articles USING btree (id);

-- Índice: idx_articles_org_id na tabela articles
CREATE INDEX idx_articles_org_id ON public.articles USING btree (organization_id);

-- Índice: blocked_slots_pkey na tabela blocked_slots
CREATE UNIQUE INDEX blocked_slots_pkey ON public.blocked_slots USING btree (id);

-- Índice: idx_blocked_slots_organization_id na tabela blocked_slots
CREATE INDEX idx_blocked_slots_organization_id ON public.blocked_slots USING btree (organization_id);

-- Índice: idx_blocked_slots_room_date na tabela blocked_slots
CREATE INDEX idx_blocked_slots_room_date ON public.blocked_slots USING btree (room_id, date);

-- Índice: idx_blocked_slots_therapist_date na tabela blocked_slots
CREATE INDEX idx_blocked_slots_therapist_date ON public.blocked_slots USING btree (therapist_id, date);

-- Índice: blocked_times_pkey na tabela blocked_times
CREATE UNIQUE INDEX blocked_times_pkey ON public.blocked_times USING btree (id);

-- Índice: idx_blocked_times_org_dates na tabela blocked_times
CREATE INDEX idx_blocked_times_org_dates ON public.blocked_times USING btree (organization_id, start_date, end_date);

-- Índice: board_columns_pkey na tabela board_columns
CREATE UNIQUE INDEX board_columns_pkey ON public.board_columns USING btree (id);

-- Índice: idx_board_columns_board_id na tabela board_columns
CREATE INDEX idx_board_columns_board_id ON public.board_columns USING btree (board_id);

-- Índice: boards_pkey na tabela boards
CREATE UNIQUE INDEX boards_pkey ON public.boards USING btree (id);

-- Índice: idx_boards_organization_id na tabela boards
CREATE INDEX idx_boards_organization_id ON public.boards USING btree (organization_id);

-- Índice: business_hours_pkey na tabela business_hours
CREATE UNIQUE INDEX business_hours_pkey ON public.business_hours USING btree (id);

-- Índice: idx_business_hours_org_day na tabela business_hours
CREATE INDEX idx_business_hours_org_day ON public.business_hours USING btree (organization_id, day_of_week);

-- Índice: cancellation_rules_pkey na tabela cancellation_rules
CREATE UNIQUE INDEX cancellation_rules_pkey ON public.cancellation_rules USING btree (id);

-- Índice: idx_cancellation_rules_org na tabela cancellation_rules
CREATE INDEX idx_cancellation_rules_org ON public.cancellation_rules USING btree (organization_id);

-- Índice: centros_custo_pkey na tabela centros_custo
CREATE UNIQUE INDEX centros_custo_pkey ON public.centros_custo USING btree (id);

-- Índice: idx_centros_custo_org_nome na tabela centros_custo
CREATE INDEX idx_centros_custo_org_nome ON public.centros_custo USING btree (organization_id, nome);

-- Índice: clinic_profiles_pkey na tabela clinic_profiles
CREATE UNIQUE INDEX clinic_profiles_pkey ON public.clinic_profiles USING btree (organization_id);

-- Índice: clinical_test_templates_pkey na tabela clinical_test_templates
CREATE UNIQUE INDEX clinical_test_templates_pkey ON public.clinical_test_templates USING btree (id);

-- Índice: idx_clinical_test_templates_name na tabela clinical_test_templates
CREATE INDEX idx_clinical_test_templates_name ON public.clinical_test_templates USING btree (name);

-- Índice: idx_clinical_test_templates_org_name na tabela clinical_test_templates
CREATE INDEX idx_clinical_test_templates_org_name ON public.clinical_test_templates USING btree (organization_id, name);

-- Índice: commission_payouts_pkey na tabela commission_payouts
CREATE UNIQUE INDEX commission_payouts_pkey ON public.commission_payouts USING btree (id);

-- Índice: idx_commission_payouts_org na tabela commission_payouts
CREATE INDEX idx_commission_payouts_org ON public.commission_payouts USING btree (organization_id);

-- Índice: idx_commission_payouts_therapist na tabela commission_payouts
CREATE INDEX idx_commission_payouts_therapist ON public.commission_payouts USING btree (therapist_id);

-- Índice: uq_commission_payouts na tabela commission_payouts
CREATE UNIQUE INDEX uq_commission_payouts ON public.commission_payouts USING btree (organization_id, therapist_id, period_start, period_end);

-- Índice: conduct_library_pkey na tabela conduct_library
CREATE UNIQUE INDEX conduct_library_pkey ON public.conduct_library USING btree (id);

-- Índice: contas_financeiras_pkey na tabela contas_financeiras
CREATE UNIQUE INDEX contas_financeiras_pkey ON public.contas_financeiras USING btree (id);

-- Índice: idx_contas_financeiras_org_status_vencimento na tabela contas_financeiras
CREATE INDEX idx_contas_financeiras_org_status_vencimento ON public.contas_financeiras USING btree (organization_id, status, data_vencimento);

-- Índice: idx_contas_financeiras_org_tipo na tabela contas_financeiras
CREATE INDEX idx_contas_financeiras_org_tipo ON public.contas_financeiras USING btree (organization_id, tipo);

-- Índice: convenios_pkey na tabela convenios
CREATE UNIQUE INDEX convenios_pkey ON public.convenios USING btree (id);

-- Índice: idx_convenios_org_nome na tabela convenios
CREATE INDEX idx_convenios_org_nome ON public.convenios USING btree (organization_id, nome);

-- Índice: crm_campanha_envios_pkey na tabela crm_campanha_envios
CREATE UNIQUE INDEX crm_campanha_envios_pkey ON public.crm_campanha_envios USING btree (id);

-- Índice: crm_campanhas_pkey na tabela crm_campanhas
CREATE UNIQUE INDEX crm_campanhas_pkey ON public.crm_campanhas USING btree (id);

-- Índice: daily_quests_patient_id_date_unique na tabela daily_quests
CREATE UNIQUE INDEX daily_quests_patient_id_date_unique ON public.daily_quests USING btree (patient_id, date);

-- Índice: daily_quests_pkey na tabela daily_quests
CREATE UNIQUE INDEX daily_quests_pkey ON public.daily_quests USING btree (id);

-- Índice: doctors_pkey na tabela doctors
CREATE UNIQUE INDEX doctors_pkey ON public.doctors USING btree (id);

-- Índice: idx_doctors_name_trgm na tabela doctors
CREATE INDEX idx_doctors_name_trgm ON public.doctors USING gin (name gin_trgm_ops);

-- Índice: idx_doctors_org_active na tabela doctors
CREATE INDEX idx_doctors_org_active ON public.doctors USING btree (organization_id, is_active);

-- Índice: idx_doctors_specialty na tabela doctors
CREATE INDEX idx_doctors_specialty ON public.doctors USING btree (specialty) WHERE (specialty IS NOT NULL);

-- Índice: idx_doctors_tsv na tabela doctors
CREATE INDEX idx_doctors_tsv ON public.doctors USING gin (to_tsvector('portuguese'::regconfig, ((((name || ' '::text) || COALESCE(specialty, ''::text)) || ' '::text) || COALESCE(clinic_name, ''::text))));

-- Índice: empresas_parceiras_pkey na tabela empresas_parceiras
CREATE UNIQUE INDEX empresas_parceiras_pkey ON public.empresas_parceiras USING btree (id);

-- Índice: idx_empresas_parceiras_org_nome na tabela empresas_parceiras
CREATE INDEX idx_empresas_parceiras_org_nome ON public.empresas_parceiras USING btree (organization_id, nome);

-- Índice: evaluation_templates_pkey na tabela evaluation_templates
CREATE UNIQUE INDEX evaluation_templates_pkey ON public.evaluation_templates USING btree (id);

-- Índice: evolution_measurements_pkey na tabela evolution_measurements
CREATE UNIQUE INDEX evolution_measurements_pkey ON public.evolution_measurements USING btree (id);

-- Índice: idx_evolution_measurements_patient na tabela evolution_measurements
CREATE INDEX idx_evolution_measurements_patient ON public.evolution_measurements USING btree (organization_id, patient_id, measured_at DESC);

-- Índice: exercise_categories_pkey na tabela exercise_categories
CREATE UNIQUE INDEX exercise_categories_pkey ON public.exercise_categories USING btree (id);

-- Índice: exercise_categories_slug_unique na tabela exercise_categories
CREATE UNIQUE INDEX exercise_categories_slug_unique ON public.exercise_categories USING btree (slug);

-- Índice: idx_exercise_categories_parent_id na tabela exercise_categories
CREATE INDEX idx_exercise_categories_parent_id ON public.exercise_categories USING btree (parent_id);

-- Índice: idx_exercise_categories_slug na tabela exercise_categories
CREATE INDEX idx_exercise_categories_slug ON public.exercise_categories USING btree (slug);

-- Índice: exercise_favorites_pkey na tabela exercise_favorites
CREATE UNIQUE INDEX exercise_favorites_pkey ON public.exercise_favorites USING btree (id);

-- Índice: idx_exercise_favorites_exercise_id na tabela exercise_favorites
CREATE INDEX idx_exercise_favorites_exercise_id ON public.exercise_favorites USING btree (exercise_id);

-- Índice: idx_exercise_favorites_organization_id na tabela exercise_favorites
CREATE INDEX idx_exercise_favorites_organization_id ON public.exercise_favorites USING btree (organization_id);

-- Índice: idx_exercise_favorites_user_id na tabela exercise_favorites
CREATE INDEX idx_exercise_favorites_user_id ON public.exercise_favorites USING btree (user_id);

-- Índice: exercise_plan_items_pkey na tabela exercise_plan_items
CREATE UNIQUE INDEX exercise_plan_items_pkey ON public.exercise_plan_items USING btree (id);

-- Índice: idx_exercise_plan_items_plan na tabela exercise_plan_items
CREATE INDEX idx_exercise_plan_items_plan ON public.exercise_plan_items USING btree (plan_id, order_index);

-- Índice: exercise_plans_pkey na tabela exercise_plans
CREATE UNIQUE INDEX exercise_plans_pkey ON public.exercise_plans USING btree (id);

-- Índice: idx_exercise_plans_patient na tabela exercise_plans
CREATE INDEX idx_exercise_plans_patient ON public.exercise_plans USING btree (patient_id, created_at DESC);

-- Índice: exercise_protocols_pkey na tabela exercise_protocols
CREATE UNIQUE INDEX exercise_protocols_pkey ON public.exercise_protocols USING btree (id);

-- Índice: exercise_protocols_slug_unique na tabela exercise_protocols
CREATE UNIQUE INDEX exercise_protocols_slug_unique ON public.exercise_protocols USING btree (slug);

-- Índice: idx_exercise_protocols_organization_id na tabela exercise_protocols
CREATE INDEX idx_exercise_protocols_organization_id ON public.exercise_protocols USING btree (organization_id);

-- Índice: idx_exercise_protocols_protocol_type na tabela exercise_protocols
CREATE INDEX idx_exercise_protocols_protocol_type ON public.exercise_protocols USING btree (protocol_type);

-- Índice: idx_exercise_protocols_slug na tabela exercise_protocols
CREATE INDEX idx_exercise_protocols_slug ON public.exercise_protocols USING btree (slug);

-- Índice: exercise_template_items_pkey na tabela exercise_template_items
CREATE UNIQUE INDEX exercise_template_items_pkey ON public.exercise_template_items USING btree (id);

-- Índice: exercise_templates_pkey na tabela exercise_templates
CREATE UNIQUE INDEX exercise_templates_pkey ON public.exercise_templates USING btree (id);

-- Índice: exercises_pkey na tabela exercises
CREATE UNIQUE INDEX exercises_pkey ON public.exercises USING btree (id);

-- Índice: exercises_slug_unique na tabela exercises
CREATE UNIQUE INDEX exercises_slug_unique ON public.exercises USING btree (slug);

-- Índice: idx_exercises_category_id na tabela exercises
CREATE INDEX idx_exercises_category_id ON public.exercises USING btree (category_id);

-- Índice: idx_exercises_is_active na tabela exercises
CREATE INDEX idx_exercises_is_active ON public.exercises USING btree (is_active);

-- Índice: idx_exercises_organization_id na tabela exercises
CREATE INDEX idx_exercises_organization_id ON public.exercises USING btree (organization_id);

-- Índice: idx_exercises_slug na tabela exercises
CREATE INDEX idx_exercises_slug ON public.exercises USING btree (slug);

-- Índice: fcm_tokens_pkey na tabela fcm_tokens
CREATE UNIQUE INDEX fcm_tokens_pkey ON public.fcm_tokens USING btree (id);

-- Índice: fcm_tokens_token_key na tabela fcm_tokens
CREATE UNIQUE INDEX fcm_tokens_token_key ON public.fcm_tokens USING btree (token);

-- Índice: force_sessions_pkey na tabela force_sessions
CREATE UNIQUE INDEX force_sessions_pkey ON public.force_sessions USING btree (id);

-- Índice: idx_force_sessions_org_created_at na tabela force_sessions
CREATE INDEX idx_force_sessions_org_created_at ON public.force_sessions USING btree (organization_id, created_at DESC);

-- Índice: formas_pagamento_pkey na tabela formas_pagamento
CREATE UNIQUE INDEX formas_pagamento_pkey ON public.formas_pagamento USING btree (id);

-- Índice: idx_formas_pagamento_org_nome na tabela formas_pagamento
CREATE INDEX idx_formas_pagamento_org_nome ON public.formas_pagamento USING btree (organization_id, nome);

-- Índice: fornecedores_pkey na tabela fornecedores
CREATE UNIQUE INDEX fornecedores_pkey ON public.fornecedores USING btree (id);

-- Índice: idx_fornecedores_org_razao_social na tabela fornecedores
CREATE INDEX idx_fornecedores_org_razao_social ON public.fornecedores USING btree (organization_id, razao_social);

-- Índice: goals_pkey na tabela goals
CREATE UNIQUE INDEX goals_pkey ON public.goals USING btree (id);

-- Índice: idx_goals_medical_record_id na tabela goals
CREATE INDEX idx_goals_medical_record_id ON public.goals USING btree (medical_record_id);

-- Índice: idx_goals_status na tabela goals
CREATE INDEX idx_goals_status ON public.goals USING btree (status);

-- Índice: idx_medical_attachments_patient_uploaded na tabela medical_attachments
CREATE INDEX idx_medical_attachments_patient_uploaded ON public.medical_attachments USING btree (patient_id, uploaded_at DESC);

-- Índice: idx_medical_attachments_record_uploaded na tabela medical_attachments
CREATE INDEX idx_medical_attachments_record_uploaded ON public.medical_attachments USING btree (record_id, uploaded_at DESC);

-- Índice: medical_attachments_pkey na tabela medical_attachments
CREATE UNIQUE INDEX medical_attachments_pkey ON public.medical_attachments USING btree (id);

-- Índice: idx_medical_records_patient_id na tabela medical_records
CREATE INDEX idx_medical_records_patient_id ON public.medical_records USING btree (patient_id);

-- Índice: medical_records_pkey na tabela medical_records
CREATE UNIQUE INDEX medical_records_pkey ON public.medical_records USING btree (id);

-- Índice: idx_nfse_org_data_emissao na tabela nfse
CREATE INDEX idx_nfse_org_data_emissao ON public.nfse USING btree (organization_id, data_emissao DESC, created_at DESC);

-- Índice: nfse_pkey na tabela nfse
CREATE UNIQUE INDEX nfse_pkey ON public.nfse USING btree (id);

-- Índice: nfse_config_pkey na tabela nfse_config
CREATE UNIQUE INDEX nfse_config_pkey ON public.nfse_config USING btree (organization_id);

-- Índice: idx_nfse_records_data_emissao na tabela nfse_records
CREATE INDEX idx_nfse_records_data_emissao ON public.nfse_records USING btree (data_emissao DESC);

-- Índice: idx_nfse_records_org na tabela nfse_records
CREATE INDEX idx_nfse_records_org ON public.nfse_records USING btree (organization_id);

-- Índice: idx_nfse_records_patient na tabela nfse_records
CREATE INDEX idx_nfse_records_patient ON public.nfse_records USING btree (patient_id);

-- Índice: idx_nfse_records_status na tabela nfse_records
CREATE INDEX idx_nfse_records_status ON public.nfse_records USING btree (status);

-- Índice: nfse_records_pkey na tabela nfse_records
CREATE UNIQUE INDEX nfse_records_pkey ON public.nfse_records USING btree (id);

-- Índice: idx_notifications_user_created_at na tabela notifications
CREATE INDEX idx_notifications_user_created_at ON public.notifications USING btree (user_id, created_at DESC);

-- Índice: idx_notifications_user_unread na tabela notifications
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);

-- Índice: notifications_pkey na tabela notifications
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

-- Índice: organizations_pkey na tabela organizations
CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

-- Índice: organizations_slug_unique na tabela organizations
CREATE UNIQUE INDEX organizations_slug_unique ON public.organizations USING btree (slug);

-- Índice: idx_package_usage_package_used_at na tabela package_usage
CREATE INDEX idx_package_usage_package_used_at ON public.package_usage USING btree (patient_package_id, used_at DESC);

-- Índice: package_usage_pkey na tabela package_usage
CREATE UNIQUE INDEX package_usage_pkey ON public.package_usage USING btree (id);

-- Índice: idx_pagamentos_org_pago_em na tabela pagamentos
CREATE INDEX idx_pagamentos_org_pago_em ON public.pagamentos USING btree (organization_id, pago_em DESC, created_at DESC);

-- Índice: idx_pagamentos_org_patient na tabela pagamentos
CREATE INDEX idx_pagamentos_org_patient ON public.pagamentos USING btree (organization_id, patient_id);

-- Índice: pagamentos_pkey na tabela pagamentos
CREATE UNIQUE INDEX pagamentos_pkey ON public.pagamentos USING btree (id);

-- Índice: idx_pathologies_medical_record_id na tabela pathologies
CREATE INDEX idx_pathologies_medical_record_id ON public.pathologies USING btree (medical_record_id);

-- Índice: idx_pathologies_status na tabela pathologies
CREATE INDEX idx_pathologies_status ON public.pathologies USING btree (status);

-- Índice: pathologies_pkey na tabela pathologies
CREATE UNIQUE INDEX pathologies_pkey ON public.pathologies USING btree (id);

-- Índice: idx_pathology_required_measurements na tabela pathology_required_measurements
CREATE INDEX idx_pathology_required_measurements ON public.pathology_required_measurements USING btree (organization_id, pathology_name, measurement_name);

-- Índice: pathology_required_measurements_pkey na tabela pathology_required_measurements
CREATE UNIQUE INDEX pathology_required_measurements_pkey ON public.pathology_required_measurements USING btree (id);

-- Índice: patient_gamification_patient_id_unique na tabela patient_gamification
CREATE UNIQUE INDEX patient_gamification_patient_id_unique ON public.patient_gamification USING btree (patient_id);

-- Índice: patient_gamification_pkey na tabela patient_gamification
CREATE UNIQUE INDEX patient_gamification_pkey ON public.patient_gamification USING btree (id);

-- Índice: patient_goals_pkey na tabela patient_goals
CREATE UNIQUE INDEX patient_goals_pkey ON public.patient_goals USING btree (id);

-- Índice: idx_patient_medical_returns_patient na tabela patient_medical_returns
CREATE INDEX idx_patient_medical_returns_patient ON public.patient_medical_returns USING btree (organization_id, patient_id, return_date DESC);

-- Índice: patient_medical_returns_pkey na tabela patient_medical_returns
CREATE UNIQUE INDEX patient_medical_returns_pkey ON public.patient_medical_returns USING btree (id);

-- Índice: idx_patient_packages_org_patient na tabela patient_packages
CREATE INDEX idx_patient_packages_org_patient ON public.patient_packages USING btree (organization_id, patient_id, created_at DESC);

-- Índice: idx_patient_packages_patient_id na tabela patient_packages
CREATE INDEX idx_patient_packages_patient_id ON public.patient_packages USING btree (patient_id);

-- Índice: idx_patient_packages_status na tabela patient_packages
CREATE INDEX idx_patient_packages_status ON public.patient_packages USING btree (status);

-- Índice: patient_packages_pkey na tabela patient_packages
CREATE UNIQUE INDEX patient_packages_pkey ON public.patient_packages USING btree (id);

-- Índice: idx_patient_pathologies_patient na tabela patient_pathologies
CREATE INDEX idx_patient_pathologies_patient ON public.patient_pathologies USING btree (organization_id, patient_id, created_at DESC);

-- Índice: patient_pathologies_pkey na tabela patient_pathologies
CREATE UNIQUE INDEX patient_pathologies_pkey ON public.patient_pathologies USING btree (id);

-- Índice: idx_patient_surgeries_patient na tabela patient_surgeries
CREATE INDEX idx_patient_surgeries_patient ON public.patient_surgeries USING btree (organization_id, patient_id, surgery_date DESC, created_at DESC);

-- Índice: patient_surgeries_pkey na tabela patient_surgeries
CREATE UNIQUE INDEX patient_surgeries_pkey ON public.patient_surgeries USING btree (id);

-- Índice: idx_patients_cpf na tabela patients
CREATE INDEX idx_patients_cpf ON public.patients USING btree (cpf);

-- Índice: idx_patients_email na tabela patients
CREATE INDEX idx_patients_email ON public.patients USING btree (email);

-- Índice: idx_patients_full_name na tabela patients
CREATE INDEX idx_patients_full_name ON public.patients USING btree (full_name);

-- Índice: idx_patients_name_org na tabela patients
CREATE INDEX idx_patients_name_org ON public.patients USING btree (organization_id, full_name);

-- Índice: idx_patients_org_incomplete na tabela patients
CREATE INDEX idx_patients_org_incomplete ON public.patients USING btree (organization_id, incomplete_registration, created_at DESC);

-- Índice: idx_patients_organization_id na tabela patients
CREATE INDEX idx_patients_organization_id ON public.patients USING btree (organization_id);

-- Índice: idx_patients_professional_id na tabela patients
CREATE INDEX idx_patients_professional_id ON public.patients USING btree (professional_id);

-- Índice: idx_patients_profile_id na tabela patients
CREATE INDEX idx_patients_profile_id ON public.patients USING btree (profile_id);

-- Índice: idx_patients_user_id na tabela patients
CREATE INDEX idx_patients_user_id ON public.patients USING btree (user_id);

-- Índice: patients_cpf_unique na tabela patients
CREATE UNIQUE INDEX patients_cpf_unique ON public.patients USING btree (cpf);

-- Índice: patients_pkey na tabela patients
CREATE UNIQUE INDEX patients_pkey ON public.patients USING btree (id);

-- Índice: unique_patient_email_org na tabela patients
CREATE UNIQUE INDEX unique_patient_email_org ON public.patients USING btree (organization_id, email);

-- Índice: idx_physical_examinations_patient_date na tabela physical_examinations
CREATE INDEX idx_physical_examinations_patient_date ON public.physical_examinations USING btree (patient_id, record_date DESC, created_at DESC);

-- Índice: physical_examinations_pkey na tabela physical_examinations
CREATE UNIQUE INDEX physical_examinations_pkey ON public.physical_examinations USING btree (id);

-- Índice: idx_profiles_user_id_unique na tabela profiles
CREATE UNIQUE INDEX idx_profiles_user_id_unique ON public.profiles USING btree (user_id);

-- Índice: profiles_pkey na tabela profiles
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

-- Índice: idx_projects_org_created na tabela projects
CREATE INDEX idx_projects_org_created ON public.projects USING btree (organization_id, created_at DESC);

-- Índice: idx_projects_org_status na tabela projects
CREATE INDEX idx_projects_org_status ON public.projects USING btree (organization_id, status);

-- Índice: projects_pkey na tabela projects
CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

-- Índice: idx_protocol_exercises_exercise_id na tabela protocol_exercises
CREATE INDEX idx_protocol_exercises_exercise_id ON public.protocol_exercises USING btree (exercise_id);

-- Índice: idx_protocol_exercises_protocol_id na tabela protocol_exercises
CREATE INDEX idx_protocol_exercises_protocol_id ON public.protocol_exercises USING btree (protocol_id);

-- Índice: protocol_exercises_pkey na tabela protocol_exercises
CREATE UNIQUE INDEX protocol_exercises_pkey ON public.protocol_exercises USING btree (id);

-- Índice: idx_push_tokens_active na tabela push_tokens
CREATE INDEX idx_push_tokens_active ON public.push_tokens USING btree (user_id, is_active);

-- Índice: idx_push_tokens_user na tabela push_tokens
CREATE INDEX idx_push_tokens_user ON public.push_tokens USING btree (user_id);

-- Índice: push_tokens_expo_push_token_key na tabela push_tokens
CREATE UNIQUE INDEX push_tokens_expo_push_token_key ON public.push_tokens USING btree (expo_push_token);

-- Índice: push_tokens_pkey na tabela push_tokens
CREATE UNIQUE INDEX push_tokens_pkey ON public.push_tokens USING btree (id);

-- Índice: idx_rooms_is_active na tabela rooms
CREATE INDEX idx_rooms_is_active ON public.rooms USING btree (is_active);

-- Índice: idx_rooms_organization_id na tabela rooms
CREATE INDEX idx_rooms_organization_id ON public.rooms USING btree (organization_id);

-- Índice: rooms_pkey na tabela rooms
CREATE UNIQUE INDEX rooms_pkey ON public.rooms USING btree (id);

-- Índice: idx_satisfaction_surveys_org na tabela satisfaction_surveys
CREATE INDEX idx_satisfaction_surveys_org ON public.satisfaction_surveys USING btree (organization_id, created_at DESC);

-- Índice: idx_satisfaction_surveys_patient na tabela satisfaction_surveys
CREATE INDEX idx_satisfaction_surveys_patient ON public.satisfaction_surveys USING btree (patient_id, created_at DESC);

-- Índice: satisfaction_surveys_pkey na tabela satisfaction_surveys
CREATE UNIQUE INDEX satisfaction_surveys_pkey ON public.satisfaction_surveys USING btree (id);

-- Índice: idx_schedule_capacity_org_day na tabela schedule_capacity
CREATE INDEX idx_schedule_capacity_org_day ON public.schedule_capacity USING btree (organization_id, day_of_week, start_time);

-- Índice: schedule_capacity_pkey na tabela schedule_capacity
CREATE UNIQUE INDEX schedule_capacity_pkey ON public.schedule_capacity USING btree (id);

-- Índice: idx_scheduling_notification_settings_org na tabela scheduling_notification_settings
CREATE INDEX idx_scheduling_notification_settings_org ON public.scheduling_notification_settings USING btree (organization_id);

-- Índice: scheduling_notification_settings_pkey na tabela scheduling_notification_settings
CREATE UNIQUE INDEX scheduling_notification_settings_pkey ON public.scheduling_notification_settings USING btree (id);

-- Índice: idx_session_attachments_patient_id na tabela session_attachments
CREATE INDEX idx_session_attachments_patient_id ON public.session_attachments USING btree (patient_id);

-- Índice: idx_session_attachments_session_id na tabela session_attachments
CREATE INDEX idx_session_attachments_session_id ON public.session_attachments USING btree (session_id);

-- Índice: session_attachments_pkey na tabela session_attachments
CREATE UNIQUE INDEX session_attachments_pkey ON public.session_attachments USING btree (id);

-- Índice: idx_session_package_templates_org na tabela session_package_templates
CREATE INDEX idx_session_package_templates_org ON public.session_package_templates USING btree (organization_id, sessions_count, created_at DESC);

-- Índice: session_package_templates_pkey na tabela session_package_templates
CREATE UNIQUE INDEX session_package_templates_pkey ON public.session_package_templates USING btree (id);

-- Índice: idx_session_templates_organization_id na tabela session_templates
CREATE INDEX idx_session_templates_organization_id ON public.session_templates USING btree (organization_id);

-- Índice: idx_session_templates_therapist_id na tabela session_templates
CREATE INDEX idx_session_templates_therapist_id ON public.session_templates USING btree (therapist_id);

-- Índice: session_templates_pkey na tabela session_templates
CREATE UNIQUE INDEX session_templates_pkey ON public.session_templates USING btree (id);

-- Índice: idx_sessions_appointment_id na tabela sessions
CREATE INDEX idx_sessions_appointment_id ON public.sessions USING btree (appointment_id);

-- Índice: idx_sessions_date na tabela sessions
CREATE INDEX idx_sessions_date ON public.sessions USING btree (date);

-- Índice: idx_sessions_organization_id na tabela sessions
CREATE INDEX idx_sessions_organization_id ON public.sessions USING btree (organization_id);

-- Índice: idx_sessions_patient_id na tabela sessions
CREATE INDEX idx_sessions_patient_id ON public.sessions USING btree (patient_id);

-- Índice: idx_sessions_therapist_id na tabela sessions
CREATE INDEX idx_sessions_therapist_id ON public.sessions USING btree (therapist_id);

-- Índice: sessions_pkey na tabela sessions
CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id);

-- Índice: idx_surgeries_medical_record_id na tabela surgeries
CREATE INDEX idx_surgeries_medical_record_id ON public.surgeries USING btree (medical_record_id);

-- Índice: surgeries_pkey na tabela surgeries
CREATE UNIQUE INDEX surgeries_pkey ON public.surgeries USING btree (id);

-- Índice: idx_tarefas_board_id na tabela tarefas
CREATE INDEX idx_tarefas_board_id ON public.tarefas USING btree (board_id);

-- Índice: idx_tarefas_column_id na tabela tarefas
CREATE INDEX idx_tarefas_column_id ON public.tarefas USING btree (column_id);

-- Índice: idx_tarefas_org_status na tabela tarefas
CREATE INDEX idx_tarefas_org_status ON public.tarefas USING btree (organization_id, status, order_index);

-- Índice: idx_tarefas_project na tabela tarefas
CREATE INDEX idx_tarefas_project ON public.tarefas USING btree (project_id, order_index);

-- Índice: tarefas_pkey na tabela tarefas
CREATE UNIQUE INDEX tarefas_pkey ON public.tarefas USING btree (id);

-- Índice: idx_telemedicine_rooms_org_created_at na tabela telemedicine_rooms
CREATE INDEX idx_telemedicine_rooms_org_created_at ON public.telemedicine_rooms USING btree (organization_id, created_at DESC);

-- Índice: idx_telemedicine_rooms_org_status na tabela telemedicine_rooms
CREATE INDEX idx_telemedicine_rooms_org_status ON public.telemedicine_rooms USING btree (organization_id, status);

-- Índice: telemedicine_rooms_pkey na tabela telemedicine_rooms
CREATE UNIQUE INDEX telemedicine_rooms_pkey ON public.telemedicine_rooms USING btree (id);

-- Índice: idx_therapist_commissions_org na tabela therapist_commissions
CREATE INDEX idx_therapist_commissions_org ON public.therapist_commissions USING btree (organization_id);

-- Índice: idx_therapist_commissions_therapist na tabela therapist_commissions
CREATE INDEX idx_therapist_commissions_therapist ON public.therapist_commissions USING btree (therapist_id);

-- Índice: therapist_commissions_pkey na tabela therapist_commissions
CREATE UNIQUE INDEX therapist_commissions_pkey ON public.therapist_commissions USING btree (id);

-- Índice: idx_transacoes_org_created_at na tabela transacoes
CREATE INDEX idx_transacoes_org_created_at ON public.transacoes USING btree (organization_id, created_at DESC);

-- Índice: idx_transacoes_org_tipo_status na tabela transacoes
CREATE INDEX idx_transacoes_org_tipo_status ON public.transacoes USING btree (organization_id, tipo, status);

-- Índice: transacoes_pkey na tabela transacoes
CREATE UNIQUE INDEX transacoes_pkey ON public.transacoes USING btree (id);

-- Índice: idx_treatment_plans_patient_date na tabela treatment_plans
CREATE INDEX idx_treatment_plans_patient_date ON public.treatment_plans USING btree (patient_id, record_date DESC, created_at DESC);

-- Índice: treatment_plans_pkey na tabela treatment_plans
CREATE UNIQUE INDEX treatment_plans_pkey ON public.treatment_plans USING btree (id);

-- Índice: idx_user_invitations_email na tabela user_invitations
CREATE INDEX idx_user_invitations_email ON public.user_invitations USING btree (email, used_at);

-- Índice: idx_user_invitations_org na tabela user_invitations
CREATE INDEX idx_user_invitations_org ON public.user_invitations USING btree (organization_id, created_at DESC);

-- Índice: user_invitations_pkey na tabela user_invitations
CREATE UNIQUE INDEX user_invitations_pkey ON public.user_invitations USING btree (id);

-- Índice: user_invitations_token_key na tabela user_invitations
CREATE UNIQUE INDEX user_invitations_token_key ON public.user_invitations USING btree (token);

-- Índice: idx_user_vouchers_user_org na tabela user_vouchers
CREATE INDEX idx_user_vouchers_user_org ON public.user_vouchers USING btree (user_id, organization_id, data_compra DESC);

-- Índice: user_vouchers_pkey na tabela user_vouchers
CREATE UNIQUE INDEX user_vouchers_pkey ON public.user_vouchers USING btree (id);

-- Índice: idx_voucher_checkout_sessions_user_org na tabela voucher_checkout_sessions
CREATE INDEX idx_voucher_checkout_sessions_user_org ON public.voucher_checkout_sessions USING btree (user_id, organization_id, created_at DESC);

-- Índice: voucher_checkout_sessions_pkey na tabela voucher_checkout_sessions
CREATE UNIQUE INDEX voucher_checkout_sessions_pkey ON public.voucher_checkout_sessions USING btree (id);

-- Índice: idx_vouchers_org_ativo_preco na tabela vouchers
CREATE INDEX idx_vouchers_org_ativo_preco ON public.vouchers USING btree (organization_id, ativo, preco);

-- Índice: vouchers_pkey na tabela vouchers
CREATE UNIQUE INDEX vouchers_pkey ON public.vouchers USING btree (id);

-- Índice: idx_waitlist_org_status na tabela waitlist
CREATE INDEX idx_waitlist_org_status ON public.waitlist USING btree (organization_id, status, created_at);

-- Índice: waitlist_pkey na tabela waitlist
CREATE UNIQUE INDEX waitlist_pkey ON public.waitlist USING btree (id);

-- Índice: idx_whatsapp_messages_message_id na tabela whatsapp_messages
CREATE INDEX idx_whatsapp_messages_message_id ON public.whatsapp_messages USING btree (message_id);

-- Índice: idx_whatsapp_messages_org na tabela whatsapp_messages
CREATE INDEX idx_whatsapp_messages_org ON public.whatsapp_messages USING btree (organization_id);

-- Índice: idx_whatsapp_messages_patient na tabela whatsapp_messages
CREATE INDEX idx_whatsapp_messages_patient ON public.whatsapp_messages USING btree (patient_id);

-- Índice: whatsapp_messages_pkey na tabela whatsapp_messages
CREATE UNIQUE INDEX whatsapp_messages_pkey ON public.whatsapp_messages USING btree (id);

-- Índice: wiki_page_versions_pkey na tabela wiki_page_versions
CREATE UNIQUE INDEX wiki_page_versions_pkey ON public.wiki_page_versions USING btree (id);

-- Índice: wiki_pages_pkey na tabela wiki_pages
CREATE UNIQUE INDEX wiki_pages_pkey ON public.wiki_pages USING btree (id);

-- Índice: wiki_pages_slug_unique na tabela wiki_pages
CREATE UNIQUE INDEX wiki_pages_slug_unique ON public.wiki_pages USING btree (slug);

-- Índice: xp_transactions_pkey na tabela xp_transactions
CREATE UNIQUE INDEX xp_transactions_pkey ON public.xp_transactions USING btree (id);


-- ========================================
-- FOREIGN KEYS
-- ========================================

-- FK: achievements_log -> achievements
ALTER TABLE achievements_log ADD CONSTRAINT fk_achievements_log_achievements FOREIGN KEY (achievement_id) REFERENCES achievements(id);

-- FK: achievements_log -> patients
ALTER TABLE achievements_log ADD CONSTRAINT fk_achievements_log_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: appointments -> patients
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: board_columns -> boards
ALTER TABLE board_columns ADD CONSTRAINT fk_board_columns_boards FOREIGN KEY (board_id) REFERENCES boards(id);

-- FK: centros_custo -> organizations
ALTER TABLE centros_custo ADD CONSTRAINT fk_centros_custo_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: contas_financeiras -> appointments
ALTER TABLE contas_financeiras ADD CONSTRAINT fk_contas_financeiras_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- FK: contas_financeiras -> organizations
ALTER TABLE contas_financeiras ADD CONSTRAINT fk_contas_financeiras_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: contas_financeiras -> patients
ALTER TABLE contas_financeiras ADD CONSTRAINT fk_contas_financeiras_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: convenios -> organizations
ALTER TABLE convenios ADD CONSTRAINT fk_convenios_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: crm_campanha_envios -> crm_campanhas
ALTER TABLE crm_campanha_envios ADD CONSTRAINT fk_crm_campanha_envios_crm_campanhas FOREIGN KEY (campanha_id) REFERENCES crm_campanhas(id);

-- FK: daily_quests -> patients
ALTER TABLE daily_quests ADD CONSTRAINT fk_daily_quests_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: doctors -> organizations
ALTER TABLE doctors ADD CONSTRAINT fk_doctors_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: doctors -> profiles
ALTER TABLE doctors ADD CONSTRAINT fk_doctors_profiles FOREIGN KEY (created_by) REFERENCES profiles(user_id);

-- FK: empresas_parceiras -> organizations
ALTER TABLE empresas_parceiras ADD CONSTRAINT fk_empresas_parceiras_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: evolution_measurements -> organizations
ALTER TABLE evolution_measurements ADD CONSTRAINT fk_evolution_measurements_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: evolution_measurements -> patients
ALTER TABLE evolution_measurements ADD CONSTRAINT fk_evolution_measurements_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: evolution_measurements -> profiles
ALTER TABLE evolution_measurements ADD CONSTRAINT fk_evolution_measurements_profiles FOREIGN KEY (created_by) REFERENCES profiles(user_id);

-- FK: exercise_favorites -> exercises
ALTER TABLE exercise_favorites ADD CONSTRAINT fk_exercise_favorites_exercises FOREIGN KEY (exercise_id) REFERENCES exercises(id);

-- FK: exercise_plan_items -> exercise_plans
ALTER TABLE exercise_plan_items ADD CONSTRAINT fk_exercise_plan_items_exercise_plans FOREIGN KEY (plan_id) REFERENCES exercise_plans(id);

-- FK: exercise_plan_items -> exercises
ALTER TABLE exercise_plan_items ADD CONSTRAINT fk_exercise_plan_items_exercises FOREIGN KEY (exercise_id) REFERENCES exercises(id);

-- FK: exercise_template_items -> exercise_templates
ALTER TABLE exercise_template_items ADD CONSTRAINT fk_exercise_template_items_exercise_templates FOREIGN KEY (template_id) REFERENCES exercise_templates(id);

-- FK: exercises -> exercise_categories
ALTER TABLE exercises ADD CONSTRAINT fk_exercises_exercise_categories FOREIGN KEY (category_id) REFERENCES exercise_categories(id);

-- FK: formas_pagamento -> organizations
ALTER TABLE formas_pagamento ADD CONSTRAINT fk_formas_pagamento_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: fornecedores -> organizations
ALTER TABLE fornecedores ADD CONSTRAINT fk_fornecedores_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: goals -> medical_records
ALTER TABLE goals ADD CONSTRAINT fk_goals_medical_records FOREIGN KEY (medical_record_id) REFERENCES medical_records(id);

-- FK: medical_attachments -> patients
ALTER TABLE medical_attachments ADD CONSTRAINT fk_medical_attachments_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: medical_records -> patients
ALTER TABLE medical_records ADD CONSTRAINT fk_medical_records_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: nfse -> organizations
ALTER TABLE nfse ADD CONSTRAINT fk_nfse_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: nfse_config -> organizations
ALTER TABLE nfse_config ADD CONSTRAINT fk_nfse_config_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: nfse_records -> appointments
ALTER TABLE nfse_records ADD CONSTRAINT fk_nfse_records_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- FK: nfse_records -> patients
ALTER TABLE nfse_records ADD CONSTRAINT fk_nfse_records_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: package_usage -> appointments
ALTER TABLE package_usage ADD CONSTRAINT fk_package_usage_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- FK: package_usage -> organizations
ALTER TABLE package_usage ADD CONSTRAINT fk_package_usage_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: package_usage -> patient_packages
ALTER TABLE package_usage ADD CONSTRAINT fk_package_usage_patient_packages FOREIGN KEY (patient_package_id) REFERENCES patient_packages(id);

-- FK: package_usage -> patients
ALTER TABLE package_usage ADD CONSTRAINT fk_package_usage_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: pagamentos -> appointments
ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- FK: pagamentos -> organizations
ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: pagamentos -> patients
ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: pathologies -> medical_records
ALTER TABLE pathologies ADD CONSTRAINT fk_pathologies_medical_records FOREIGN KEY (medical_record_id) REFERENCES medical_records(id);

-- FK: pathology_required_measurements -> organizations
ALTER TABLE pathology_required_measurements ADD CONSTRAINT fk_pathology_required_measurements_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: patient_gamification -> patients
ALTER TABLE patient_gamification ADD CONSTRAINT fk_patient_gamification_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: patient_goals -> patients
ALTER TABLE patient_goals ADD CONSTRAINT fk_patient_goals_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: patient_medical_returns -> organizations
ALTER TABLE patient_medical_returns ADD CONSTRAINT fk_patient_medical_returns_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: patient_medical_returns -> patients
ALTER TABLE patient_medical_returns ADD CONSTRAINT fk_patient_medical_returns_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: patient_medical_returns -> profiles
ALTER TABLE patient_medical_returns ADD CONSTRAINT fk_patient_medical_returns_profiles FOREIGN KEY (created_by) REFERENCES profiles(user_id);

-- FK: patient_packages -> patients
ALTER TABLE patient_packages ADD CONSTRAINT fk_patient_packages_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: patient_pathologies -> patients
ALTER TABLE patient_pathologies ADD CONSTRAINT fk_patient_pathologies_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: patient_surgeries -> patients
ALTER TABLE patient_surgeries ADD CONSTRAINT fk_patient_surgeries_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: physical_examinations -> patients
ALTER TABLE physical_examinations ADD CONSTRAINT fk_physical_examinations_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: protocol_exercises -> exercise_protocols
ALTER TABLE protocol_exercises ADD CONSTRAINT fk_protocol_exercises_exercise_protocols FOREIGN KEY (protocol_id) REFERENCES exercise_protocols(id);

-- FK: session_attachments -> patients
ALTER TABLE session_attachments ADD CONSTRAINT fk_session_attachments_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: session_attachments -> sessions
ALTER TABLE session_attachments ADD CONSTRAINT fk_session_attachments_sessions FOREIGN KEY (session_id) REFERENCES sessions(id);

-- FK: session_package_templates -> organizations
ALTER TABLE session_package_templates ADD CONSTRAINT fk_session_package_templates_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: sessions -> appointments
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- FK: sessions -> patients
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: surgeries -> medical_records
ALTER TABLE surgeries ADD CONSTRAINT fk_surgeries_medical_records FOREIGN KEY (medical_record_id) REFERENCES medical_records(id);

-- FK: tarefas -> board_columns
ALTER TABLE tarefas ADD CONSTRAINT fk_tarefas_board_columns FOREIGN KEY (column_id) REFERENCES board_columns(id);

-- FK: tarefas -> boards
ALTER TABLE tarefas ADD CONSTRAINT fk_tarefas_boards FOREIGN KEY (board_id) REFERENCES boards(id);

-- FK: transacoes -> organizations
ALTER TABLE transacoes ADD CONSTRAINT fk_transacoes_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: treatment_plans -> patients
ALTER TABLE treatment_plans ADD CONSTRAINT fk_treatment_plans_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: user_vouchers -> organizations
ALTER TABLE user_vouchers ADD CONSTRAINT fk_user_vouchers_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: user_vouchers -> vouchers
ALTER TABLE user_vouchers ADD CONSTRAINT fk_user_vouchers_vouchers FOREIGN KEY (voucher_id) REFERENCES vouchers(id);

-- FK: voucher_checkout_sessions -> organizations
ALTER TABLE voucher_checkout_sessions ADD CONSTRAINT fk_voucher_checkout_sessions_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: voucher_checkout_sessions -> user_vouchers
ALTER TABLE voucher_checkout_sessions ADD CONSTRAINT fk_voucher_checkout_sessions_user_vouchers FOREIGN KEY (user_voucher_id) REFERENCES user_vouchers(id);

-- FK: voucher_checkout_sessions -> vouchers
ALTER TABLE voucher_checkout_sessions ADD CONSTRAINT fk_voucher_checkout_sessions_vouchers FOREIGN KEY (voucher_id) REFERENCES vouchers(id);

-- FK: vouchers -> organizations
ALTER TABLE vouchers ADD CONSTRAINT fk_vouchers_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- FK: whatsapp_messages -> patients
ALTER TABLE whatsapp_messages ADD CONSTRAINT fk_whatsapp_messages_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

-- FK: wiki_page_versions -> wiki_pages
ALTER TABLE wiki_page_versions ADD CONSTRAINT fk_wiki_page_versions_wiki_pages FOREIGN KEY (page_id) REFERENCES wiki_pages(id);

-- FK: xp_transactions -> patients
ALTER TABLE xp_transactions ADD CONSTRAINT fk_xp_transactions_patients FOREIGN KEY (patient_id) REFERENCES patients(id);

