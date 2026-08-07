import React from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { 
  Users, 
  MessageSquare, 
  CheckSquare, 
  Zap, 
  BarChart3, 
  Send 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsAppUnreadCount } from "@/hooks/useWhatsAppUnreadCount";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: "pipeline", label: "Pipeline", path: "/crm/pipeline", icon: Users },
  { id: "inbox", label: "Inbox", path: "/crm/inbox", icon: MessageSquare },
  { id: "tasks", label: "Tarefas", path: "/crm/tasks", icon: CheckSquare },
  { id: "automations", label: "Automações", path: "/crm/automations", icon: Zap },
  { id: "analytics", label: "Analytics", path: "/crm/analytics", icon: BarChart3 },
  { id: "campaigns", label: "Campanhas", path: "/crm/campaigns", icon: Send },
];

export default function CRMLayout() {
  const location = useLocation();
  const unreadCount = useWhatsAppUnreadCount();

  return (
    <PageLayout fillViewport noPadding>
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
        <div className="sticky top-0 z-10 w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="px-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center h-14 space-x-1 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname.startsWith(tab.path);
                
                return (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    className={cn(
                      "relative flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ease-in-out",
                      isActive 
                        ? "text-primary bg-primary/10 shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 mr-2", isActive && "text-primary")} />
                    {tab.label}
                    
                    {tab.id === "inbox" && unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 text-xs animate-in zoom-in"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </PageLayout>
  );
}
