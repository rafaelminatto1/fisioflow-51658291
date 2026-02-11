# FisioFlow - System Architecture

Comprehensive architecture documentation for the FisioFlow physical therapy management platform.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Deployment Architecture](#deployment-architecture)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [API Layer](#api-layer)
- [Testing Strategy](#testing-strategy)

## Overview

FisioFlow is a comprehensive physical therapy management platform designed for Brazilian clinics. The system provides:

- **Patient Management**: Complete patient records, history, and tracking
- **Appointment Scheduling**: Calendar-based scheduling with real-time updates
- **Clinical Documentation**: SOAP notes, evolution tracking, assessments
- **Exercise Prescriptions**: Exercise plans with video demonstrations
- **Financial Management**: Billing, payments, and financial reports
- **Analytics & Reporting**: Patient progress, clinic performance metrics
- **Communication**: WhatsApp integration for patient engagement
- **AI-Powered Features**: Clinical insights, exercise suggestions, SOAP generation

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|-------------|---------|---------|
| **React** | UI Framework | 19.x |
| **TypeScript** | Type Safety | 5.x |
| **Vite** | Build Tool | Latest |
| **React Router** | Routing | v6.x |
| **TanStack Query** | Server State | v5.x |
| **Zod** | Runtime Validation | Latest |
| **React Hook Form** | Form Management | Latest |
| **Framer Motion** | Animations | Latest |
| **Radix UI** | Component Library | Latest |
| **TailwindCSS** | Styling | Latest |
| **Lucide React** | Icons | Latest |

### Backend

| Technology | Purpose | Version |
|-------------|---------|---------|
| **Firebase** | BaaS Platform | Latest |
| **Cloud Functions** | Serverless Compute | Node 20 |
| **Firestore** | NoSQL Database | Sync Layer |
| **Cloud Storage** | File Storage | - |
| **Google Secret Manager** | Secrets | - |

### Additional Services

| Service | Purpose |
|---------|---------|
| **Cloud SQL** | Primary relational database (PostgreSQL) |
| **Realtime Database** | Real-time notifications and sync |
| **WhatsApp API** | Patient engagement and reminders |
| **Google Calendar** | Professional/Patient schedule sync |
| **Sentry** | Error tracking and performance |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React Web App)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Routes       │  │ Components   │  │ Pages        │                      │
│  │ (Router v6)   │  │ (shadcn/ui)   │  │ (lazy load)   │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│         │                     │                    │                         │
│  ┌────▼─────────────────────▼──────────────┐                    │
│  │       State Management                                │                    │
│  │  ┌────────────────────────────────────────┐               │                    │
│  │  │ TanStack Query (Server State)      │               │                    │
│  │  │ React Context (Auth, Theme, etc.)    │               │                    │
│  │  └────────────────────────────────────────┘               │                    │
│  └───────────────────────────────────────────────────────────┘                    │
│                           │                                          │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │                   API Layer                                  │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │ Firebase SDK (Firestore, RTDB, Auth, Storage)     │    │    │
│  │  │ Cloud Functions (V2 HTTP & Callable)              │    │    │
│  │  │ External APIs (WhatsApp, Google, Stripe)          │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └───────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                           │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │ Firestore   │  │ Cloud       │  │ Cloud       │                   │
│  │ (NoSQL DB)  │  │ Functions   │  │ Storage     │                   │
│  │ (Sync Layer)│  │ (Node 20)   │  │ (Files)     │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
│         │                │                │                         │
│         ▼                ▼                ▼                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │ Cloud SQL   │  │ Realtime    │  │ Google      │                   │
│  │ (Postgres)  │  │ Database    │  │ Secrets     │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │ WhatsApp    │  │ Resend      │  │ Sentry      │                   │
│  │ Business    │  │ (Email)     │  │ (Errors)    │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Hybrid Persistence Flow

1. **Write (Web App)**: API call to Cloud Function V2 → Save to Cloud SQL (Primary) → Sync to Firestore (Secondary/Sync Layer).
2. **Write (Mobile App)**: Save to Firestore (Offline-first) → Background Trigger (syncPatientToSql) → Persist in Cloud SQL.
3. **Real-time**: Cloud SQL change → Cloud Function Trigger → Update Firebase RTDB Trigger → Reflect in all clients via listeners.

### Patient Creation Flow

```
User Action
    │
    ▼
┌─────────────┐
│ NewPatient  │
│  Component  │
└─────┬───────┘
      │
      ▼
┌──────────────────────┐
│ createPatientV2      │
│ (Cloud Function)     │
└─────┬────────────────┘
      │
      ├──────────────────────┐
      ▼                      ▼
┌────────────────┐    ┌────────────────┐
│ Cloud SQL      │    │ Firestore      │
│ (Relational)   │    │ (Sync/Legacy)  │
└──────┬─────────┘    └────────────────┘
       │
       ▼
┌──────────────────────┐
│ Realtime Update      │
│ (Firebase RTDB)      │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ UI Updates           │
│ - Invalidate query  │
│ - Show toast       │
└─────────────────────┘
```

### Appointment Scheduling Flow

```
User Drag & Drop
    │
    ▼
┌─────────────┐
│ CalendarView │
│  Component  │
└─────┬───────┘
      │
      ▼
┌──────────────────────┐
│ updateAppointmentV2  │
│ - Optimistic update  │
│ - Call Cloud Function│
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Cloud Function       │
│ - Validate Capacity │
│ - Save to Postgres  │
│ - Sync to Firestore │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Realtime Sync        │
│ (Firebase RTDB)      │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Schedule Updated     │
│ - Reflect in UI       │
└─────────────────────┘
```

## Security Model

### Authentication & Authorization

```
┌──────────────┐
│ Firebase Auth  │
│ (JWT Tokens)  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Auth Context        │
│ - User profile     │
│ - Organization ID  │
│ - Role             │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ RBAC Claims         │
│ - Custom Claims    │
│ - Role validation  │
│ - Org isolation   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Cloud SQL RLS       │
│ - Row Level Security│
│ - Tenant Isolation │
└─────────────────────┘
```

## Deployment Architecture

### Frontend Deployment

```
┌────────────────────────────────────────────────────────┐
│                  Firebase Hosting                     │
│  - SPA hosting                                        │
│  - Redirects configured                              │
│  - Headers for CORS                                   │
└────────────────────────────────────────────────────────┘
```

### Backend Deployment

```
┌────────────────────────────────────────────────────────┐
│              Google Cloud Platform                   │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ Cloud       │  │ Cloud       │                     │
│  │ Functions V2│  │ SQL (Postgre)│                     │
│  └─────────────┘  └─────────────┘                     │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ Cloud       │  │ Cloud       │                     │
│  │ Storage     │  │ Secret      │                     │
│  └─────────────┘  │ Manager    │                     │
│                     └─────────────┘                     │
└────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests (Vitest)

**Target:** 70% coverage threshold.
Focus on validators, formatters and UI components.

### E2E Tests (Playwright)

**Critical Flows:**
1. Authentication Flow
2. Patient Management (CRUD)
3. Appointment Scheduling (Grid interaction)
4. Clinical Documentation (SOAP)
5. Accessibility (WCAG 2.1 AA)

---

**Last Updated:** 2026-02-10
**Version:** 3.0.0