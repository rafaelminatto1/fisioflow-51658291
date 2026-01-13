import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavPreload } from '@/hooks/useIntelligentPreload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  FileText,
  Brain,
  MessageSquare,
  ShoppingCart,
  Clock,
  Shield,
  Lock,
  LogOut,
  LayoutGrid,
  ClipboardList,
  ChevronDown,
  Building2,
  CalendarOff,
  FileCheck,
  FileSignature,
  Target,
  TrendingUp,
  Sparkles,
  Package,
  Trophy,
  Video,
  LinkIcon,
  ScanFace,
  Footprints,
  Image as ImageIcon
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: TrendingUp, label: 'Ocupação', href: '/ocupacao-fisioterapeutas' },
  { icon: Sparkles, label: 'Dashboard IA', href: '/smart-dashboard' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
  { icon: Target, label: 'Protocolos', href: '/protocols' },
  { icon: FileText, label: 'Prontuário', href: '/medical-record' },
  { icon: Brain, label: 'Planos IA', href: '/smart-ai' },
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: LayoutGrid, label: 'Tarefas', href: '/tarefas' },
  { icon: Clock, label: 'Lista de Espera', href: '/waitlist' },
  { icon: Calendar, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos', href: '/vouchers' },
  { icon: Package, label: 'Estoque', href: '/inventory' },
  { icon: Trophy, label: 'Gamificação', href: '/gamification' },
  { icon: Video, label: 'Telemedicina', href: '/telemedicine' },
  { icon: LinkIcon, label: 'Pré-Cadastro', href: '/pre-cadastro-admin' },
  { icon: BarChart3, label: 'Analytics Avançado', href: '/analytics' },
  { icon: Lock, label: 'Segurança & LGPD', href: '/security-settings' },
  { icon: Shield, label: 'Monitoramento', href: '/security-monitoring' },
];

const avaliacoesSubmenu = [
  { icon: ScanFace, label: 'Avaliação Postural', href: '/dashboard/imagens?mode=clinical_posture' },
  { icon: ImageIcon, label: 'Avaliação de Imagem', href: '/dashboard/imagens' },
  { icon: Footprints, label: 'Avaliação de Marcha', href: '/dashboard/imagens?mode=dynamic_demo' },
];



const cadastrosSubmenu = [
  { icon: FileText, label: 'Serviços', href: '/cadastros/servicos' },
  { icon: Building2, label: 'Fornecedores', href: '/cadastros/fornecedores' },
  { icon: CalendarOff, label: 'Feriados', href: '/cadastros/feriados' },
  { icon: FileCheck, label: 'Atestados', href: '/cadastros/atestados' },
  { icon: FileSignature, label: 'Contratos', href: '/cadastros/contratos' },
  { icon: FileText, label: 'Templates Evolução', href: '/cadastros/templates-evolucao' },
  { icon: ClipboardList, label: 'Fichas Avaliação', href: '/cadastros/fichas-avaliacao' },
  { icon: Target, label: 'Objetivos', href: '/cadastros/objetivos' },
];

const financeiroSubmenu = [
  { icon: DollarSign, label: 'Dashboard', href: '/financial' },
  { icon: FileText, label: 'Contas', href: '/financeiro/contas' },
  { icon: TrendingUp, label: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa' },
];

const relatoriosSubmenu = [
  { icon: BarChart3, label: 'Dashboard', href: '/reports' },
  { icon: Users, label: 'Aniversariantes', href: '/relatorios/aniversariantes' },
  { icon: TrendingUp, label: 'Taxa de Comparecimento', href: '/relatorios/comparecimento' },
  { icon: Trophy, label: 'Performance da Equipe', href: '/performance-equipe' },
];

const crmSubmenu = [
  { icon: LayoutGrid, label: 'Dashboard CRM', href: '/crm' },
  { icon: Users, label: 'Leads', href: '/crm/leads' },
];

const configuracoesSubmenu = [
  { icon: Settings, label: 'Geral', href: '/settings' },
  { icon: Calendar, label: 'Google Calendar', href: '/configuracoes/calendario' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [avaliacoesOpen, setAvaliacoesOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [configuracoesOpen, setConfiguracoesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  useNavPreload();

  const isCadastrosActive = location.pathname.startsWith('/cadastros');
  const isAvaliacoesActive = location.pathname.startsWith('/dashboard/imagens');
  const isFinanceiroActive = location.pathname.startsWith('/financeiro') || location.pathname === '/financial';
  const isRelatoriosActive = location.pathname.startsWith('/relatorios') || location.pathname === '/reports';
  const isCrmActive = location.pathname.startsWith('/crm');
  const isConfiguracoesActive = location.pathname.startsWith('/configuracoes') || location.pathname === '/settings';

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logout realizado',
        description: 'Até breve!',
      });
      navigate('/auth');
    }
  };

  return (
    <div className={cn(
      "hidden md:flex bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 ease-in-out flex-col h-screen sticky top-0 shadow-sm z-50",
      collapsed ? "w-20" : "w-72"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 group overflow-hidden">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105 flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="transition-opacity duration-200">
                <h1 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors duration-200">FisioFlow</h1>
                <p className="text-xs text-muted-foreground font-medium">Gestão Inteligente</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm mx-auto">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("hover:bg-secondary transition-all duration-200 hover:scale-105 active:scale-95", !collapsed && "ml-auto")}
          >
            {collapsed ? <ChevronRight className="w-4 h-4 transition-transform duration-200" /> : <ChevronLeft className="w-4 h-4 transition-transform duration-200" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                !isActive && "group-hover:scale-105"
              )} />
              {!collapsed && <span className="text-sm">{item.label}</span>}
              {collapsed && isActive && (
                <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
              )}
            </Link>
          );
        })}

        {/* Cadastros Submenu */}
        {!collapsed && (
          <Collapsible open={cadastrosOpen || isCadastrosActive} onOpenChange={setCadastrosOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isCadastrosActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-sm">Cadastros</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (cadastrosOpen || isCadastrosActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {cadastrosSubmenu.map((item) => {
                const isSubActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/cadastros/servicos"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isCadastrosActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <ClipboardList className="h-5 w-5" />
            {isCadastrosActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}

        {/* Avaliações Submenu */}
        {!collapsed && (
          <Collapsible open={avaliacoesOpen || isAvaliacoesActive} onOpenChange={setAvaliacoesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isAvaliacoesActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <ScanFace className="h-5 w-5" />
                  <span className="text-sm">Avaliações</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (avaliacoesOpen || isAvaliacoesActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {avaliacoesSubmenu.map((item) => {
                const isSubActive = location.pathname + location.search === item.href || (item.href === '/dashboard/imagens' && location.pathname === '/dashboard/imagens' && !location.search);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/dashboard/imagens"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isAvaliacoesActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <ScanFace className="h-5 w-5" />
            {isAvaliacoesActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}

        {/* Financeiro Submenu */}
        {!collapsed && (
          <Collapsible open={financeiroOpen || isFinanceiroActive} onOpenChange={setFinanceiroOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isFinanceiroActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm">Financeiro</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (financeiroOpen || isFinanceiroActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {financeiroSubmenu.map((item) => {
                const isSubActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/financial"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isFinanceiroActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <DollarSign className="h-5 w-5" />
            {isFinanceiroActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}

        {/* Relatórios Submenu */}
        {!collapsed && (
          <Collapsible open={relatoriosOpen || isRelatoriosActive} onOpenChange={setRelatoriosOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isRelatoriosActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">Relatórios</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (relatoriosOpen || isRelatoriosActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {relatoriosSubmenu.map((item) => {
                const isSubActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/reports"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isRelatoriosActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <BarChart3 className="h-5 w-5" />
            {isRelatoriosActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}

        {/* CRM Submenu */}
        {!collapsed && (
          <Collapsible open={crmOpen || isCrmActive} onOpenChange={setCrmOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isCrmActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm">CRM</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (crmOpen || isCrmActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {crmSubmenu.map((item) => {
                const isSubActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/crm"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isCrmActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <TrendingUp className="h-5 w-5" />
            {isCrmActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}

        {/* Configurações Submenu */}
        {!collapsed && (
          <Collapsible open={configuracoesOpen || isConfiguracoesActive} onOpenChange={setConfiguracoesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group",
                  isConfiguracoesActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Configurações</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  (configuracoesOpen || isConfiguracoesActive) && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8 space-y-1 mt-1">
              {configuracoesSubmenu.map((item) => {
                const isSubActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm transition-all",
                      isSubActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
        {collapsed && (
          <Link
            to="/settings"
            className={cn(
              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all group relative",
              isConfiguracoesActive
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            {isConfiguracoesActive && (
              <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-lg" />
            )}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 px-4 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </div>
  );
}