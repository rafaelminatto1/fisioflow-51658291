import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import fisioflowLogo from '@/assets/logo.avif';
import { Button } from '@/components/ui/button';
import { useNavPreload } from '@/hooks/useIntelligentPreload';
import { useToast } from '@/hooks/use-toast';
import { TAREFAS_QUERY_KEY, fetchTarefas } from '@/hooks/useTarefas';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  FileText,
  MessageSquare,
  Clock,
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
  Trophy,
  ScanFace,
  Footprints,
  Image as ImageIcon,
  Mail,
  Database,
  ShoppingCart,
  Package,
  Video,
  Link2,
  LinkIcon,
  Layers,
  Brain,
  Shield,
  Gift,
  Flame,
  Receipt,
  BookOpen,
  Zap,
  Plug,
  FlaskConical,
  UserCircle,
  UserCheck,
  MoreHorizontal,
  Star,
  Calculator,
  CheckCircle2,
  Film,
  Search,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { Progress } from '@/components/ui/progress';
import { getFirebaseAuth } from '@/integrations/firebase/app';
import { signOut } from 'firebase/auth';

const GamificationMiniProfile = ({ collapsed }: { collapsed: boolean }) => {
  const { profile: authProfile } = useAuth();
  const isPatientContext = authProfile?.role === 'paciente' || authProfile?.role === 'patient';
  const patientId = isPatientContext ? authProfile?.id || '' : '';
  const { currentLevel, progressPercentage, currentXp, xpPerLevel } = useGamification(patientId);

  if (!isPatientContext) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-1 group cursor-help transition-all duration-300">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shadow-premium-sm group-hover:shadow-premium-md group-hover:scale-110 transition-all duration-500">
          L{currentLevel}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 my-4 p-4 rounded-[1.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-border/40 shadow-premium-sm hover:shadow-premium-md transition-all duration-500 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400/5 rounded-full blur-2xl group-hover:bg-yellow-400/10 transition-colors" />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-transform duration-500">
            <Trophy className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Nível</span>
            <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{currentLevel}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">XP</span>
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{currentXp}/{xpPerLevel}</span>
        </div>
      </div>
      <div className="relative z-10">
        <Progress value={progressPercentage} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
};

// Ordem baseada em frequência de uso e fluxo de trabalho clínico
const menuItems = [
  // NÚCLEO DO NEGÓCIO - Usado diariamente
  { icon: Calendar, label: 'Agenda', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Pacientes', href: '/patients' },

  // CLÍNICA DIÁRIA - Fluxo principal de atendimento
  { icon: Activity, label: 'Exercícios', href: '/exercises' },
  { icon: Target, label: 'Protocolos', href: '/protocols' },

  // GESTÃO E OPERAÇÕES
  { icon: MessageSquare, label: 'Comunicação', href: '/communications' },
  { icon: Clock, label: 'Lista de Espera', href: '/waitlist' },
  { icon: LayoutGrid, label: 'Tarefas', href: '/tarefas', preload: () => import('@/pages/Tarefas') },
  { icon: Sparkles, label: 'Tarefas V2', href: '/tarefas-v2', preload: () => import('@/pages/TarefasV2') },
];

const avaliacoesSubmenu = [
  { icon: ScanFace, label: 'Avaliação Postural', href: '/dashboard/imagens?mode=clinical_posture' },
  { icon: ImageIcon, label: 'Avaliação de Imagem', href: '/dashboard/imagens' },
  { icon: Footprints, label: 'Avaliação de Marcha', href: '/dashboard/imagens?mode=dynamic_demo' },
];

const operacionaisSubmenu = [
  { icon: CalendarDays, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos/Vouchers', href: '/vouchers' },
  { icon: Package, label: 'Estoque', href: '/inventory' },
  { icon: Video, label: 'Telemedicina', href: '/telemedicine' },
  { icon: LinkIcon, label: 'Pré-Cadastro', href: '/pre-cadastro-admin' },
];

const cadastrosSubmenu = [
  { icon: FileText, label: 'Serviços', href: '/cadastros/servicos' },
  { icon: Stethoscope, label: 'Médicos', href: '/cadastros/medicos' },
  { icon: UserCheck, label: 'Contratados', href: '/cadastros/contratados' },
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
  { icon: Receipt, label: 'NFSe', href: '/financeiro/nfse' },
  { icon: Receipt, label: 'Recibos', href: '/financeiro/recibos' },
  { icon: FileText, label: 'Demonstrativo', href: '/financeiro/demonstrativo' },
];

const relatoriosSubmenu = [
  { icon: BarChart3, label: 'Dashboard', href: '/reports' },
  { icon: Users, label: 'Aniversariantes', href: '/relatorios/aniversariantes' },
  { icon: TrendingUp, label: 'Taxa de Comparecimento', href: '/relatorios/comparecimento' },
  { icon: Trophy, label: 'Performance da Equipe', href: '/performance-equipe' },
  { icon: Stethoscope, label: 'Relatório Médico', href: '/relatorios/medico' },
  { icon: FileText, label: 'Relatório Convênio', href: '/relatorios/convenio' },
];

const crmSubmenu = [
  { icon: LayoutGrid, label: 'Dashboard CRM', href: '/crm' },
  { icon: Users, label: 'Leads', href: '/crm/leads' },
  { icon: Mail, label: 'Campanhas', href: '/crm/campanhas' },
];

const marketingSubmenu = [
  { icon: BarChart3, label: 'Dashboard', href: '/marketing/dashboard' },
  { icon: Star, label: 'Avaliações Google', href: '/marketing/reviews' },
  { icon: Search, label: 'Rastreador SEO', href: '/marketing/seo' },
  { icon: Calendar, label: 'Calendário de Conteúdo', href: '/marketing/calendar' },
  { icon: Sparkles, label: 'Gerador de Conteúdo', href: '/marketing/content-generator' },
  { icon: ImageIcon, label: 'Antes e Depois', href: '/marketing/before-after' },
  { icon: Film, label: 'Timelapse Evolução', href: '/marketing/timelapse' },
  { icon: MessageSquare, label: 'Scripts WhatsApp', href: '/marketing/whatsapp' },
  { icon: Video, label: 'Exportações', href: '/marketing/exports' },
  { icon: Users, label: 'Programa de Indicação', href: '/marketing/referral' },
  { icon: Link2, label: 'FisioLink', href: '/marketing/fisiolink' },
  { icon: Calculator, label: 'Calculadora ROI', href: '/marketing/roi' },
  { icon: CheckCircle2, label: 'Mito vs Verdade', href: '/marketing/myth-truth' },
  { icon: Trophy, label: 'Gamificação Adesão', href: '/marketing/gamification' },
  { icon: Settings, label: 'Configurações', href: '/marketing/settings' },
];

const configuracoesSubmenu = [
  { icon: Settings, label: 'Geral', href: '/settings' },
  { icon: Calendar, label: 'Google Calendar', href: '/configuracoes/calendario' },
  { icon: LinkIcon, label: 'Integrações Google', href: '/integrations' },
];

const dashboardIaSubmenu = [
  { icon: Sparkles, label: 'Dashboard IA', href: '/smart-dashboard' },
  { icon: Brain, label: 'Planos IA', href: '/smart-ai' },
  { icon: BarChart3, label: 'Analytics Avançado', href: '/analytics' },
];

const googleAiSubmenu = [
  { icon: Brain, label: 'IA Clínica (Genkit)', href: '/ai/clinical' },
  { icon: Video, label: 'Lab Movimento (Vision)', href: '/ai/movement' },
  { icon: FileText, label: 'Scanner Laudos', href: '/ai/scanner' },
  { icon: Activity, label: 'Activity Lab', href: '/ai/activity-lab' },
];

const adminSubmenu = [
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Users, label: 'Usuários', href: '/admin/users' },
  { icon: Shield, label: 'Segurança', href: '/admin/security' },
  { icon: FileText, label: 'Logs de Auditoria', href: '/admin/audit-logs' },
  { icon: Mail, label: 'Convites', href: '/admin/invitations' },
  { icon: Building2, label: 'Organização', href: '/admin/organization' },
  { icon: Database, label: 'CRUD Admin', href: '/admin/crud' },
  { icon: Users, label: 'Cohorts', href: '/admin/cohorts' },
  { icon: Target, label: 'Metas', href: '/admin/goals' },
  { icon: Trophy, label: 'Gamificação', href: '/admin/gamification' },
];

const gamificacaoSubmenu = [
  { icon: BarChart3, label: 'Dashboard', href: '/gamification' },
  { icon: Trophy, label: 'Minhas Conquistas', href: '/gamification/achievements' },
  { icon: Target, label: 'Missões Diárias', href: '/gamification/quests' },
  { icon: Gift, label: 'Loja de Recompensas', href: '/gamification/shop' },
  { icon: Flame, label: 'Ranking', href: '/gamification/leaderboard' },
];

const maisSubmenu = [
  { icon: UserCircle, label: 'Portal Paciente', href: '/portal' },
  { icon: BarChart3, label: 'Ocupação', href: '/ocupacao-fisioterapeutas' },
  { icon: FlaskConical, label: 'Testes Clínicos', href: '/clinical-tests' },
  { icon: BookOpen, label: 'Wiki', href: '/wiki' },
  { icon: Clock, label: 'Time Tracking', href: '/timetracking' },
  { icon: Zap, label: 'Automação', href: '/automation' },
  { icon: Plug, label: 'Integrações', href: '/integrations' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [avaliacoesOpen, setAvaliacoesOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [configuracoesOpen, setConfiguracoesOpen] = useState(false);
  const [dashboardIaOpen, setDashboardIaOpen] = useState(false);
  const [googleAiOpen, setGoogleAiOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [operacionaisOpen, setOperacionaisOpen] = useState(false);
  const [gamificacaoOpen, setGamificacaoOpen] = useState(false);
  const [maisOpen, setMaisOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useNavPreload();

  const isCadastrosActive = location.pathname.startsWith('/cadastros');
  const isAvaliacoesActive = location.pathname.startsWith('/dashboard/imagens');
  const isFinanceiroActive = location.pathname.startsWith('/financeiro') || location.pathname === '/financial';
  const isRelatoriosActive = location.pathname.startsWith('/relatorios') || location.pathname === '/reports';
  const isCrmActive = location.pathname.startsWith('/crm');
  const isConfiguracoesActive = location.pathname.startsWith('/configuracoes') || location.pathname === '/settings';
  const isDashboardIaActive = location.pathname.startsWith('/smart-dashboard') || location.pathname.startsWith('/smart-ai') || location.pathname === '/analytics';
  const isGoogleAiActive = location.pathname.startsWith('/ai/');
  const isAdminActive = location.pathname.startsWith('/admin');
  const isOperacionaisActive = location.pathname.startsWith('/eventos') || location.pathname === '/vouchers' || location.pathname === '/inventory' || location.pathname === '/telemedicine' || location.pathname === '/pre-cadastro-admin';
  const isGamificacaoActive = location.pathname.startsWith('/gamification');
  const isMarketingActive = location.pathname.startsWith('/marketing');
  const isMaisActive = location.pathname === '/portal' || location.pathname === '/ocupacao-fisioterapeutas' || location.pathname === '/clinical-tests' || location.pathname.startsWith('/wiki') || location.pathname === '/timetracking' || location.pathname === '/automation' || location.pathname === '/integrations';

  const renderMenuItem = (item: { icon: React.ComponentType<{ className?: string }>; label: string; href: string; preload?: () => void | Promise<unknown> }, collapsed: boolean, location: { pathname: string }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    const handleMouseEnter = () => {
      item.preload?.();
      if (item.href === '/tarefas' || item.href === '/tarefas-v2') {
        queryClient.prefetchQuery({ queryKey: TAREFAS_QUERY_KEY, queryFn: fetchTarefas });
      }
    };

    return (
      <Link
        key={item.href}
        to={item.href}
        onMouseEnter={handleMouseEnter}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          "flex items-center gap-3 rounded-2xl transition-all duration-500 group relative overflow-hidden",
          collapsed ? "justify-center px-2 py-3.5" : "px-4 py-3",
          isActive
            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-premium-md"
            : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
        )}
      >
        <Icon className={cn(
          "h-5 w-5 transition-all duration-500 flex-shrink-0 relative z-10",
          isActive ? "scale-110" : "group-hover:scale-110 group-hover:rotate-3 group-hover:text-primary"
        )} />
        {!collapsed && <span className="text-xs font-bold uppercase tracking-widest relative z-10">{item.label}</span>}
        
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.8)]" />
        )}
      </Link>
    );
  };

  const renderSubmenu = ({
    icon,
    label,
    items,
    isOpen,
    onOpenChange,
    isActive,
    collapsed,
    location
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    items: Array<{ icon?: React.ComponentType<{ className?: string }>; label: string; href: string }>;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isActive: boolean;
    collapsed: boolean;
    location: { pathname: string; search?: string };
  }) => {
    const Icon = icon;

    if (collapsed) {
      return (
        <Link
          to={items[0]?.href || '#'}
          aria-label={label}
          className={cn(
            "flex items-center justify-center px-2 py-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden",
            isActive
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-premium-md"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-white"
          )}
        >
          <Icon className="h-5 w-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 relative z-10" />
          {isActive && (
            <div className="absolute left-0 w-1.5 h-8 bg-primary rounded-r-full" />
          )}
        </Link>
      );
    }

    return (
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Fechar menu ${label}` : `Abrir menu ${label}`}
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-500 group relative overflow-hidden",
              isActive
                ? "bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-white font-black"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
            )}
          >
            <div className="flex items-center gap-3 relative z-10">
              <Icon className={cn(
                "h-5 w-5 transition-all duration-500",
                isActive ? "text-primary scale-110" : "group-hover:scale-110 group-hover:text-primary"
              )} />
              <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform duration-500 flex-shrink-0 relative z-10",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-12 space-y-1.5 mt-1.5 animate-slide-up-fade">
          {items.map((item, index) => {
            const isSubActive = location.pathname === item.href ||
              (location.pathname + location.search === item.href) ||
              (item.href === '/dashboard/imagens' && location.pathname === '/dashboard/imagens' && !location.search);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "block px-3 py-2.5 rounded-xl text-[11px] transition-all duration-300 relative overflow-hidden group font-bold uppercase tracking-tighter",
                  isSubActive
                    ? "bg-primary/10 text-primary font-black shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white hover:pl-5"
                )}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                <span className="relative z-10">{item.label}</span>
                {isSubActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      toast({ title: 'Logout realizado', description: 'Até breve!' });
      navigate('/auth');
    } catch (error) {
      toast({ title: 'Erro ao sair', description: error?.message || 'Ocorreu um erro', variant: 'destructive' });
    }
  };

  return (
    <div className={cn(
      "hidden md:flex bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-border/40 transition-all duration-500 ease-in-out flex-col h-screen sticky top-0 shadow-premium-lg z-50",
      collapsed ? "w-[84px]" : "w-[240px]"
    )}>
      {/* Header */}
      <div className={cn("shrink-0 p-5 relative", collapsed ? "flex justify-center" : "")}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-3 group transition-transform duration-500 hover:scale-105">
            <img src={fisioflowLogo} alt="FisioFlow" className={cn("h-8 w-auto transition-all", collapsed ? "h-10" : "")} />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-[0.2em] text-slate-900 dark:text-white">FISIOFLOW</span>
                <span className="text-[8px] font-black tracking-widest text-primary uppercase">Elite Suite</span>
              </div>
            )}
          </Link>
          
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white dark:bg-slate-900 shadow-premium-md border border-border/40 z-50 hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav id="main-navigation" className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll px-3 py-4 space-y-1">
        <style>{`
          .sidebar-scroll::-webkit-scrollbar { width: 3px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border) / 0.3); border-radius: 10px; }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.5); }
        `}</style>

        {/* Categories with divider lines */}
        <div className="space-y-4">
          {/* NÚCLEO */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-4 py-2">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Núcleo</span>
              </div>
            )}
            {menuItems.slice(0, 3).map((item) => renderMenuItem(item, collapsed, location))}
          </div>

          <div className="space-y-1 pt-2">
            {!collapsed && (
              <div className="px-4 py-2 border-t border-border/30">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2 block">Clínica</span>
              </div>
            )}
            {menuItems.slice(3, 6).map((item) => renderMenuItem(item, collapsed, location))}
            
            {renderSubmenu({
              icon: ScanFace,
              label: 'Avaliações',
              items: avaliacoesSubmenu,
              isOpen: avaliacoesOpen || isAvaliacoesActive,
              onOpenChange: setAvaliacoesOpen,
              isActive: isAvaliacoesActive,
              collapsed,
              location
            })}
          </div>

          <div className="space-y-1 pt-2">
            {!collapsed && (
              <div className="px-4 py-2 border-t border-border/30">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2 block">Gestão</span>
              </div>
            )}
            {menuItems.slice(6).map((item) => renderMenuItem(item, collapsed, location))}
            
            {renderSubmenu({
              icon: Star,
              label: 'Marketing',
              items: marketingSubmenu,
              isOpen: marketingOpen || isMarketingActive,
              onOpenChange: setMarketingOpen,
              isActive: isMarketingActive,
              collapsed,
              location
            })}
            
            {renderSubmenu({
              icon: DollarSign,
              label: 'Financeiro',
              items: financeiroSubmenu,
              isOpen: financeiroOpen || isFinanceiroActive,
              onOpenChange: setFinanceiroOpen,
              isActive: isFinanceiroActive,
              collapsed,
              location
            })}
          </div>

          <div className="space-y-1 pt-2">
            {!collapsed && (
              <div className="px-4 py-2 border-t border-border/30">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2 block">Inteligência</span>
              </div>
            )}
            {renderSubmenu({
              icon: Sparkles,
              label: 'Dashboard IA',
              items: dashboardIaSubmenu,
              isOpen: dashboardIaOpen || isDashboardIaActive,
              onOpenChange: setDashboardIaOpen,
              isActive: isDashboardIaActive,
              collapsed,
              location
            })}
            
            {renderSubmenu({
              icon: Brain,
              label: 'Google AI',
              items: googleAiSubmenu,
              isOpen: googleAiOpen || isGoogleAiActive,
              onOpenChange: setGoogleAiOpen,
              isActive: isGoogleAiActive,
              collapsed,
              location
            })}
          </div>

          <div className="space-y-1 pt-2">
            {!collapsed && (
              <div className="px-4 py-2 border-t border-border/30">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2 block">Avançado</span>
              </div>
            )}
            {renderSubmenu({
              icon: Settings,
              label: 'Admin',
              items: adminSubmenu,
              isOpen: adminOpen || isAdminActive,
              onOpenChange: setAdminOpen,
              isActive: isAdminActive,
              collapsed,
              location
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3 flex flex-col gap-2">
        <GamificationMiniProfile collapsed={collapsed} />
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all duration-300 group overflow-hidden",
            collapsed ? "px-0 justify-center h-12" : "px-4 py-6"
          )}
        >
          <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="text-xs font-black uppercase tracking-widest">Sair do Sistema</span>}
        </Button>
      </div>
    </div>
  );
}
