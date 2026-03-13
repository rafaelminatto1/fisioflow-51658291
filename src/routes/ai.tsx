/**
 * FisioFlow - Rotas de Inteligência Artificial
 * @module routes/ai
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// Lazy loads - AI Features
const SmartDashboard = lazy(() => import(/* webpackChunkName: "smart-dashboard" */ "@/pages/SmartDashboard"));
const SmartAI = lazy(() => import(/* webpackChunkName: "ai-smart" */ "@/pages/SmartAI"));
const ClinicalAnalysisPage = lazy(() => import(/* webpackChunkName: "ai-clinical" */ "@/pages/ai/ClinicalAnalysisPage"));
const MovementLabPage = lazy(() => import(/* webpackChunkName: "ai-movement" */ "@/pages/ai/MovementLabPage"));
const DocumentScannerPage = lazy(() => import(/* webpackChunkName: "ai-scanner" */ "@/pages/ai/DocumentScannerPage"));
const ActivityLabPage = lazy(() => import(/* webpackChunkName: "ai-activity-lab" */ "@/pages/ai/ActivityLabPage"));
const MedicalChatbot = lazy(() => import(/* webpackChunkName: "ai-chatbot" */ "@/components/chatbot/MedicalChatbot"));
const ComputerVisionExercise = lazy(() => import(/* webpackChunkName: "ai-computer-vision" */ "@/components/computer-vision/ComputerVisionExercise"));
const IntelligentReports = lazy(() => import(/* webpackChunkName: "ai-intelligent-reports" */ "@/components/reports/IntelligentReports"));
const AugmentedRealityExercise = lazy(() => import(/* webpackChunkName: "ai-ar" */ "@/components/ar/AugmentedRealityExercise"));

// Image Analysis
const ImageAnalysisDashboard = lazy(() => import(/* webpackChunkName: "analysis-images" */ "@/components/analysis/dashboard/ImageAnalysisDashboard"));
const DynamicCompareDetailsPage = lazy(() => import(/* webpackChunkName: "analysis-dynamic" */ "@/pages/dashboard/dinamica/DynamicCompareDetailsPage"));

export const aiRoutes = (
  <>
    {/* Smart Dashboard */}
    <Route path="/smart-dashboard" element={<ProtectedRoute><SmartDashboard /></ProtectedRoute>} />
    <Route path="/smart-ai" element={<ProtectedRoute><SmartAI /></ProtectedRoute>} />
    
    {/* Google AI Suite */}
    <Route path="/ai/clinical" element={<ProtectedRoute><ClinicalAnalysisPage /></ProtectedRoute>} />
    <Route path="/ai/movement" element={<ProtectedRoute><MovementLabPage /></ProtectedRoute>} />
    <Route path="/ai/scanner" element={<ProtectedRoute><DocumentScannerPage /></ProtectedRoute>} />
    <Route path="/ai/activity-lab" element={<ProtectedRoute><ActivityLabPage /></ProtectedRoute>} />
    
    {/* AI Tools */}
    <Route path="/chatbot" element={<ProtectedRoute><MainLayout><MedicalChatbot userId="system" /></MainLayout></ProtectedRoute>} />
    <Route path="/computer-vision/:patientId?" element={<ProtectedRoute><MainLayout><ComputerVisionExercise /></MainLayout></ProtectedRoute>} />
    <Route path="/intelligent-reports/:patientId" element={<ProtectedRoute><MainLayout><IntelligentReports patientId="" patientName="" /></MainLayout></ProtectedRoute>} />
    <Route path="/augmented-reality/:patientId?" element={<ProtectedRoute><MainLayout><AugmentedRealityExercise /></MainLayout></ProtectedRoute>} />
    
    {/* Image Analysis Module (NeuroPose) */}
    <Route path="/dashboard/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
    <Route path="/pacientes/:id/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
    <Route path="/dashboard/dinamica/:id" element={<ProtectedRoute><DynamicCompareDetailsPage /></ProtectedRoute>} />
  </>
);