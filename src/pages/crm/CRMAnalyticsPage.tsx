import React from "react";
import { CRMAnalytics } from "@/components/crm/CRMAnalytics";
import { NPSDashboard } from "@/components/crm/NPSDashboard";
import { ReferralsRanking } from "@/components/crm/ReferralsRanking";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Star, Users } from "lucide-react";

export default function CRMAnalyticsPage() {
  return (
    <div className="h-full w-full animate-in fade-in duration-300 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Analytics & Relatórios
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Acompanhe o desempenho comercial, satisfação dos pacientes e ranking de indicações.
        </p>
      </div>

      <Tabs defaultValue="commercial" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8">
          <TabsTrigger value="commercial" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Comercial
          </TabsTrigger>
          <TabsTrigger value="nps" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            NPS
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Indicações
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="commercial" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CRMAnalytics />
        </TabsContent>
        
        <TabsContent value="nps" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <NPSDashboard />
        </TabsContent>
        
        <TabsContent value="referrals" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ReferralsRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
