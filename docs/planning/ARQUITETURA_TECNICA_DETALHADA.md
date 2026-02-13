# Arquitetura Técnica Detalhada - FisioFlow 2026

## 1. Visão Arquitetural

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   iOS App           │  │   iOS App           │  │   Web App           │ │
│  │   Pacientes         │  │   Profissionais     │  │   Profissionais     │ │
│  │   (React Native)    │  │   (React Native)    │  │   (React + Vite)    │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             └────────────────────────┼────────────────────────┘            │
│                                    │                                     │
│  ┌─────────────────────────────────┼─────────────────────────────────┐   │
│  │       SHARED PACKAGE             │                                 │   │
│  │  - UI Components                 │                                 │   │
│  │  - API Clients                   │                                 │   │
│  │  - Types                         │                                 │   │
│  │  - Utils                         │                                 │   │
│  │  - Constants                     │                                 │   │
│  └─────────────────────────────────┼─────────────────────────────────┘   │
├────────────────────────────────────┼─────────────────────────────────────┤
│                                     ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         SERVICE LAYER                                 │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│  │  │  Auth Service   │  │  Data Service   │  │  Storage Service│      │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│  │  │  Push Service   │  │  Analytics      │  │  Crashlytics    │      │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                                     ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         API LAYER                                      │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│  │  │  Firebase       │  │  Cloud          │  │  Firebase       │      │ │
│  │  │  Firestore      │  │  Functions      │  │  Storage        │      │ │
│  │  │  (SDK)          │  │  (HTTP/Callable) │  │  (SDK)          │      │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Monorepo

### 2.1 Configuração do Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// package.json (root)
{
  "name": "fisioflow-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "turbo run type-check",
    "patient:ios": "pnpm --filter @fisioflow/patient-ios",
    "professional:ios": "pnpm --filter @fisioflow/professional-ios",
    "professional:web": "pnpm --filter @fisioflow/professional-web"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 2.2 Estrutura de Diretórios

```
fisioflow-monorepo/
├── apps/
│   ├── patient-ios/              # Expo app para pacientes
│   │   ├── app/                  # Expo Router (file-based)
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── exercises.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── profile.tsx
│   │   │   │   └── _layout.tsx
│   │   │   └── _layout.tsx
│   │   ├── assets/
│   │   ├── components/           # App-specific components
│   │   ├── hooks/                # App-specific hooks
│   │   ├── services/             # App-specific services
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── professional-ios/         # Expo app para profissionais
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (drawer)/
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── patients/
│   │   │   │   ├── calendar/
│   │   │   │   ├── exercises/
│   │   │   │   ├── financial/
│   │   │   │   └── _layout.tsx
│   │   │   └── _layout.tsx
│   │   ├── assets/
│   │   ├── components/
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── professional-web/         # Web app (projeto atual)
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── shared-ui/                # Componentes UI compartilhados
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button/
│   │   │   │   ├── card/
│   │   │   │   ├── input/
│   │   │   │   ├── modal/
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── theme/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-api/               # Clientes API
│   │   ├── src/
│   │   │   ├── firebase/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── firestore.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── messaging.ts
│   │   │   ├── patients.ts
│   │   │   ├── exercises.ts
│   │   │   ├── appointments.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-types/             # Tipos TypeScript
│   │   ├── src/
│   │   │   ├── patient.ts
│   │   │   ├── professional.ts
│   │   │   ├── exercise.ts
│   │   │   ├── appointment.ts
│   │   │   ├── payment.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-utils/             # Utilitários
│   │   ├── src/
│   │   │   ├── date/
│   │   │   ├── validation/
│   │   │   ├── format/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared-constants/         # Constantes
│       ├── src/
│       │   ├── routes.ts
│       │   ├── firebase.ts
│       │   ├── storage.ts
│       │   └── index.ts
│       └── package.json
│
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   ├── api/
│   │   ├── triggers/
│   │   └── scheduled/
│   ├── package.json
│   └── tsconfig.json
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 3. Tipos e Interfaces

### 3.1 Core Types

```typescript
// packages/shared-types/src/index.ts

// ============================================================================
// USER & AUTH
// ============================================================================

export type UserRole = 'patient' | 'professional' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string; // Para pacientes
  photoURL?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PATIENT
// ============================================================================

export interface Patient {
  id: string;
  userId: string;
  professionalId: string;
  name: string;
  birthDate: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedicalHistoryEntry {
  date: Date;
  condition: string;
  description?: string;
  medications?: string[];
}

// ============================================================================
// EVALUATION
// ============================================================================

export interface EvaluationTemplate {
  id: string;
  professionalId: string;
  name: string;
  description?: string;
  fields: EvaluationField[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'measurement';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  unit?: string;
  defaultValue?: any;
}

export interface Evaluation {
  id: string;
  patientId: string;
  professionalId: string;
  templateId?: string;
  date: Date;
  type: 'initial' | 'followup' | 'discharge';
  data: Record<string, any>;
  notes?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TREATMENT PLAN
// ============================================================================

export interface TreatmentPlan {
  id: string;
  patientId: string;
  professionalId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: TreatmentPlanStatus;
  goals: string[];
  exercises: ExercisePrescription[];
  frequency: number;
  totalSessions?: number;
  completedSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TreatmentPlanStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export interface ExercisePrescription {
  id: string;
  treatmentPlanId: string;
  patientId: string;
  exerciseId: string;
  name: string;
  description?: string;
  sets: number;
  reps: number;
  duration?: number;
  restTime: number;
  frequency: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions?: string;
  order: number;
  isActive: boolean;
}

// ============================================================================
// EXERCISE SESSION
// ============================================================================

export interface ExerciseSession {
  id: string;
  patientId: string;
  prescriptionId: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: ExerciseSessionStatus;
  feedback?: ExerciseFeedback;
  videoUrl?: string;
  duration?: number;
  createdAt: Date;
}

export type ExerciseSessionStatus = 'scheduled' | 'completed' | 'skipped' | 'cancelled';

export interface ExerciseFeedback {
  pain: number; // 0-10
  difficulty: number; // 1-5
  notes?: string;
}

// ============================================================================
// EXERCISE LIBRARY
// ============================================================================

export interface Exercise {
  id: string;
  professionalId: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  bodyParts: BodyPart[];
  difficulty: ExerciseDifficulty;
  equipment?: string[];
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ExerciseCategory =
  | 'lower_body'
  | 'upper_body'
  | 'core'
  | 'cardio'
  | 'flexibility'
  | 'balance'
  | 'posture';

export type BodyPart =
  | 'neck'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hand'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'foot'
  | 'spine'
  | 'chest'
  | 'back';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

// ============================================================================
// APPOINTMENT
// ============================================================================

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  price?: number;
  paymentStatus?: PaymentStatus;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'noshow';

export type AppointmentType = 'evaluation' | 'followup' | 'discharge';

// ============================================================================
// PAYMENT
// ============================================================================

export interface Payment {
  id: string;
  patientId: string;
  professionalId: string;
  appointmentId?: string;
  amount: number;
  date: Date;
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  voucherId?: string;
  createdAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'transfer';

export type PaymentStatus = 'pending' | 'completed' | 'refunded';

// ============================================================================
// NOTIFICATION
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export type NotificationType =
  | 'exercise_reminder'
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'payment_received'
  | 'new_message'
  | 'achievement_unlocked'
  | 'progress_update';

// ============================================================================
// ACHIEVEMENT
// ============================================================================

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export type AchievementType =
  | 'first_session'
  | 'week_streak'
  | 'month_streak'
  | 'completed_plan'
  | 'pain_reduction'
  | 'perfect_adherence';
```

---

## 4. Serviços Compartilhados

### 4.1 Firebase Client

```typescript
// packages/shared-api/src/firebase/index.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

export default app;
```

### 4.2 Patient Service

```typescript
// packages/shared-api/src/patients.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import type { Patient, User } from '@fisioflow/shared-types';
import { db } from './firebase';

export class PatientService {
  private static readonly COLLECTION = 'patients';

  // Get patient by ID
  static async getPatient(patientId: string): Promise<Patient | null> {
    const docRef = doc(db, this.COLLECTION, patientId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? this.mapFromDoc(docSnap) : null;
  }

  // Get patient by user ID
  static async getPatientByUserId(userId: string): Promise<Patient | null> {
    const q = query(
      collection(db, this.COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty
      ? null
      : this.mapFromDoc(querySnapshot.docs[0]);
  }

  // List patients for professional
  static async listPatients(
    professionalId: string,
    options?: {
      activeOnly?: boolean;
      limit?: number;
    }
  ): Promise<Patient[]> {
    let q = query(
      collection(db, this.COLLECTION),
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc')
    );

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(this.mapFromDoc);
  }

  // Search patients
  static async searchPatients(
    professionalId: string,
    searchTerm: string
  ): Promise<Patient[]> {
    const searchLower = searchTerm.toLowerCase();

    // Get all patients for professional
    const patients = await this.listPatients(professionalId);

    // Filter client-side (Firestore doesn't support full-text search)
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.phone?.includes(searchTerm)
    );
  }

  // Create patient
  static async createPatient(
    data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Patient> {
    const docRef = doc(collection(db, this.COLLECTION));
    const patient: Patient = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(docRef, patient);
    return patient;
  }

  // Update patient
  static async updatePatient(
    patientId: string,
    updates: Partial<Patient>
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, patientId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  // Delete patient
  static async deletePatient(patientId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, patientId);
    await deleteDoc(docRef);
  }

  // Real-time listener for patient changes
  static onPatientChanged(
    patientId: string,
    callback: (patient: Patient | null) => void
  ): () => void {
    const docRef = doc(db, this.COLLECTION, patientId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      callback(docSnap.exists() ? this.mapFromDoc(docSnap) : null);
    });

    return unsubscribe;
  }

  // Helper: Map Firestore document to Patient
  private static mapFromDoc(docSnap: QueryDocumentSnapshot): Patient {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
}
```

### 4.3 Exercise Service

```typescript
// packages/shared-api/src/exercises.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import type { Exercise, ExercisePrescription, ExerciseSession } from '@fisioflow/shared-types';
import { db } from './firebase';

export class ExerciseService {
  // Library exercises
  static async getExercise(exerciseId: string): Promise<Exercise | null> {
    const docRef = doc(db, 'exercises', exerciseId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? this.mapExercise(docSnap) : null;
  }

  static async listExercises(filters?: {
    category?: string;
    bodyPart?: string;
    difficulty?: string;
    professionalId?: string;
    isPublic?: boolean;
  }): Promise<Exercise[]> {
    let q = query(collection(db, 'exercises'));

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.bodyPart) {
      q = query(q, where('bodyParts', 'array-contains', filters.bodyPart));
    }
    if (filters?.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }
    if (filters?.isPublic !== undefined) {
      q = query(q, where('isPublic', '==', filters.isPublic));
    }
    if (filters?.professionalId) {
      q = query(
        q,
        where('professionalId', '==', filters.professionalId)
      );
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(this.mapExercise);
  }

  static async createExercise(
    data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Exercise> {
    const docRef = doc(collection(db, 'exercises'));
    const exercise: Exercise = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(docRef, exercise);
    return exercise;
  }

  // Prescriptions
  static async getPrescription(
    prescriptionId: string
  ): Promise<ExercisePrescription | null> {
    const docRef = doc(db, 'exercise_prescriptions', prescriptionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? this.mapPrescription(docSnap) : null;
  }

  static async getPrescriptionsForPatient(
    patientId: string,
    activeOnly = true
  ): Promise<ExercisePrescription[]> {
    let q = query(
      collection(db, 'exercise_prescriptions'),
      where('patientId', '==', patientId)
    );

    if (activeOnly) {
      q = query(q, where('isActive', '==', true));
    }

    q = query(q, orderBy('order', 'asc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(this.mapPrescription);
  }

  // Sessions
  static async getSession(
    sessionId: string
  ): Promise<ExerciseSession | null> {
    const docRef = doc(db, 'exercise_sessions', sessionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? this.mapSession(docSnap) : null;
  }

  static async getSessionsForPatient(
    patientId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExerciseSession[]> {
    let q = query(
      collection(db, 'exercise_sessions'),
      where('patientId', '==', patientId)
    );

    if (startDate) {
      q = query(q, where('scheduledDate', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      q = query(q, where('scheduledDate', '<=', Timestamp.fromDate(endDate)));
    }

    q = query(q, orderBy('scheduledDate', 'desc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(this.mapSession);
  }

  static async createSession(
    data: Omit<ExerciseSession, 'id' | 'createdAt'>
  ): Promise<ExerciseSession> {
    const docRef = doc(collection(db, 'exercise_sessions'));
    const session: ExerciseSession = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    };

    await setDoc(docRef, session);
    return session;
  }

  static async completeSession(
    sessionId: string,
    feedback?: ExerciseFeedback,
    videoUrl?: string
  ): Promise<void> {
    const docRef = doc(db, 'exercise_sessions', sessionId);
    await updateDoc(docRef, {
      status: 'completed',
      completedDate: new Date(),
      feedback,
      videoUrl,
    });
  }

  // Helpers
  private static mapExercise(docSnap: QueryDocumentSnapshot): Exercise {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private static mapPrescription(docSnap: QueryDocumentSnapshot): ExercisePrescription {
    return docSnap.data() as ExercisePrescription;
  }

  private static mapSession(docSnap: QueryDocumentSnapshot): ExerciseSession {
    const data = docSnap.data();
    return {
      ...data,
      scheduledDate: data.scheduledDate?.toDate() || new Date(),
      completedDate: data.completedDate?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }
}
```

---

## 5. Componentes UI Compartilhados

### 5.1 Button Component

```typescript
// packages/shared-ui/src/components/button/Button.tsx
import React, { Pressable, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const theme = useTheme();

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
  };

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
    },
    danger: {
      backgroundColor: theme.colors.danger,
      color: theme.colors.dangerForeground,
    },
  };

  const style = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.roundness.md,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: style.backgroundColor,
          borderWidth: style.borderWidth || 0,
          borderColor: style.borderColor,
          opacity: (pressed || disabled) ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={style.color} />
      ) : (
        <Text style={{ color: style.color, fontSize: sizeStyle.fontSize, fontWeight: '600' }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
```

### 5.2 Input Component

```typescript
// packages/shared-ui/src/components/input/Input.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  icon?: React.ReactNode;
  placeholderTextColor?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'none',
  icon,
  placeholderTextColor,
}: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? theme.colors.danger
              : isFocused
              ? theme.colors.primary
              : theme.colors.border,
            borderWidth: 1,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || theme.colors.textSecondary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
```

---

## 6. Theme System

```typescript
// packages/shared-ui/src/theme/index.ts
import { createContext, useContext } from 'react';

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    dangerForeground: string;
    success: string;
    warning: string;
  };
  roundness: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#3B82F6',
    primaryForeground: '#FFFFFF',
    secondary: '#64748B',
    secondaryForeground: '#FFFFFF',
    background: '#FFFFFF',
    foreground: '#0F172A',
    card: '#F8FAFC',
    cardForeground: '#0F172A',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    danger: '#EF4444',
    dangerForeground: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  roundness: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#3B82F6',
    primaryForeground: '#FFFFFF',
    secondary: '#475569',
    secondaryForeground: '#FFFFFF',
    background: '#0F172A',
    foreground: '#F8FAFC',
    card: '#1E293B',
    cardForeground: '#F8FAFC',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    danger: '#EF4444',
    dangerForeground: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  roundness: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({
  children,
  theme = lightTheme,
}: {
  children: React.ReactNode;
  theme?: Theme;
}) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

---

## 7. Hooks Compartilhados

```typescript
// packages/shared-ui/src/hooks/useAuth.ts
import { auth } from '@fisioflow/shared-api';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@fisioflow/shared-api';
import type { User } from '@fisioflow/shared-types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({
              ...userDoc.data(),
              id: userDoc.id,
            } as User);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { user, loading };
}
```

```typescript
// packages/shared-ui/src/hooks/usePatient.ts
import { useState, useEffect } from 'react';
import { PatientService } from '@fisioflow/shared-api';
import type { Patient } from '@fisioflow/shared-types';

export function usePatient(patientId: string | null) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        const data = await PatientService.getPatient(patientId);
        setPatient(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  return { patient, loading, error };
}
```

---

## 8. Constantes Compartilhadas

```typescript
// packages/shared-constants/src/index.ts

// Firebase Collections
export const COLLECTIONS = {
  USERS: 'users',
  PATIENTS: 'patients',
  EVALUATIONS: 'evaluations',
  EVALUATION_TEMPLATES: 'evaluation_templates',
  TREATMENT_PLANS: 'treatment_plans',
  EXERCISE_PRESCRIPTIONS: 'exercise_prescriptions',
  EXERCISE_SESSIONS: 'exercise_sessions',
  EXERCISES: 'exercises',
  APPOINTMENTS: 'appointments',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  ACHIEVEMENTS: 'achievements',
} as const;

// Storage Paths
export const STORAGE_PATHS = {
  PATIENT_PHOTOS: (patientId: string) => `patients/${patientId}/photos`,
  EXERCISE_VIDEOS: (exerciseId: string) => `exercises/${exerciseId}`,
  SESSION_VIDEOS: (sessionId: string) => `sessions/${sessionId}`,
  EVALUATION_ATTACHMENTS: (evaluationId: string) =>
    `evaluations/${evaluationId}`,
  USER_PROFILE: (userId: string) => `users/${userId}/profile`,
} as const;

// Exercise Categories
export const EXERCISE_CATEGORIES = {
  LOWER_BODY: 'lower_body',
  UPPER_BODY: 'upper_body',
  CORE: 'core',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  POSTURE: 'posture',
} as const;

// Exercise Difficulties
export const EXERCISE_DIFFICULTIES = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NOSHOW: 'noshow',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  PIX: 'pix',
  TRANSFER: 'transfer',
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  MONTH_YEAR: 'MMMM/YYYY',
} as const;

// Error Messages
export const ERRORS = {
  UNAUTHORIZED: 'Você não tem permissão para realizar esta ação',
  NOT_FOUND: 'Recurso não encontrado',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet',
  UNKNOWN: 'Ocorreu um erro. Tente novamente',
} as const;
```

---

**Documento criado em:** 24 de Janeiro de 2026
**Versão:** 1.0
**Autor:** Rafael (FisioFlow)
