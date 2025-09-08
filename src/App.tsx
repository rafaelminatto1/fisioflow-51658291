import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

// Auth pages
import Welcome from "./pages/Welcome";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Protected pages
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientNew from "./pages/patients/PatientNew";
import PatientProfile from "./pages/patients/PatientProfile";
import PatientRecords from "./pages/patients/PatientRecords";
import Schedule from "./pages/Schedule";
import Exercises from "./pages/Exercises";
import Financial from "./pages/Financial";
import Reports from "./pages/Reports";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import ReportsLibrary from "./pages/reports/ReportsLibrary";
import Settings from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { MedicalRecord } from "./pages/MedicalRecord";
import SmartAI from "./pages/SmartAI";
import { SmartExercisePlans } from "./pages/SmartExercisePlans";
import Communications from "./pages/Communications";
import Partner from "./pages/Partner";
import Vouchers from "./pages/Vouchers";
import FileUploadTest from "./pages/FileUploadTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DataProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Welcome page - public */}
              <Route path="/welcome" element={<Welcome />} />
              
              {/* Auth routes - public */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
              <Route path="/patients/new" element={<ProtectedRoute><PatientNew /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
              <Route path="/patients/:id/records" element={<ProtectedRoute><PatientRecords /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
              <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsLibrary /></ProtectedRoute>} />
              <Route path="/reports/old" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/medical-record" element={<ProtectedRoute><MedicalRecord /></ProtectedRoute>} />
              <Route path="/smart-ai" element={<ProtectedRoute><SmartAI /></ProtectedRoute>} />
              <Route path="/smart-plans" element={<ProtectedRoute><SmartExercisePlans /></ProtectedRoute>} />
              <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
              <Route path="/partner" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
              <Route path="/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
              <Route path="/file-upload-test" element={<ProtectedRoute><FileUploadTest /></ProtectedRoute>} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
