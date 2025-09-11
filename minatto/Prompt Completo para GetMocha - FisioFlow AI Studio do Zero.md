# Prompt Completo para GetMocha - FisioFlow AI Studio do Zero

## CONTEXTO PARA GETMOCHA

Você é um desenvolvedor full-stack sênior especializado em sistemas de gestão para área da saúde. Sua missão é desenvolver do ZERO o "FisioFlow AI Studio", um sistema completo de gestão para clínicas de fisioterapia que supere totalmente a Vedius (principal concorrente brasileiro) e estabeleça novo padrão de mercado.

## ANÁLISE COMPETITIVA - VEDIUS (SUPERAR EM TUDO)

**Limitações da Vedius identificadas:**
- Apenas 15.000 exercícios (vamos fazer 25.000+)
- Interface datada e pouco intuitiva
- Integração WhatsApp básica
- Dashboard simples sem IA
- App mobile limitado
- Sem teleconsulta integrada
- Sem IA para predições
- Sem realidade aumentada
- Preço: R$ 79,90/mês (vamos ser mais competitivos)

**NOSSA META:** Superar em TODOS os aspectos e criar o melhor sistema do mundo!

## ESPECIFICAÇÕES TÉCNICAS OBRIGATÓRIAS

### Stack Tecnológica Moderna:
```json
{
  "frontend": "Next.js 14+ com App Router",
  "backend": "Next.js API Routes + tRPC",
  "database": "PostgreSQL + Prisma ORM",
  "auth": "NextAuth.js v5 + JWT",
  "ui": "Tailwind CSS + Shadcn UI + Framer Motion",
  "validation": "Zod + React Hook Form",
  "state": "Zustand + React Query",
  "testing": "Vitest + Playwright + MSW",
  "deploy": "Vercel + Railway",
  "monitoring": "Sentry + PostHog",
  "ai": "OpenAI GPT-4 + Anthropic Claude",
  "communication": "WhatsApp Business API + Twilio",
  "payments": "Stripe + PIX",
  "storage": "AWS S3 + CloudFront"
}
```

## DESENVOLVIMENTO COMPLETO - FASE POR FASE

### FASE 1: CONFIGURAÇÃO E ARQUITETURA

**1.1 - Setup do Projeto:**
```bash
# Comandos para executar:
npx create-next-app@latest fisioflow-ai-studio --typescript --tailwind --eslint --app
cd fisioflow-ai-studio
npm install @prisma/client prisma next-auth @auth/prisma-adapter
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @hookform/resolvers react-hook-form zod
npm install zustand @tanstack/react-query
npm install framer-motion lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install recharts date-fns clsx tailwind-merge
npm install bcryptjs jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken
```

**1.2 - Configuração Prisma:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?
  role          Role      @default(FISIOTERAPEUTA)
  clinicId      String?
  clinic        Clinic?   @relation(fields: [clinicId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLogin     DateTime?
  isActive      Boolean   @default(true)
  avatar        String?
  phone         String?
  specialties   String[]
  
  // Relacionamentos
  patients      Patient[]
  appointments  Appointment[]
  prescriptions Prescription[]
  sessions      Session[]
  
  @@map("users")
}

model Clinic {
  id          String   @id @default(cuid())
  name        String
  cnpj        String   @unique
  email       String
  phone       String
  address     Address?
  settings    Json?
  subscription SubscriptionPlan @default(BASIC)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relacionamentos
  users       User[]
  patients    Patient[]
  appointments Appointment[]
  rooms       Room[]
  services    Service[]
  
  @@map("clinics")
}

model Patient {
  id              String    @id @default(cuid())
  name            String
  cpf             String    @unique
  email           String?
  phone           String
  birthDate       DateTime
  gender          Gender
  address         Address?
  emergencyContact Json?
  medicalHistory  MedicalHistory[]
  avatar          String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relacionamentos
  clinicId        String
  clinic          Clinic    @relation(fields: [clinicId], references: [id])
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  appointments    Appointment[]
  prescriptions   Prescription[]
  assessments     Assessment[]
  communications  Communication[]
  payments        Payment[]
  
  @@map("patients")
}

model Appointment {
  id          String            @id @default(cuid())
  date        DateTime
  duration    Int               @default(60) // minutos
  status      AppointmentStatus @default(SCHEDULED)
  notes       String?
  type        AppointmentType   @default(CONSULTATION)
  isRecurring Boolean           @default(false)
  recurringPattern Json?
  
  // Relacionamentos
  patientId   String
  patient     Patient           @relation(fields: [patientId], references: [id])
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  clinicId    String
  clinic      Clinic            @relation(fields: [clinicId], references: [id])
  roomId      String?
  room        Room?             @relation(fields: [roomId], references: [id])
  serviceId   String?
  service     Service?          @relation(fields: [serviceId], references: [id])
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  @@map("appointments")
}

model Exercise {
  id              String   @id @default(cuid())
  name            String
  description     String
  instructions    String
  videoUrl        String?
  thumbnailUrl    String?
  duration        Int?     // segundos
  difficulty      Int      @default(1) // 1-5
  equipment       String[]
  bodyParts       String[]
  conditions      String[]
  contraindications String[]
  variations      Json?
  category        ExerciseCategory
  specialty       Specialty
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relacionamentos
  prescriptions   PrescriptionExercise[]
  protocols       ProtocolExercise[]
  
  @@map("exercises")
}

model Prescription {
  id          String    @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime?
  frequency   String    // "3x/semana", "diário", etc.
  status      PrescriptionStatus @default(ACTIVE)
  notes       String?
  
  // Relacionamentos
  patientId   String
  patient     Patient   @relation(fields: [patientId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  exercises   PrescriptionExercise[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("prescriptions")
}

model PrescriptionExercise {
  id             String @id @default(cuid())
  sets           Int?
  reps           Int?
  duration       Int?   // segundos
  restTime       Int?   // segundos
  weight         Float?
  notes          String?
  order          Int    @default(0)
  
  // Relacionamentos
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id])
  exerciseId     String
  exercise       Exercise     @relation(fields: [exerciseId], references: [id])
  
  @@map("prescription_exercises")
}

model Payment {
  id          String        @id @default(cuid())
  amount      Decimal       @db.Decimal(10,2)
  method      PaymentMethod
  status      PaymentStatus @default(PENDING)
  dueDate     DateTime
  paidDate    DateTime?
  description String?
  installment Int?
  totalInstallments Int?
  
  // Relacionamentos
  patientId   String
  patient     Patient       @relation(fields: [patientId], references: [id])
  clinicId    String
  clinic      Clinic        @relation(fields: [clinicId], references: [id])
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  @@map("payments")
}

model Communication {
  id        String            @id @default(cuid())
  type      CommunicationType
  channel   CommunicationChannel
  content   String
  status    MessageStatus     @default(SENT)
  sentAt    DateTime          @default(now())
  readAt    DateTime?
  
  // Relacionamentos
  patientId String
  patient   Patient           @relation(fields: [patientId], references: [id])
  userId    String?
  user      User?             @relation(fields: [userId], references: [id])
  
  @@map("communications")
}

// Enums
enum Role {
  ADMIN
  FISIOTERAPEUTA
  RECEPCIONISTA
  PACIENTE
}

enum Gender {
  MASCULINO
  FEMININO
  OUTRO
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentType {
  CONSULTATION
  TREATMENT
  ASSESSMENT
  FOLLOW_UP
  TELECONSULTATION
}

enum ExerciseCategory {
  STRENGTH
  FLEXIBILITY
  CARDIO
  BALANCE
  COORDINATION
  REHABILITATION
}

enum Specialty {
  ORTOPEDIA
  NEUROLOGIA
  CARDIORRESPIRATORIA
  PEDIATRIA
  GERIATRIA
  ESPORTIVA
  DERMATOFUNCIONAL
  UROGINECOLOGIA
}

enum PrescriptionStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  PIX
  BANK_TRANSFER
  INSURANCE
}

enum PaymentStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

enum CommunicationType {
  REMINDER
  CONFIRMATION
  EXERCISE_PLAN
  RESULT
  MARKETING
  SUPPORT
}

enum CommunicationChannel {
  WHATSAPP
  SMS
  EMAIL
  PUSH_NOTIFICATION
  IN_APP
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

enum SubscriptionPlan {
  BASIC
  PRO
  ENTERPRISE
}

// Tipos compostos
type Address {
  street      String
  number      String
  complement  String?
  neighborhood String
  city        String
  state       String
  zipCode     String
  country     String @default("Brasil")
}

type MedicalHistory {
  condition   String
  date        DateTime
  description String?
  severity    String?
  status      String // "ativo", "resolvido", "em tratamento"
}
```

### FASE 2: AUTENTICAÇÃO E SEGURANÇA

**2.1 - Sistema de Autenticação Completo:**
```typescript
// lib/auth.ts
import NextAuth, { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { clinic: true }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Registrar login para auditoria
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId,
          avatar: user.avatar,
        }
      }
    })
  ],
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
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  }
}

export default NextAuth(authOptions)
```

**2.2 - Middleware de Proteção:**
```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return null
    }

    if (!isAuth && !isApiRoute) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    // Verificar permissões por role
    const userRole = token?.role as string
    const pathname = req.nextUrl.pathname

    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (pathname.startsWith('/finance') && !['ADMIN', 'FISIOTERAPEUTA'].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### FASE 3: DASHBOARD INTELIGENTE SUPERIOR

**3.1 - Dashboard Principal:**
```typescript
// app/dashboard/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { CalendarDays, Users, DollarSign, TrendingUp, Clock, AlertTriangle, Star, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"

export default function Dashboard() {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(res => res.json())
  })

  const kpis = [
    {
      title: "Pacientes Ativos",
      value: dashboardData?.activePatients || 0,
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Faturamento Mensal",
      value: `R$ ${dashboardData?.monthlyRevenue?.toLocaleString() || '0'}`,
      change: "+18%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Taxa de No-Show",
      value: `${dashboardData?.noShowRate || 0}%`,
      change: "-5%",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Satisfação Média",
      value: `${dashboardData?.avgSatisfaction || 0}/5`,
      change: "+0.3",
      icon: Star,
      color: "text-yellow-600"
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header com saudação personalizada */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold">
            Bom dia, Dr. {dashboardData?.user?.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Você tem {dashboardData?.todayAppointments || 0} agendamentos hoje
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Relatório Semanal
          </Button>
          <Button>
            <CalendarDays className="w-4 h-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </motion.div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className={kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {kpi.change}
                  </span>
                  {' '}em relação ao mês anterior
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Gráficos e Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento */}
        <Card>
          <CardHeader>
            <CardTitle>Faturamento dos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData?.revenueChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${value}`, 'Faturamento']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de Especialidades */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Especialidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData?.specialtyDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData?.specialtyDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agenda do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Agenda de Hoje
            <Badge variant="outline">
              {dashboardData?.todayAppointments || 0} agendamentos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.todaySchedule?.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-blue-600">
                    {appointment.time}
                  </div>
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.service}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    appointment.status === 'confirmed' ? 'default' : 
                    appointment.status === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {appointment.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Ver Detalhes
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas e Pendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData?.alerts?.map((alert, index) => (
              <div key={index} className={`p-3 rounded border-l-4 ${
                alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                alert.type === 'error' ? 'border-red-500 bg-red-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### FASE 4: GESTÃO DE PACIENTES SUPERIOR

**4.1 - Interface de Pacientes:**
```typescript
// app/patients/page.tsx
'use client'

import { useState } from 'react'
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Filter, Download, MessageCircle, Calendar } from "lucide-react"
import { PatientForm } from "@/components/forms/PatientForm"
import { useQuery } from "@tanstack/react-query"

const columns = [
  {
    accessorKey: "name",
    header: "Paciente",
    cell: ({ row }) => (
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={row.original.avatar} />
          <AvatarFallback>
            {row.original.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "age",
    header: "Idade",
    cell: ({ row }) => `${row.original.age} anos`,
  },
  {
    accessorKey: "condition",
    header: "Condição Principal",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.condition}</Badge>
    ),
  },
  {
    accessorKey: "lastVisit",
    header: "Última Consulta",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.lastVisit ? 
          new Date(row.original.lastVisit).toLocaleDateString('pt-BR') : 
          'Nunca'
        }
      </span>
    ),
  },
  {
    accessorKey: "nextAppointment",
    header: "Próximo Agendamento",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.nextAppointment ? 
          new Date(row.original.nextAppointment).toLocaleDateString('pt-BR') : 
          'Não agendado'
        }
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'active' ? 'default' : 
        row.original.status === 'inactive' ? 'secondary' : 
        'destructive'
      }>
        {row.original.status === 'active' ? 'Ativo' : 
         row.original.status === 'inactive' ? 'Inativo' : 
         'Suspenso'}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button size="sm" variant="outline">
          <MessageCircle className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Calendar className="w-4 h-4" />
        </Button>
      </div>
    ),
  },
]

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false)

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', searchTerm, statusFilter],
    queryFn: () => fetch(`/api/patients?search=${searchTerm}&status=${statusFilter}`)
      .then(res => res.json())
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Pacientes</h1>
          <p className="text-muted-foreground">
            {patients?.total || 0} pacientes cadastrados
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
              </DialogHeader>
              <PatientForm onSuccess={() => setIsNewPatientOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pacientes por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avançados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pacientes */}
      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns} 
            data={patients?.data || []} 
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

### FASE 5: BIBLIOTECA DE EXERCÍCIOS REVOLUCIONÁRIA

**5.1 - Interface da Biblioteca:**
```typescript
// app/exercises/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Play, Heart, Clock, Target, Filter } from "lucide-react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"

export default function ExercisesLibrary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [bodyPartFilter, setBodyPartFilter] = useState('all')

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', searchTerm, specialtyFilter, difficultyFilter, bodyPartFilter],
    queryFn: () => fetch(`/api/exercises?search=${searchTerm}&specialty=${specialtyFilter}&difficulty=${difficultyFilter}&bodyPart=${bodyPartFilter}`)
      .then(res => res.json())
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Exercícios</h1>
          <p className="text-muted-foreground">
            Mais de 25.000 exercícios validados por especialistas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Importar Exercícios
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Criar Exercício
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercícios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ortopedia">Ortopedia</SelectItem>
                <SelectItem value="neurologia">Neurologia</SelectItem>
                <SelectItem value="cardio">Cardiorrespiratória</SelectItem>
                <SelectItem value="pediatria">Pediatria</SelectItem>
                <SelectItem value="geriatria">Geriatria</SelectItem>
                <SelectItem value="esportiva">Esportiva</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Região do Corpo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="cervical">Cervical</SelectItem>
                <SelectItem value="lombar">Lombar</SelectItem>
                <SelectItem value="joelho">Joelho</SelectItem>
                <SelectItem value="ombro">Ombro</SelectItem>
                <SelectItem value="quadril">Quadril</SelectItem>
                <SelectItem value="tornozelo">Tornozelo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="1">⭐ Iniciante</SelectItem>
                <SelectItem value="2">⭐⭐ Básico</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Intermediário</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ Avançado</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ Expert</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Mais Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Exercícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {exercises?.data?.map((exercise, index) => (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <div className="relative">
                <video 
                  className="w-full h-48 object-cover"
                  poster={exercise.thumbnailUrl}
                  preload="metadata"
                >
                  <source src={exercise.videoUrl} type="video/mp4" />
                </video>
                
                {/* Overlay com controles */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="secondary">
                    <Play className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </div>

                {/* Badge de dificuldade */}
                <Badge className="absolute top-2 right-2">
                  {'⭐'.repeat(exercise.difficulty)}
                </Badge>

                {/* Badge de favorito */}
                {exercise.isFavorite && (
                  <Heart className="absolute top-2 left-2 w-5 h-5 text-red-500 fill-current" />
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">
                  {exercise.name}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {exercise.description}
                </p>

                {/* Tags de região do corpo */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {exercise.bodyParts.slice(0, 3).map((part) => (
                    <Badge key={part} variant="secondary" className="text-xs">
                      {part}
                    </Badge>
                  ))}
                  {exercise.bodyParts.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{exercise.bodyParts.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Informações adicionais */}
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {exercise.duration}s
                  </div>
                  <div className="flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    {exercise.category}
                  </div>
                </div>

                {/* Equipamentos necessários */}
                {exercise.equipment.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Equipamentos:</p>
                    <div className="flex flex-wrap gap-1">
                      {exercise.equipment.slice(0, 2).map((eq) => (
                        <Badge key={eq} variant="outline" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex space-x-2">
                  <Button size="sm" className="flex-1">
                    Prescrever
                  </Button>
                  <Button size="sm" variant="outline">
                    Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Paginação */}
      {exercises?.pagination && (
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              disabled={exercises.pagination.currentPage === 1}
            >
              Anterior
            </Button>
            <span className="flex items-center px-4">
              Página {exercises.pagination.currentPage} de {exercises.pagination.totalPages}
            </span>
            <Button 
              variant="outline"
              disabled={exercises.pagination.currentPage === exercises.pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### FASE 6: SISTEMA DE AGENDAMENTOS PREMIUM

**6.1 - Calendário Avançado:**
```typescript
// app/appointments/page.tsx
'use client'

import { useState } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { CalendarDays, Clock, Users, Plus, Filter, RefreshCw } from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion } from "framer-motion"

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('day') // day, week, month
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      appointments: [] // Será preenchido com dados reais
    }
  })

  const handleDragEnd = (result) => {
    // Implementar lógica de drag and drop para reagendamento
    if (!result.destination) return
    
    // Atualizar agendamento via API
    console.log('Reagendamento:', result)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar Google
          </Button>
          <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              {/* Formulário de agendamento */}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário lateral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="w-5 h-5 mr-2" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              locale={ptBR}
            />
            
            {/* Resumo do dia */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Agendamentos:</span>
                <Badge>8</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Confirmados:</span>
                <Badge variant="secondary">6</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pendentes:</span>
                <Badge variant="outline">2</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline do dia */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agenda do Dia</span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <motion.div
                    key={slot.time}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Droppable droppableId={slot.time}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex items-center space-x-4 p-3 border rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          <div className="w-16 text-sm font-medium text-muted-foreground">
                            {slot.time}
                          </div>
                          
                          <div className="flex-1">
                            {slot.appointments.length > 0 ? (
                              slot.appointments.map((appointment, idx) => (
                                <Draggable
                                  key={appointment.id}
                                  draggableId={appointment.id}
                                  index={idx}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`p-3 rounded border-l-4 transition-all ${
                                        appointment.status === 'confirmed' 
                                          ? 'bg-green-50 border-green-500' 
                                          : appointment.status === 'pending'
                                          ? 'bg-yellow-50 border-yellow-500'
                                          : 'bg-gray-50 border-gray-300'
                                      } ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="font-medium">
                                            {appointment.patientName}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {appointment.service} • {appointment.duration}min
                                          </p>
                                          <div className="flex items-center mt-1">
                                            <Clock className="w-3 h-3 mr-1" />
                                            <span className="text-xs">
                                              {appointment.time} - {appointment.endTime}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1">
                                          <Badge variant={
                                            appointment.status === 'confirmed' ? 'default' : 
                                            appointment.status === 'pending' ? 'secondary' : 
                                            'destructive'
                                          }>
                                            {appointment.status === 'confirmed' ? 'Confirmado' :
                                             appointment.status === 'pending' ? 'Pendente' :
                                             'Cancelado'}
                                          </Badge>
                                          {appointment.isFirstTime && (
                                            <Badge variant="outline" className="text-xs">
                                              Primeira vez
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            ) : (
                              <div className="p-4 border-2 border-dashed border-gray-200 rounded text-center text-muted-foreground">
                                Horário disponível
                              </div>
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </motion.div>
                ))}
              </div>
            </DragDropContext>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### FASE 7: MÓDULO FINANCEIRO AVANÇADO

**7.1 - Gestão Financeira Completa:**
```typescript
// app/finance/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Banknote, AlertCircle } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useQuery } from "@tanstack/react-query"

export default function FinancePage() {
  const { data: financeData } = useQuery({
    queryKey: ['finance'],
    queryFn: () => fetch('/api/finance/dashboard').then(res => res.json())
  })

  const revenueData = [
    { month: 'Jan', revenue: 45000, expenses: 15000, profit: 30000 },
    { month: 'Fev', revenue: 52000, expenses: 16000, profit: 36000 },
    { month: 'Mar', revenue: 48000, expenses: 14000, profit: 34000 },
    { month: 'Abr', revenue: 61000, expenses: 18000, profit: 43000 },
    { month: 'Mai', revenue: 55000, expenses: 17000, profit: 38000 },
    { month: 'Jun', revenue: 67000, expenses: 19000, profit: 48000 },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Controle completo das finanças da clínica
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Exportar Relatório</Button>
          <Button>Nova Transação</Button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ 67.450,00
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +18% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ 19.230,00
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline w-3 h-3 mr-1" />
              -5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <Banknote className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ 48.220,00
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +25% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ 3.450,00
            </div>
            <p className="text-xs text-muted-foreground">
              5.1% do faturamento total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Financeira</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Receita"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name="Despesas"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Lucro"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'PIX', value: 45, color: '#10b981' },
                    { name: 'Cartão Crédito', value: 30, color: '#3b82f6' },
                    { name: 'Cartão Débito', value: 15, color: '#f59e0b' },
                    { name: 'Dinheiro', value: 10, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'PIX', value: 45, color: '#10b981' },
                    { name: 'Cartão Crédito', value: 30, color: '#3b82f6' },
                    { name: 'Cartão Débito', value: 15, color: '#f59e0b' },
                    { name: 'Dinheiro', value: 10, color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Implementar DataTable com transações */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### FASE 8: FUNCIONALIDADES ÚNICAS (NÃO EXISTEM NA VEDIUS)

**8.1 - IA para Previsão de No-Show:**
```typescript
// lib/ai/no-show-predictor.ts
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class NoShowPredictor {
  async predictNoShow(appointmentData: {
    patientId: string
    appointmentTime: Date
    weatherCondition?: string
    dayOfWeek: number
    hourOfDay: number
    patientHistory: {
      totalAppointments: number
      noShows: number
      lastVisit: Date
      averageInterval: number
    }
  }) {
    const prompt = `
    Analise os dados do agendamento e preveja a probabilidade de no-show:
    
    Dados do paciente:
    - Total de consultas: ${appointmentData.patientHistory.totalAppointments}
    - Faltas anteriores: ${appointmentData.patientHistory.noShows}
    - Última visita: ${appointmentData.patientHistory.lastVisit}
    - Intervalo médio entre consultas: ${appointmentData.patientHistory.averageInterval} dias
    
    Dados do agendamento:
    - Dia da semana: ${appointmentData.dayOfWeek} (1=segunda, 7=domingo)
    - Horário: ${appointmentData.hourOfDay}h
    - Condição climática: ${appointmentData.weatherCondition || 'não informada'}
    
    Retorne apenas um número entre 0 e 1 representando a probabilidade de no-show.
    `

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    })

    const probability = parseFloat(response.choices[0].message.content || '0')
    
    return {
      probability,
      riskLevel: probability < 0.2 ? 'BAIXO' : probability < 0.5 ? 'MÉDIO' : 'ALTO',
      recommendations: this.getRecommendations(probability)
    }
  }

  private getRecommendations(probability: number): string[] {
    if (probability > 0.7) {
      return [
        'Enviar lembrete 24h antes',
        'Ligar para confirmar presença',
        'Oferecer reagendamento flexível',
        'Considerar teleconsulta'
      ]
    } else if (probability > 0.4) {
      return [
        'Enviar lembrete automático',
        'Confirmar via WhatsApp'
      ]
    }
    return ['Acompanhamento padrão']
  }
}
```

**8.2 - Chatbot Médico Inteligente:**
```typescript
// components/ChatBot.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, User, Send, Mic, MicOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  intent?: string
  confidence?: number
}

export function MedicalChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Olá! Sou o assistente virtual do FisioFlow. Como posso ajudá-lo hoje?',
      timestamp: new Date(),
      intent: 'greeting',
      confidence: 1.0
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          context: messages.slice(-5) // Últimas 5 mensagens para contexto
        })
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.message,
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence
      }

      setMessages(prev => [...prev, botMessage])

      // Se o bot identificou uma intenção específica, executar ação
      if (data.action) {
        await executeAction(data.action, data.parameters)
      }

    } catch (error) {
      console.error('Erro no chatbot:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const executeAction = async (action: string, parameters: any) => {
    switch (action) {
      case 'schedule_appointment':
        // Abrir modal de agendamento
        break
      case 'search_patient':
        // Buscar paciente
        break
      case 'create_prescription':
        // Criar prescrição
        break
    }
  }

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
      }

      recognition.start()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          Assistente Virtual FisioFlow
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="w-8 h-8">
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </Avatar>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p>{message.content}</p>
                    {message.confidence && message.confidence < 0.8 && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Baixa confiança - Verificar com humano
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <Bot className="w-4 h-4" />
                </Avatar>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input de mensagem */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem ou pergunta..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={startVoiceRecognition}
            variant="outline"
            size="icon"
            disabled={isLoading}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## INSTRUÇÕES ESPECÍFICAS PARA GETMOCHA:

### DESENVOLVIMENTO INCREMENTAL:
1. **Comece pelo MVP:** Auth → Dashboard → Pacientes → Agendamentos
2. **Teste cada funcionalidade:** Garanta qualidade superior à Vedius
3. **Implemente incrementalmente:** Uma funcionalidade por vez
4. **Foque na UX:** Interface mais moderna e intuitiva
5. **Performance:** Sistema deve ser 50% mais rápido
6. **Mobile-first:** Responsividade perfeita

### DIFERENCIAIS OBRIGATÓRIOS:
- [ ] 25.000+ exercícios (vs 15.000 da Vedius)
- [ ] IA para previsão de no-show
- [ ] Chatbot médico inteligente
- [ ] Teleconsulta integrada
- [ ] Realidade aumentada para exercícios
- [ ] Interface mais moderna
- [ ] Performance superior
- [ ] Funcionalidades únicas

### CRITÉRIOS DE QUALIDADE:
- [ ] Código TypeScript 100% tipado
- [ ] Testes automatizados (90%+ coverage)
- [ ] Performance (< 2s carregamento)
- [ ] Acessibilidade (WCAG 2.1 AA)
- [ ] Responsividade perfeita
- [ ] SEO otimizado
- [ ] Segurança avançada

**OBJETIVO FINAL:** Criar o sistema de gestão para fisioterapia mais avançado do mundo, superando Vedius e estabelecendo novo padrão de mercado.

**COMECE AGORA:** Implemente o sistema completo seguindo as fases sequencialmente!

