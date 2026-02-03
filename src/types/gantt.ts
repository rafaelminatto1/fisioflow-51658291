/**
 * Gantt Chart Types
 * Sistema de visualização timeline/Gantt
 */

import { Timestamp } from '@/integrations/firebase/app';

/**
 * Tarefa com dados para Gantt
 */
export interface GanttTask {
  id: string;
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  progress: number;                // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  project_id?: string;
  parent_id?: string;              // Para subtarefas
  dependencies: string[];          // IDs das tarefas que precedem esta
  is_milestone: boolean;
  color?: string;                  // Cor custom da barra
  tags: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Link de dependência entre tarefas
 */
export interface GanttDependency {
  id: string;
  from_task_id: string;            // Tarefa origem
  to_task_id: string;              // Tarefa destino
  type: DependencyType;
  lag?: number;                    // Dias de espera após from_task terminar
}

/**
 * Tipos de dependência
 */
export type DependencyType =
  | 'finish_to_start'              // FS: Tarefa B só inicia após A terminar
  | 'start_to_start'               // SS: Tarefa B inicia quando A inicia
  | 'finish_to_finish'             // FF: Tarefa B termina quando A termina
  | 'start_to_finish';             // SF: Tarefa B termina quando A inicia

/**
 * Milestone para Gantt
 */
export interface GanttMilestone {
  id: string;
  title: string;
  date: Date;
  project_id?: string;
  is_completed: boolean;
  color?: string;
}

/**
 * Caminho crítico calculado
 */
export interface CriticalPath {
  task_ids: string[];              // IDs das tarefas no caminho crítico
  total_duration: number;          // Dias totais do projeto
  slack: Record<string, number>;   // Folga de cada tarefa (0 = crítico)
}

/**
 * Nível de zoom do Gantt
 */
export type GanttZoomLevel = 'day' | 'week' | 'month' | 'quarter';

/**
 * View do Gantt
 */
export type GanttViewType = 'gantt' | 'timeline' | 'calendar';

/**
 * Configuração do Gantt
 */
export interface GanttConfig {
  zoom_level: GanttZoomLevel;
  show_dependencies: boolean;
  show_critical_path: boolean;
  show_milestones: boolean;
  show_weekends: boolean;
  column_width: number;            // Pixels por dia/semana/mês
  snap_to_grid: boolean;
  enable_drag_drop: boolean;
  enable_resize: boolean;
  working_days: number[];          // [1,2,3,4,5] = Seg-Sex são úteis
}

/**
 * Intervalo de datas para view
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Posição de uma tarefa no canvas
 */
export interface TaskPosition {
  x: number;                       // Posição horizontal (pixels)
  y: number;                       // Posição vertical (linha)
  width: number;                   // Duração em pixels
  height: number;                  // Altura padrão
}

/**
 * Célula de tempo no grid
 */
export interface TimeCell {
  date: Date;
  is_working_day: boolean;
  is_today: boolean;
  is_weekend: boolean;
  x: number;                       // Posição horizontal
  width: number;
}

/**
 * Operação de drag no Gantt
 */
export interface GanttDragOperation {
  type: 'move' | 'resize_left' | 'resize_right';
  task_id: string;
  original_start: Date;
  original_end: Date;
  current_start: Date;
  current_end: Date;
}

/**
 * Dados exportados do Gantt
 */
export interface GanttExportData {
  project_name: string;
  date_range: DateRange;
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  milestones: GanttMilestone[];
  summary: {
    total_tasks: number;
    completed_tasks: number;
    total_duration: number;
    critical_path_length: number;
  };
}

/**
 * Estatísticas do projeto
 */
export interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_percentage: number;
  total_duration: number;          // Dias
  remaining_duration: number;      // Dias
  start_date: Date;
  end_date: Date;
  budget?: number;
  spent?: number;
}
