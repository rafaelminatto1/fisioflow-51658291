/**
 * Lazy Charts Wrapper
 *
 * Carrega os componentes do Recharts apenas quando necessário
 * Reduz significativamente o tamanho inicial do bundle
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load dos componentes do Recharts
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart as any })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart as any })));
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart as any })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart as any })));
const RadarChart = lazy(() => import('recharts').then(m => ({ default: m.RadarChart as any })));

// Lazy load dos componentes de renderização
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line as any })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar as any })));
const Area = lazy(() => import('recharts').then(m => ({ default: m.Area as any })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie as any })));
const Radar = lazy(() => import('recharts').then(m => ({ default: m.Radar as any })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell as any })));

// Lazy load dos componentes de eixos e tooltips
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis as any })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis as any })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid as any })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip as any })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend as any })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer as any })));

// Loading fallback para charts
function ChartLoader({ height = 200 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Wrapper paraSuspense
function SuspenseWrapper({ children, height = 200 }: { children: React.ReactNode; height?: number }) {
  return (
    <Suspense fallback={<ChartLoader height={height} />}>
      {children}
    </Suspense>
  );
}

// Exportar componentes lazy-wrapped
export const LazyLineChart = LineChart;
export const LazyBarChart = BarChart;
export const LazyAreaChart = AreaChart;
export const LazyPieChart = PieChart;
export const LazyRadarChart = RadarChart;

export const LazyLine = Line;
export const LazyBar = Bar;
export const LazyArea = Area;
export const LazyPie = Pie;
export const LazyRadar = Radar;
export const LazyCell = Cell;

export const LazyXAxis = XAxis;
export const LazyYAxis = YAxis;
export const LazyCartesianGrid = CartesianGrid;
export const LazyTooltip = Tooltip;
export const LazyLegend = Legend;
export const LazyResponsiveContainer = ResponsiveContainer;

/**
 * Componente wrapper para renderizar charts com lazy loading
 * @example
 * <LazyChart>
 *   <ResponsiveContainer width="100%" height={300}>
 *     <LineChart data={data}>
 *       <XAxis dataKey="name" />
 *       <YAxis />
 *       <Tooltip />
 *       <Line type="monotone" dataKey="value" stroke="#8884d8" />
 *     </LineChart>
 *   </ResponsiveContainer>
 * </LazyChart>
 */
export function LazyChart({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  return (
    <SuspenseWrapper height={height}>
      {children}
    </SuspenseWrapper>
  );
}

/**
 * Preload dos componentes de chart (útil para prefetch antes de navegar)
 */
/* eslint-disable-next-line react-refresh/only-export-components */
export function preloadCharts() {
  // Pré-carregar todos os componentes do Recharts
  void import('recharts');
}

// Re-exportar tudo do recharts para compatibilidade

export {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  RadarChart,
  Line,
  Bar,
  Area,
  Pie,
  Radar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';



