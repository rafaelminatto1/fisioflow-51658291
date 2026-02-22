# FisioFlow Product Overview

FisioFlow is a comprehensive clinic management system for physiotherapy practices, built with modern web technologies and Firebase backend infrastructure.

## Core Purpose

A complete digital solution for physiotherapy clinics that handles patient management, appointment scheduling, electronic medical records (SOAP), exercise prescription, financial tracking, and clinical analytics.

## Key Features

- **Patient Management**: Complete patient lifecycle with LGPD compliance, medical history, document uploads, and progress tracking
- **Appointment System**: Advanced calendar with conflict detection, recurring appointments, WhatsApp notifications, and Google Calendar sync
- **Electronic Medical Records**: SOAP notes with digital signatures, audit trails, and treatment session tracking
- **Exercise Library**: Comprehensive exercise database with video support, prescription workflows, and progress monitoring
- **Financial Management**: Transaction tracking, payment processing (Stripe), vouchers, and financial reporting
- **Analytics & Reports**: Real-time dashboards, patient retention metrics, clinic performance analytics
- **AI Features**: Exercise recommendations (Gemini AI), SOAP generation, clinical analysis, movement analysis
- **Multi-tenant**: Organization-based isolation with role-based access control (RBAC)

## User Roles

- **Admin**: Full system access, user management, financial reports
- **Fisioterapeuta**: Patient management, exercise prescription, SOAP records
- **Estagiário**: Limited patient access, protocol viewing
- **Recepcionista**: Appointment scheduling, reception tasks
- **Paciente**: Self-service portal with exercise access and appointment history

## Target Users

Brazilian physiotherapy clinics seeking to digitize operations, improve patient care quality, and maintain regulatory compliance (LGPD).

## Platform

- **Web Application**: React SPA hosted on Firebase Hosting
- **Mobile Apps**: React Native (iOS/Android) with Expo and Capacitor
- **Backend**: Firebase Cloud Functions (serverless)
- **Database**: Cloud SQL (PostgreSQL) + Firestore for real-time features
