import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavPreload } from '@/hooks/useIntelligentPreload';
import { useToast } from '@/hooks/use-toast';
import { TAREFAS_QUERY_KEY, fetchTarefas } from '@/hooks/useTarefas';

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

// Ordem baseada em frequência de uso e fluxo de trabalho clínico
const menuItems = [
  // NÚCLEO DO NEGÓCIO - Usado diariamente
  { icon: Calendar, label: 'Agenda', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Pacientes', href: '/patients' },

  // CLÍNICA DIÁRIA - Fluxo principal de atendimento
  { icon: FileText, label: 'Prontuário', href: '/medical-record' },
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



// MÓDULOS OPERACIONAIS - Vendas, estoque, eventos e telemedicina
const operacionaisSubmenu = [
  { icon: CalendarDays, label: 'Eventos', href: '/eventos' },
  { icon: ShoppingCart, label: 'Treinos/Vouchers', href: '/vouchers' },
  { icon: Package, label: 'Estoque', href: '/inventory' },
  { icon: Video, label: 'Telemedicina', href: '/telemedicine' },
  { icon: LinkIcon, label: 'Pré-Cadastro', href: '/pre-cadastro-admin' },
];

const cadastrosSubmenu = [
  { icon: FileText, label: 'Serviços', href: '/cadastros/servicos' },
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
  { icon: BarChart3, label: 'BI Avançado (Looker)', href: '/analytics/bi' },
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

// Google AI Suite - Novas ferramentas integradas
const googleAiSubmenu = [
  { icon: Brain, label: 'IA Clínica (Genkit)', href: '/ai/clinical' },
  { icon: Video, label: 'Lab Movimento (Vision)', href: '/ai/movement' },
  { icon: FileText, label: 'Scanner Laudos', href: '/ai/scanner' },
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
  const [googleAiOpen, setGoogleAiOpen] = useState(false); // Novo estado
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
  const isGoogleAiActive = location.pathname.startsWith('/ai/'); // Novo active state
  const isAdminActive = location.pathname.startsWith('/admin');
  const isOperacionaisActive = location.pathname.startsWith('/eventos') || location.pathname === '/vouchers' || location.pathname === '/inventory' || location.pathname === '/telemedicine' || location.pathname === '/pre-cadastro-admin';
  const isGamificacaoActive = location.pathname.startsWith('/gamification');
  const isMarketingActive = location.pathname.startsWith('/marketing');
  const isMaisActive = location.pathname === '/portal' || location.pathname === '/ocupacao-fisioterapeutas' || location.pathname === '/clinical-tests' || location.pathname.startsWith('/wiki') || location.pathname === '/timetracking' || location.pathname === '/automation' || location.pathname === '/integrations';

  // Função auxiliar para renderizar item do menu
  const renderMenuItem = (item: { icon: React.ComponentType<{ className?: string }>; label: string; href: string; preload?: () => void | Promise<unknown> }, collapsed: boolean, location: { pathname: string }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    const handleMouseEnter = () => {
      item.preload?.();
      // Prefetch dados de tarefas ao passar mouse em Tarefas ou Tarefas V2 (melhora velocidade de /tarefas)
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
          "flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
          isActive
            ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/40"
            : "text-muted-foreground hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-foreground"
        )}
      >
        {/* Efeito de ripple no hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

        <Icon className={cn(
          "h-5 w-5 transition-transform duration-200 flex-shrink-0",
          !isActive && "group-hover:scale-110 group-hover:rotate-3"
        )} />
        {!collapsed && <span className="text-sm font-medium tracking-tight relative z-10">{item.label}</span>}
        {collapsed && isActive && (
          <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        )}
        {/* Indicador de brilho no estado ativo */}
        {!collapsed && isActive && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          </>
        )}
      </Link>
    );
  };

  // Função auxiliar para renderizar submenu
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
          className={cn(
            "flex items-center justify-center px-2 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
            isActive
              ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/40"
              : "text-muted-foreground hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-foreground"
          )}
        >
          {/* Efeito de ripple no hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

          <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3" />
          {isActive && (
            <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
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
              "flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 group relative overflow-hidden",
              isActive
                ? "bg-primary/15 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-foreground"
            )}
          >
            {/* Efeito de ripple no hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

            <div className="flex items-center gap-3 relative z-10">
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                !isActive && "group-hover:scale-110 group-hover:rotate-3"
              )} />
              <span className="text-sm font-medium tracking-tight">{label}</span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-300 flex-shrink-0 relative z-10",
              isOpen && "rotate-180"
            )} />
            {/* Indicador de glow no estado ativo */}
            {isActive && (
              <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-11 space-y-0.5 mt-1.5">
          {items.map((item, index) => {
            const isSubActive = location.pathname === item.href ||
              (location.pathname + location.search === item.href) ||
              (item.href === '/dashboard/imagens' && location.pathname === '/dashboard/imagens' && !location.search);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "block px-3 py-1.5 rounded-lg text-sm transition-all duration-200 relative overflow-hidden group",
                  isSubActive
                    ? "bg-primary text-primary-foreground font-medium shadow-md"
                    : "text-muted-foreground hover:bg-slate-50/80 dark:hover:bg-slate-800/50 hover:text-foreground hover:pl-4"
                )}
                style={{ transitionDelay: `${index * 25}ms` }}
              >
                {/* Efeito de ripple no hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-current/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />

                <span className="relative z-10">{item.label}</span>
                {isSubActive && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-lg pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                  </>
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
      const { getFirebaseAuth } = await import('@/integrations/firebase/app');
      const { signOut: signOutFn } = await import('firebase/auth');

      const auth = getFirebaseAuth();
      await signOutFn(auth);

      toast({
        title: 'Logout realizado',
        description: 'Até breve!',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Erro ao sair',
        description: error?.message || 'Ocorreu um erro',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn(
      "hidden md:flex bg-white/95 dark:bg-card/95 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-800/60 transition-all duration-300 ease-in-out flex-col h-screen sticky top-0 shadow-xl z-50",
      collapsed ? "w-[72px]" : "w-[220px]"
    )}>
      {/* Header - Inspirado no shadcn com efeitos melhorados */}
      <div className={cn(
        "border-b border-border/60 shrink-0 bg-gradient-to-b from-background via-background/80 to-background/50 relative",
        collapsed ? "p-3" : "p-3"
      )}>
        {/* Efeito de brilho superior */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 group overflow-hidden">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-blue-500/50 group-hover:scale-105 flex-shrink-0 ring-1 ring-primary/20">
                  <Stethoscope className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                {/* Efeito de glow pulsante */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-transparent blur-md animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl pointer-events-none" />
              </div>
              <div className="transition-all duration-300 min-w-0">
                <h1 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 truncate tracking-tight">FisioFlow</h1>
                <p className="text-[10px] text-muted-foreground/70 font-semibold tracking-[0.2em] uppercase leading-tight">Gestão Inteligente</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative w-10 h-10 mx-auto">
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-primary/20">
                <Stethoscope className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-transparent blur-md" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl pointer-events-none" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110 active:scale-95 shrink-0 rounded-lg relative overflow-hidden group",
              !collapsed && "ml-auto"
            )}
          >
            {/* Efeito de ripple no botão */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-current/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-300" />
            <span className="relative z-10">
              {collapsed ? <ChevronRight className="w-4 h-4 transition-transform duration-200" /> : <ChevronLeft className="w-4 h-4 transition-transform duration-200" />}
            </span>
          </Button>
        </div>
      </div>

      {/* Navigation - Com scrollbar personalizada e efeitos melhorados */}
      <nav id="main-navigation" className="flex-1 overflow-y-auto overflow-x-hidden relative" aria-label="Navegação principal">
        {/* Efeito de glow no topo */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />

        <style>{`
          .sidebar-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--border) / 0.25);
            border-radius: 4px;
            transition: background 0.2s;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--border) / 0.4);
          }
        `}</style>
        <div className={cn(
          "space-y-px sidebar-scroll",
          collapsed ? "p-2" : "p-3 py-4"
        )}>
          {/* === NÚCLEO DO NEGÓCIO === */}
          {!collapsed && (
            <div className="px-2 py-1.5 mt-1 mb-2">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                Núcleo
              </span>
            </div>
          )}
          {menuItems.slice(0, 3).map((item) => renderMenuItem(item, collapsed, location))}

          {/* === CLÍNICA DIÁRIA === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                  Clínica
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}
          {menuItems.slice(3, 6).map((item) => renderMenuItem(item, collapsed, location))}

          {/* === GESTÃO E OPERAÇÕES === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                  Gestão
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}
          {menuItems.slice(6).map((item) => renderMenuItem(item, collapsed, location))}

          {/* === MÓDULOS === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                  Módulos
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}

          {/* Avaliações Submenu */}
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

          {/* Cadastros Submenu */}
          {renderSubmenu({
            icon: ClipboardList,
            label: 'Cadastros',
            items: cadastrosSubmenu,
            isOpen: cadastrosOpen || isCadastrosActive,
            onOpenChange: setCadastrosOpen,
            isActive: isCadastrosActive,
            collapsed,
            location
          })}

          {/* CRM Submenu */}
          {renderSubmenu({
            icon: TrendingUp,
            label: 'CRM',
            items: crmSubmenu,
            isOpen: crmOpen || isCrmActive,
            onOpenChange: setCrmOpen,
            isActive: isCrmActive,
            collapsed,
            location
          })}

          {/* Marketing Submenu */}
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

          {/* Operacionais Submenu */}
          {renderSubmenu({
            icon: Layers,
            label: 'Operacionais',
            items: operacionaisSubmenu,
            isOpen: operacionaisOpen || isOperacionaisActive,
            onOpenChange: setOperacionaisOpen,
            isActive: isOperacionaisActive,
            collapsed,
            location
          })}

          {/* === FINANCEIRO === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                  Financeiro
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}

          {/* Financeiro Submenu */}
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

          {/* Relatórios Submenu */}
          {renderSubmenu({
            icon: BarChart3,
            label: 'Relatórios',
            items: relatoriosSubmenu,
            isOpen: relatoriosOpen || isRelatoriosActive,
            onOpenChange: setRelatoriosOpen,
            isActive: isRelatoriosActive,
            collapsed,
            location
          })}

          {/* === SISTEMA === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40" />
                  Sistema
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}

          {/* Dashboard IA Submenu */}
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

          {/* Google AI Suite Submenu */}
          {renderSubmenu({
            icon: Brain,
            label: 'Google AI Suite',
            items: googleAiSubmenu,
            isOpen: googleAiOpen || isGoogleAiActive,
            onOpenChange: setGoogleAiOpen,
            isActive: isGoogleAiActive,
            collapsed,
            location
          })}

          {/* Admin Submenu */}
          {renderSubmenu({
            icon: Settings,
            label: 'Administração',
            items: adminSubmenu,
            isOpen: adminOpen || isAdminActive,
            onOpenChange: setAdminOpen,
            isActive: isAdminActive,
            collapsed,
            location
          })}

          {/* === GAMIFICAÇÃO === */}
          {!collapsed && (
            <>
              <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="px-2 py-1.5 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                  Gamificação
                </span>
              </div>
            </>
          )}
          {collapsed && <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />}

          {/* Gamificação Submenu */}
          {renderSubmenu({
            icon: Trophy,
            label: 'Gamificação',
            items: gamificacaoSubmenu,
            isOpen: gamificacaoOpen || isGamificacaoActive,
            onOpenChange: setGamificacaoOpen,
            isActive: isGamificacaoActive,
            collapsed,
            location
          })}

          {/* Mais Submenu - Portal, Ocupação, Wiki, etc. */}
          {renderSubmenu({
            icon: MoreHorizontal,
            label: 'Mais',
            items: maisSubmenu,
            isOpen: maisOpen || isMaisActive,
            onOpenChange: setMaisOpen,
            isActive: isMaisActive,
            collapsed,
            location
          })}

          {/* Configurações Submenu */}
          {renderSubmenu({
            icon: Settings,
            label: 'Configurações',
            items: configuracoesSubmenu,
            isOpen: configuracoesOpen || isConfiguracoesActive,
            onOpenChange: setConfiguracoesOpen,
            isActive: isConfiguracoesActive,
            collapsed,
            location
          })}

        </div>
      </nav>

      {/* Footer - Logout com efeitos melhorados */}
      <div className={cn(
        "p-3 border-t border-border/60 shrink-0 bg-gradient-to-t from-background/50 to-transparent relative",
        collapsed && "p-2"
      )}>
        {/* Efeito de brilho inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <Button
          variant="ghost"
          onClick={handleLogout}
          aria-label="Sair da conta (logout)"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:bg-red-50/90 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group relative overflow-hidden",
            collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2"
          )}
        >
          {/* Efeito de ripple no hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />

          <LogOut className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform duration-200 relative z-10" />
          {!collapsed && <span className="text-sm font-medium relative z-10">Sair</span>}
        </Button>
      </div>
    </div>
  );
}
