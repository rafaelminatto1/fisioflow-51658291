-- Inicialização do Banco de Dados Cloud SQL (PostgreSQL)
-- Projeto: FisioFlow

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Para embeddings de IA

-- 2. Tabela: Organizations (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: Profiles (Usuários)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Link com Firebase Auth UID
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'therapist', 'patient', 'intern')),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    gender TEXT,
    address JSONB,
    emergency_contact JSONB,
    medical_history TEXT,
    main_condition TEXT,
    status TEXT DEFAULT 'Inicial',
    progress INTEGER DEFAULT 0,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: Exercises
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    category TEXT,
    description TEXT,
    instructions JSONB, -- Array de passos
    muscles JSONB, -- Array de músculos
    equipment TEXT DEFAULT 'nenhum',
    difficulty TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    embedding vector(1536), -- Para busca semântica
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: Exercise Plans
CREATE TABLE IF NOT EXISTS exercise_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'ativo',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: Exercise Plan Items
CREATE TABLE IF NOT EXISTS exercise_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES exercise_plans(id),
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    "order" INTEGER DEFAULT 0,
    sets INTEGER,
    reps TEXT,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela: Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    therapist_id UUID REFERENCES profiles(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'agendado',
    session_type TEXT DEFAULT 'individual',
    notes TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
