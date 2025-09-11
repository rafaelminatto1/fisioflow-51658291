# FisioFlow AI Studio - Arquitetura Técnica Detalhada

## 1. Arquitetura do Sistema

```mermaid
graph TD
    A[User Browser] --> B[Next.js 14 Frontend]
    B --> C[tRPC API Layer]
    C --> D[Business Logic Layer]
    D --> E[Prisma ORM]
    E --> F[PostgreSQL Database]
    
    B --> G[NextAuth.js v5]
    G --> H[JWT Tokens]
    
    D --> I[External Services]
    I --> J[OpenAI GPT-4]
    I --> K[WhatsApp Business API]
    I --> L[Twilio SMS]
    I --> M[SendGrid Email]
    I --> N[Stripe Payments]
    I --> O[AWS S3 Storage]
    
    D --> P[Redis Cache]
    D --> Q[Bull Queue]
    
    subgraph "Frontend Layer"
        B
    end
    
    subgraph "API Layer"
        C
        G
    end
    
    subgraph "Business Layer"
        D
        P
        Q
    end
    
    subgraph "Data Layer"
        E
        F
    end
    
    subgraph "External Services"
        I
        J
        K
        L
        M
        N
        O
    end
```

## 2. Descrição Tecnológica

### Frontend
- **Next.js 14** com App Router e Server Components
- **TypeScript 5+** para type safety
- **Tailwind CSS** + **Shadcn UI** para styling
- **Framer Motion** para animações
- **React Hook Form** + **Zod** para formulários
- **Zustand** + **React Query** para estado
- **Recharts** + **D3.js** para gráficos

### Backend
- **Next.js API Routes** com **tRPC** para type-safe APIs
- **Prisma ORM** para database access
- **NextAuth.js v5** para autenticação
- **Redis** para cache e sessões
- **Bull Queue** para processamento assíncrono

### Database
- **PostgreSQL** como banco principal
- **Redis** para cache e filas
- **AWS S3** para armazenamento de arquivos

### Infraestrutura
- **Vercel** para deploy do frontend
- **Railway** para serviços backend
- **Neon** para PostgreSQL gerenciado
- **Upstash** para Redis gerenciado

## 3. Definições de Rotas

| Rota | Propósito |
|------|----------|
| `/` | Landing page pública |
| `/login` | Página de autenticação |
| `/register` | Cadastro de novas clínicas |
| `/dashboard` | Dashboard principal com KPIs |
| `/patients` | Gestão de pacientes |
| `/patients/[id]` | Detalhes do paciente |
| `/appointments` | Calendário de agendamentos |
| `/exercises` | Biblioteca de exercícios |
| `/exercises/[id]` | Detalhes do exercício |
| `/prescriptions` | Prescrições de exercícios |
| `/finance` | Módulo financeiro |
| `/communication` | Central de comunicação |
| `/telemedicine` | Teleconsultas |
| `/reports` | Relatórios e analytics |
| `/settings` | Configurações da clínica |
| `/profile` | Perfil do usuário |
| `/help` | Central de ajuda |

## 4. Definições de API

### 4.1 Autenticação

#### Login
```typescript
POST /api/auth/signin
```

**Request:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|----------|
| email | string | true | Email do usuário |
| password | string | true | Senha do usuário |

**Response:**
| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| user | User | Dados do usuário |
| token | string | JWT token |
| expires | Date | Data de expiração |

#### Registro
```typescript
POST /api/auth/register
```

**Request:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|----------|
| name | string | true | Nome completo |
| email | string | true | Email único |
| password | string | true | Senha (min 8 chars) |
| clinicName | string | true | Nome da clínica |
| phone | string | true | Telefone de contato |

### 4.2 Gestão de Pacientes

#### Listar Pacientes
```typescript
GET /api/patients
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| page | number | Página (default: 1) |
| limit | number | Itens por página (default: 20) |
| search | string | Busca por nome/CPF |
| status | string | Filtro por status |

#### Criar Paciente
```typescript
POST /api/patients
```

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "cpf": "12345678901",
  "birthDate": "1990-01-01",
  "gender": "MALE",
  "address": {
    "street": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "medicalHistory": {
    "conditions": ["Lombalgia"],
    "medications": ["Ibuprofeno"],
    "allergies": []
  }
}
```

### 4.3 Agendamentos

#### Listar Agendamentos
```typescript
GET /api/appointments
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| date | string | Data específica (YYYY-MM-DD) |
| startDate | string | Data inicial do período |
| endDate | string | Data final do período |
| patientId | string | Filtro por paciente |
| status | string | Filtro por status |

#### Criar Agendamento
```typescript
POST /api/appointments
```

**Request:**
```json
{
  "patientId": "uuid",
  "date": "2024-01-15",
  "time": "14:30",
  "duration": 60,
  "type": "CONSULTATION",
  "notes": "Primeira consulta",
  "reminderEnabled": true
}
```

### 4.4 Exercícios

#### Buscar Exercícios
```typescript
GET /api/exercises
```

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| search | string | Busca por nome/descrição |
| category | string | Categoria do exercício |
| bodyPart | string | Parte do corpo |
| difficulty | string | Nível de dificuldade |
| equipment | string | Equipamento necessário |
| page | number | Página |
| limit | number | Itens por página |

#### Prescrever Exercício
```typescript
POST /api/prescriptions
```

**Request:**
```json
{
  "patientId": "uuid",
  "exercises": [
    {
      "exerciseId": "uuid",
      "sets": 3,
      "reps": 15,
      "duration": 30,
      "notes": "Aumentar carga gradualmente"
    }
  ],
  "startDate": "2024-01-15",
  "endDate": "2024-02-15",
  "frequency": "DAILY"
}
```

### 4.5 Comunicação

#### Enviar Mensagem WhatsApp
```typescript
POST /api/communication/whatsapp
```

**Request:**
```json
{
  "patientId": "uuid",
  "message": "Lembrete: Você tem consulta amanhã às 14h",
  "templateId": "appointment_reminder",
  "variables": {
    "date": "15/01/2024",
    "time": "14:00"
  }
}
```

#### Enviar SMS
```typescript
POST /api/communication/sms
```

**Request:**
```json
{
  "phone": "+5511999999999",
  "message": "Sua consulta foi confirmada para amanhã às 14h"
}
```

### 4.6 IA e Analytics

#### Previsão de No-Show
```typescript
POST /api/ai/predict-noshow
```

**Request:**
```json
{
  "appointmentId": "uuid",
  "patientHistory": {
    "totalAppointments": 10,
    "noShows": 2,
    "lastAppointment": "2024-01-01",
    "avgResponseTime": 120
  },
  "appointmentData": {
    "dayOfWeek": "MONDAY",
    "timeOfDay": "MORNING",
    "weatherForecast": "RAINY"
  }
}
```

**Response:**
```json
{
  "probability": 0.15,
  "risk": "LOW",
  "factors": [
    "Histórico positivo de comparecimento",
    "Horário preferencial do paciente"
  ],
  "recommendations": [
    "Enviar lembrete 24h antes",
    "Confirmar por WhatsApp"
  ]
}
```

## 5. Arquitetura do Servidor

```mermaid
graph TD
    A[Client Request] --> B[Next.js Middleware]
    B --> C[Authentication Layer]
    C --> D[tRPC Router]
    D --> E[Controller Layer]
    E --> F[Service Layer]
    F --> G[Repository Layer]
    G --> H[Prisma Client]
    H --> I[(PostgreSQL)]
    
    F --> J[External Services]
    J --> K[AI Services]
    J --> L[Communication APIs]
    J --> M[Payment Gateways]
    
    F --> N[Cache Layer]
    N --> O[(Redis)]
    
    F --> P[Queue System]
    P --> Q[Background Jobs]
    
    subgraph "Presentation Layer"
        B
        C
        D
    end
    
    subgraph "Business Layer"
        E
        F
    end
    
    subgraph "Data Layer"
        G
        H
        I
    end
    
    subgraph "Infrastructure"
        J
        N
        O
        P
        Q
    end
```

## 6. Modelo de Dados

### 6.1 Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    CLINIC ||--o{ USER : has
    CLINIC ||--o{ PATIENT : treats
    USER ||--o{ APPOINTMENT : creates
    PATIENT ||--o{ APPOINTMENT : schedules
    PATIENT ||--o{ PRESCRIPTION : receives
    PRESCRIPTION ||--o{ PRESCRIPTION_EXERCISE : contains
    EXERCISE ||--o{ PRESCRIPTION_EXERCISE : prescribed_in
    PATIENT ||--o{ PAYMENT : makes
    PATIENT ||--o{ COMMUNICATION : receives
    APPOINTMENT ||--o{ SESSION : generates
    SESSION ||--o{ ASSESSMENT : includes
    
    CLINIC {
        uuid id PK
        string name
        string email
        string phone
        json address
        string cnpj
        enum plan
        boolean active
        datetime created_at
        datetime updated_at
    }
    
    USER {
        uuid id PK
        uuid clinic_id FK
        string name
        string email
        string password_hash
        enum role
        string phone
        string avatar_url
        boolean active
        datetime last_login
        datetime created_at
        datetime updated_at
    }
    
    PATIENT {
        uuid id PK
        uuid clinic_id FK
        string name
        string email
        string phone
        string cpf
        date birth_date
        enum gender
        json address
        json medical_history
        string emergency_contact
        boolean active
        datetime created_at
        datetime updated_at
    }
    
    APPOINTMENT {
        uuid id PK
        uuid patient_id FK
        uuid user_id FK
        datetime date_time
        integer duration
        enum type
        enum status
        text notes
        boolean reminder_sent
        float no_show_probability
        datetime created_at
        datetime updated_at
    }
    
    EXERCISE {
        uuid id PK
        string name
        text description
        string category
        json body_parts
        enum difficulty
        json equipment
        string video_url
        string thumbnail_url
        json instructions
        json contraindications
        boolean active
        datetime created_at
        datetime updated_at
    }
    
    PRESCRIPTION {
        uuid id PK
        uuid patient_id FK
        uuid user_id FK
        date start_date
        date end_date
        enum frequency
        text notes
        enum status
        datetime created_at
        datetime updated_at
    }
    
    PRESCRIPTION_EXERCISE {
        uuid id PK
        uuid prescription_id FK
        uuid exercise_id FK
        integer sets
        integer reps
        integer duration
        text notes
        integer order
    }
    
    PAYMENT {
        uuid id PK
        uuid patient_id FK
        decimal amount
        enum method
        enum status
        date due_date
        date paid_date
        string transaction_id
        text description
        datetime created_at
        datetime updated_at
    }
    
    COMMUNICATION {
        uuid id PK
        uuid patient_id FK
        uuid user_id FK
        enum type
        enum channel
        text message
        json metadata
        boolean read
        datetime sent_at
        datetime read_at
    }
    
    SESSION {
        uuid id PK
        uuid appointment_id FK
        datetime start_time
        datetime end_time
        text notes
        json vital_signs
        enum status
        datetime created_at
        datetime updated_at
    }
    
    ASSESSMENT {
        uuid id PK
        uuid session_id FK
        enum type
        json data
        integer pain_level
        text observations
        datetime created_at
    }
```

### 6.2 Definições DDL

#### Tabela de Clínicas
```sql
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address JSONB NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clinics_email ON clinics(email);
CREATE INDEX idx_clinics_cnpj ON clinics(cnpj);
CREATE INDEX idx_clinics_active ON clinics(active);
```

#### Tabela de Usuários
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'therapist' CHECK (role IN ('admin', 'therapist', 'receptionist')),
    phone VARCHAR(20),
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
```

#### Tabela de Pacientes
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    address JSONB NOT NULL,
    medical_history JSONB DEFAULT '{}',
    emergency_contact JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_cpf ON patients(cpf);
CREATE INDEX idx_patients_name ON patients USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_active ON patients(active);
```

#### Tabela de Agendamentos
```sql
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    type VARCHAR(20) DEFAULT 'consultation' CHECK (type IN ('consultation', 'followup', 'evaluation', 'telemedicine')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    no_show_probability DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date_time ON appointments(date_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_no_show_prob ON appointments(no_show_probability DESC);
```

#### Tabela de Exercícios
```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    body_parts JSONB NOT NULL DEFAULT '[]',
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    equipment JSONB DEFAULT '[]',
    video_url TEXT,
    thumbnail_url TEXT,
    instructions JSONB DEFAULT '[]',
    contraindications JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_body_parts ON exercises USING gin(body_parts);
CREATE INDEX idx_exercises_name ON exercises USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_exercises_active ON exercises(active);
```

#### Tabela de Prescrições
```sql
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'custom')),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_user_id ON prescriptions(user_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_dates ON prescriptions(start_date, end_date);
```

#### Tabela de Exercícios da Prescrição
```sql
CREATE TABLE prescription_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    sets INTEGER DEFAULT 1,
    reps INTEGER DEFAULT 1,
    duration INTEGER DEFAULT 0,
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

-- Índices
CREATE INDEX idx_prescription_exercises_prescription_id ON prescription_exercises(prescription_id);
CREATE INDEX idx_prescription_exercises_exercise_id ON prescription_exercises(exercise_id);
CREATE INDEX idx_prescription_exercises_order ON prescription_exercises(prescription_id, order_index);
```

#### Tabela de Pagamentos
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(20) CHECK (method IN ('cash', 'card', 'pix', 'transfer', 'insurance')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_date DATE,
    transaction_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_patient_id ON payments(patient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_method ON payments(method);
```

#### Tabela de Comunicações
```sql
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('reminder', 'confirmation', 'marketing', 'support', 'emergency')),
    channel VARCHAR(20) CHECK (channel IN ('whatsapp', 'sms', 'email', 'push', 'call')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_communications_patient_id ON communications(patient_id);
CREATE INDEX idx_communications_user_id ON communications(user_id);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_channel ON communications(channel);
CREATE INDEX idx_communications_sent_at ON communications(sent_at DESC);
```

#### Dados Iniciais
```sql
-- Inserir exercícios básicos
INSERT INTO exercises (name, description, category, body_parts, difficulty, equipment, instructions) VALUES
('Alongamento Cervical', 'Exercício para alívio de tensão no pescoço', 'Alongamento', '["neck"]', 'beginner', '[]', '["Incline a cabeça para o lado direito", "Mantenha por 30 segundos", "Repita para o lado esquerdo"]'),
('Fortalecimento Lombar', 'Exercício para fortalecimento da região lombar', 'Fortalecimento', '["lower_back"]', 'intermediate', '["mat"]', '["Deite-se de barriga para baixo", "Levante o tronco lentamente", "Mantenha por 10 segundos"]'),
('Mobilização de Ombro', 'Exercício para mobilidade do ombro', 'Mobilização', '["shoulder"]', 'beginner', '[]', '["Faça movimentos circulares com o braço", "10 repetições para cada direção", "Mantenha o movimento controlado"]');

-- Inserir planos de clínica
INSERT INTO clinics (name, email, phone, address, cnpj, plan) VALUES
('Clínica Demo', 'demo@fisioflow.com', '11999999999', '{"street": "Rua Demo, 123", "city": "São Paulo", "state": "SP", "zipCode": "01234-567"}', '12.345.678/0001-90', 'pro');

-- Inserir usuário admin demo
INSERT INTO users (clinic_id, name, email, password_hash, role) VALUES
((SELECT id FROM clinics WHERE email = 'demo@fisioflow.com'), 'Admin Demo', 'admin@fisioflow.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGtrOrBiW', 'admin');
```

## 7. Configuração de Segurança

### 7.1 Autenticação e Autorização

#### NextAuth.js Configuration
```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { clinic: true }
        })

        if (!user || !user.active) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId,
          clinic: user.clinic
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.clinicId = user.clinicId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.clinicId = token.clinicId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  }
}
```

### 7.2 Middleware de Segurança

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Rotas públicas
    const publicRoutes = ['/', '/login', '/register', '/about']
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next()
    }

    // Verificar se usuário está autenticado
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Verificar permissões por role
    const adminOnlyRoutes = ['/settings', '/users']
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
```

### 7.3 Validação de Dados

```typescript
// lib/validations.ts
import { z } from 'zod'

export const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  birthDate: z.date().max(new Date(), 'Data de nascimento inválida'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.object({
    street: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
    city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
    state: z.string().length(2, 'Estado deve ter 2 caracteres'),
    zipCode: z.string().length(9, 'CEP deve ter 9 caracteres')
  }),
  medicalHistory: z.object({
    conditions: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([])
  }).optional()
})

export const appointmentSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido'),
  dateTime: z.date().min(new Date(), 'Data deve ser futura'),
  duration: z.number().min(15).max(240, 'Duração deve ser entre 15 e 240 minutos'),
  type: z.enum(['consultation', 'followup', 'evaluation', 'telemedicine']),
  notes: z.string().optional()
})

export const exerciseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  category: z.string().min(2, 'Categoria é obrigatória'),
  bodyParts: z.array(z.string()).min(1, 'Pelo menos uma parte do corpo'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.array(z.string()).default([]),
  instructions: z.array(z.string()).min(1, 'Pelo menos uma instrução')
})
```

## 8. Performance e Otimização

### 8.1 Estratégias de Cache

```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  static async set(key: string, value: any, ttl = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidate error:', error)
    }
  }
}

// Uso em APIs
export async function getCachedPatients(clinicId: string) {
  const cacheKey = `patients:${clinicId}`
  
  let patients = await CacheService.get(cacheKey)
  
  if (!patients) {
    patients = await prisma.patient.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' }
    })
    
    await CacheService.set(cacheKey, patients, 1800) // 30 min
  }
  
  return patients
}
```

### 8.2 Otimização de Queries

```typescript
// lib/queries.ts
import { prisma } from './prisma'

// Query otimizada para dashboard
export async function getDashboardData(clinicId: string) {
  const [
    totalPatients,
    todayAppointments,
    monthlyRevenue,
    pendingPayments
  ] = await Promise.all([
    prisma.patient.count({
      where: { clinicId, active: true }
    }),
    prisma.appointment.findMany({
      where: {
        user: { clinicId },
        dateTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        patient: { select: { name: true, phone: true } }
      },
      orderBy: { dateTime: 'asc' }
    }),
    prisma.payment.aggregate({
      where: {
        patient: { clinicId },
        paidDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        },
        status: 'paid'
      },
      _sum: { amount: true }
    }),
    prisma.payment.count({
      where: {
        patient: { clinicId },
        status: 'pending',
        dueDate: { lt: new Date() }
      }
    })
  ])

  return {
    totalPatients,
    todayAppointments,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
    pendingPayments
  }
}

// Query com paginação otimizada
export async function getPaginatedPatients({
  clinicId,
  page = 1,
  limit = 20,
  search = '',
  status = 'all'
}) {
  const skip = (page - 1) * limit
  
  const where = {
    clinicId,
    ...(status !== 'all' && { active: status === 'active' }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { phone: { contains: search } }
      ]
    })
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true
          }
        }
      }
    }),
    prisma.patient.count({ where })
  ])

  return {
    patients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}
```

## 9. Monitoramento e Observabilidade

### 9.1 Configuração do Sentry

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma })
  ],
  beforeSend(event) {
    // Filtrar dados sensíveis
    if (event.request?.data) {
      delete event.request.data.password
      delete event.request.data.cpf
    }
    return event
  }
})

// Wrapper para capturar erros
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }
}
```

### 9.2 Métricas Customizadas

```typescript
// lib/metrics.ts
import { prisma } from './prisma'

export class MetricsService {
  static async trackUserAction({
    userId,
    action,
    resource,
    metadata = {}
  }: {
    userId: string
    action: string
    resource: string
    metadata?: Record<string, any>
  }) {
    // Log para analytics
    console.log('User Action:', {
      userId,
      action,
      resource,
      metadata,
      timestamp: new Date().toISOString()
    })

    // Enviar para PostHog ou similar
    if (process.env.POSTHOG_API_KEY) {
      // Implementar envio para PostHog
    }
  }

  static async getSystemHealth() {
    try {
      const [dbHealth, cacheHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkCacheHealth()
      ])

      return {
        status: 'healthy',
        database: dbHealth,
        cache: cacheHealth,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  private static async checkDatabaseHealth() {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime: duration
    }
  }

  private static async checkCacheHealth() {
    const start = Date.now()
    await redis.ping()
    const duration = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime: duration
    }
  }
}
```

## 10. Deploy e CI/CD

### 10.1 Configuração Vercel

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url",
    "REDIS_URL": "@redis-url",
    "OPENAI_API_KEY": "@openai-api-key",
    "WHATSAPP_TOKEN": "@whatsapp-token",
    "STRIPE_SECRET_KEY": "@stripe-secret",
    "AWS_ACCESS_KEY_ID": "@aws-access-key",
    "AWS_SECRET_ACCESS_KEY": "@aws-secret-key",
    "SENTRY_DSN": "@sentry-dsn"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 10.2 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: fisioflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fisioflow_test
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fisioflow_test
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fisioflow_test
      
      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fisioflow_test
          NEXTAUTH_SECRET: test-secret
          NEXTAUTH_URL: http://localhost:3000
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

**Documento criado em**: Janeiro 2024  
**Versão**: 1.0  
**Status**: Aprovado para implementação ✅