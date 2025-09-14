import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { logger } from '@/lib/errors/logger';
import { notificationManager } from '@/lib/services/NotificationManager';

// Lazy load pages for better performance
const Welcome = lazy(() => import("./pages/Welcome"));
const Index = lazy(() => import("./pages/Index"));
const Patients = lazy(() => import("./pages/Patients"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Financial = lazy(() => import("./pages/Financial"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile").then(module => ({ default: module.Profile })));
const MedicalRecord = lazy(() => import("./pages/MedicalRecord"));
const SmartAI = lazy(() => import("./pages/SmartAI"));
const Communications = lazy(() => import("./pages/Communications"));
const Partner = lazy(() => import("./pages/Partner"));
const Vouchers = lazy(() => import("./pages/Vouchers"));
const FileUploadTest = lazy(() => import("./pages/FileUploadTest"));

const AdvancedAnalytics = lazy(() => import("./components/analytics/AdvancedAnalytics"));
const MedicalChatbot = lazy(() => import("./components/chatbot/MedicalChatbot"));
const ComputerVisionExercise = lazy(() => import("./components/computer-vision/ComputerVisionExercise"));
const IntelligentReports = lazy(() => import("./components/reports/IntelligentReports"));
const AugmentedRealityExercise = lazy(() => import("./components/ar/AugmentedRealityExercise"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Create a client with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        logger.warn('Query retry', { failureCount, error }, 'QueryClient');
        return failureCount < 3;
      },
    },
  },
});

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    logger.info('Aplicação iniciada', { timestamp: new Date().toISOString() }, 'App');
    
    // Initialize notification system
    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
        logger.info('Sistema de notificações inicializado', {}, 'App');
      } catch (error) {
        logger.error('Falha ao inicializar sistema de notificações', error, 'App');
      }
    };
    
    initNotifications();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <DataProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  {/* Welcome page - public */}
                  <Route path="/welcome" element={<Welcome />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
                  <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                  <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
                  <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/medical-record" element={<ProtectedRoute><MedicalRecord /></ProtectedRoute>} />
                  <Route path="/smart-ai" element={<ProtectedRoute><SmartAI /></ProtectedRoute>} />
                  <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
                  <Route path="/partner" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
                  <Route path="/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
                  <Route path="/file-upload-test" element={<ProtectedRoute><FileUploadTest /></ProtectedRoute>} />
                  
                  <Route path="/analytics" element={<ProtectedRoute><AdvancedAnalytics /></ProtectedRoute>} />
                  <Route path="/chatbot" element={<ProtectedRoute><MedicalChatbot userId="current-user" /></ProtectedRoute>} />
                  <Route path="/computer-vision" element={<ProtectedRoute><ComputerVisionExercise patientId="current-patient" /></ProtectedRoute>} />
                  <Route path="/intelligent-reports" element={<ProtectedRoute><IntelligentReports userId="current-user" /></ProtectedRoute>} />
                  <Route path="/augmented-reality" element={<ProtectedRoute><AugmentedRealityExercise patientId="current-patient" /></ProtectedRoute>} />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            </DataProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
