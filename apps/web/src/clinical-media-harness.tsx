import "temporal-polyfill/global";
import "../../../src/index.css";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster as Sonner } from "../../../src/components/ui/sonner";
import { TooltipProvider } from "../../../src/components/ui/tooltip";
import { ThemeProvider } from "../../../src/components/ui/theme";
import { RichTextProvider } from "../../../src/contexts/RichTextContext";
import { AuthContext, type AuthContextType } from "../../../src/contexts/AuthContext";
import ClinicalMediaHarness from "../../../src/pages/dev/ClinicalMediaHarness";

const container = document.getElementById("root");
const queryClient = new QueryClient();

const authValue: AuthContextType = {
  user: null,
  profile: null,
  loading: false,
  initialized: true,
  sessionCheckFailed: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, user: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
  refreshProfile: async () => {},
};

if (!container) {
  throw new Error("Elemento root não encontrado para clinical media harness.");
}

createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={authValue}>
      <ThemeProvider>
        <TooltipProvider>
          <RichTextProvider>
            <Sonner />
            <ClinicalMediaHarness />
          </RichTextProvider>
        </TooltipProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  </QueryClientProvider>,
);
