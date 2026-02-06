/**
 * Lazy loaded routes para otimização de performance
 * Reduz o bundle inicial e melhora o tempo de carregamento
 */

// Páginas principais (eager load)

import { lazy } from 'react';

export { default as Index } from '@/pages/Index';
export { default as Auth } from '@/pages/Auth';

// Páginas lazy loaded por categoria
export const Schedule = lazy(() => import('@/pages/Schedule'));
export const Patients = lazy(() => import('@/pages/Patients'));
export const PatientEvolution = lazy(() => import('@/pages/PatientEvolution'));
export const MedicalRecord = lazy(() => import('@/pages/MedicalRecord'));

// Gestão de Eventos
export const Eventos = lazy(() => import('@/pages/Eventos'));
export const EventoDetalhes = lazy(() => import('@/pages/EventoDetalhes'));
export const EventosAnalytics = lazy(() => import('@/pages/EventosAnalytics'));

// Exercícios e Fisioterapia
export const Exercises = lazy(() => import('@/pages/Exercises'));
export const ExerciseLibraryExpanded = lazy(() => import('@/pages/ExerciseLibraryExpanded'));
export const PhysiotherapyHub = lazy(() => import('@/pages/PhysiotherapyHub'));
export const Biofeedback = lazy(() => import('@/pages/Biofeedback'));

// Financeiro
export const Financial = lazy(() => import('@/pages/Financial'));
export const Vouchers = lazy(() => import('@/pages/Vouchers'));

// Comunicação
export const Communications = lazy(() => import('@/pages/Communications'));
export const Telemedicine = lazy(() => import('@/pages/Telemedicine'));

// Inteligência Artificial
export const SmartAI = lazy(() => import('@/pages/SmartAI'));

// Relatórios e Analytics
export const Reports = lazy(() => import('@/pages/Reports'));
export const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
export const SecurityMonitoring = lazy(() => import('@/pages/SecurityMonitoring'));

// Administração
export const AdminCRUD = lazy(() => import('@/pages/AdminCRUD'));
export const UserManagement = lazy(() => import('@/pages/UserManagement'));
export const OrganizationSettings = lazy(() => import('@/pages/OrganizationSettings'));
export const InvitationManagement = lazy(() => import('@/pages/InvitationManagement'));

// Configurações
export const Settings = lazy(() => import('@/pages/Settings'));
export const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));

// Outros
export const Partner = lazy(() => import('@/pages/Partner'));
export const Welcome = lazy(() => import('@/pages/Welcome'));
export const Install = lazy(() => import('@/pages/Install'));
export const NotFound = lazy(() => import('@/pages/NotFound'));

// Páginas de desenvolvimento/teste (menor prioridade)
export const FileUploadTest = lazy(() => import('@/pages/FileUploadTest'));
