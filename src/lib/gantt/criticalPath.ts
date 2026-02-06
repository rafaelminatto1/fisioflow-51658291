/**
 * Gantt Chart - Cálculo de Caminho Crítico
 * Algoritmo para identificar tarefas críticas que determinam a duração mínima do projeto
 */

  GanttTask,
  GanttDependency,
  CriticalPath,
  DependencyType,
} from '@/types/gantt';

/**
 * Calcula o caminho crítico do projeto
 * Usa o algoritmo de Forward Pass + Backward Pass
 */
export function calculateCriticalPath(
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): CriticalPath {
  // Build dependency map
  const depMap = buildDependencyMap(dependencies);

  // Calculate earliest start (ES) and earliest finish (EF) - Forward Pass
  const { earliestStart, earliestFinish } = calculateEarliestTimes(tasks, depMap);

  // Calculate latest start (LS) and latest finish (LF) - Backward Pass
  const { latestStart, latestFinish } = calculateLatestTimes(
    tasks,
    depMap,
    earliestFinish
  );

  // Calculate slack (float) for each task
  const slack: Record<string, number> = {};
  const criticalTaskIds: string[] = [];

  tasks.forEach((task) => {
    const taskSlack = latestStart[task.id] - earliestStart[task.id];
    slack[task.id] = Math.max(0, taskSlack);

    // Task is critical if slack is 0 (or very close due to rounding)
    if (taskSlack < 0.01) {
      criticalTaskIds.push(task.id);
    }
  });

  // Calculate project duration
  const projectDuration = Math.max(...Object.values(earliestFinish), 0);

  return {
    task_ids: criticalTaskIds,
    total_duration: projectDuration,
    slack,
  };
}

/**
 * Calcula a folga total de uma tarefa específica
 */
export function calculateTaskSlack(
  taskId: string,
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): number {
  const criticalPath = calculateCriticalPath(tasks, dependencies);
  return criticalPath.slack[taskId] || 0;
}

/**
 * Retorna tarefas ordenadas por ordem de execução (topológica)
 */
export function topologicalSort(
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): GanttTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depMap = buildDependencyMap(dependencies);

  const sorted: GanttTask[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  function visit(taskId: string): void {
    if (visited.has(taskId)) return;
    if (inProgress.has(taskId)) {
      throw new Error('Ciclo detectado nas dependências');
    }

    inProgress.add(taskId);

    // Visit predecessors first
    const predecessors = depMap.predecessors[taskId] || [];
    predecessors.forEach((predId) => visit(predId));

    inProgress.delete(taskId);
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      sorted.push(task);
    }
  }

  tasks.forEach((task) => visit(task.id));

  return sorted;
}

/**
 * Detecta ciclos nas dependências
 */
export function detectCycles(
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): string[][] {
  const cycles: string[][] = [];
  const taskIds = new Set(tasks.map((t) => t.id));
  const depMap = buildDependencyMap(dependencies);

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(taskId: string): boolean {
    visited.add(taskId);
    recStack.add(taskId);
    path.push(taskId);

    const successors = depMap.successors[taskId] || [];
    for (const succId of successors) {
      if (!taskIds.has(succId)) continue;

      if (!visited.has(succId)) {
        if (dfs(succId)) {
          return true;
        }
      } else if (recStack.has(succId)) {
        // Found a cycle
        const cycleStart = path.indexOf(succId);
        cycles.push([...path.slice(cycleStart), succId]);
        return true;
      }
    }

    path.pop();
    recStack.delete(taskId);
    return false;
  }

  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  });

  return cycles;
}

/**
 * Calcula datas de início/fim baseado em dependências
 */
export function calculateTaskDates(
  task: GanttTask,
  allTasks: GanttTask[],
  dependencies: GanttDependency[]
): { start_date: Date; end_date: Date } {
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const depMap = buildDependencyMap(dependencies);

  // Find predecessors
  const predecessors = (depMap.predecessors[task.id] || [])
    .map((id) => taskMap.get(id))
    .filter((t): t is GanttTask => t !== undefined);

  if (predecessors.length === 0) {
    return {
      start_date: task.start_date,
      end_date: task.end_date,
    };
  }

  // Calculate earliest start based on predecessors
  let earliestStart = new Date(Math.max(...predecessors.map((p) => p.end_date.getTime())));

  // Add lag if specified in dependency
  const lag = dependencies
    .filter((d) => d.to_task_id === task.id)
    .reduce((sum, d) => sum + (d.lag || 0), 0);

  if (lag > 0) {
    earliestStart = new Date(earliestStart.getTime() + lag * 24 * 60 * 60 * 1000);
  }

  const duration = task.end_date.getTime() - task.start_date.getTime();
  const end_date = new Date(earliestStart.getTime() + duration);

  return {
    start_date: earliestStart,
    end_date,
  };
}

/**
 * Calcula o dia útil mais próximo (considerando fins de semana)
 */
export function adjustToWorkingDay(
  date: Date,
  workingDays: number[] = [1, 2, 3, 4, 5]
): Date {
  const result = new Date(date);
  let dayOfWeek = result.getDay();

  // Se for fim de semana, avançar para o próximo dia útil
  while (!workingDays.includes(dayOfWeek)) {
    result.setDate(result.getDate() + 1);
    dayOfWeek = result.getDay();
  }

  return result;
}

/**
 * Adiciona dias úteis a uma data
 */
export function addWorkingDays(
  date: Date,
  days: number,
  workingDays: number[] = [1, 2, 3, 4, 5]
): Date {
  const result = new Date(date);
  let daysToAdd = days;

  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);
    if (workingDays.includes(result.getDay())) {
      daysToAdd--;
    }
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface DependencyMap {
  predecessors: Record<string, string[]>;
  successors: Record<string, string[]>;
}

function buildDependencyMap(dependencies: GanttDependency[]): DependencyMap {
  const predecessors: Record<string, string[]> = {};
  const successors: Record<string, string[]> = {};

  dependencies.forEach((dep) => {
    if (!predecessors[dep.to_task_id]) {
      predecessors[dep.to_task_id] = [];
    }
    predecessors[dep.to_task_id].push(dep.from_task_id);

    if (!successors[dep.from_task_id]) {
      successors[dep.from_task_id] = [];
    }
    successors[dep.from_task_id].push(dep.to_task_id);
  });

  return { predecessors, successors };
}

interface TimeMap {
  [taskId: string]: number; // days from project start
}

function calculateEarliestTimes(
  tasks: GanttTask[],
  depMap: DependencyMap
): { earliestStart: TimeMap; earliestFinish: TimeMap } {
  const earliestStart: TimeMap = {};
  const earliestFinish: TimeMap = {};

  const sorted = topologicalSort(tasks, []);

  // Find project start date
  const projectStart = new Date(
    Math.min(...tasks.map((t) => t.start_date.getTime()))
  );

  sorted.forEach((task) => {
    const taskDuration = (task.end_date.getTime() - task.start_date.getTime()) / (1000 * 60 * 60 * 24);

    const predecessors = depMap.predecessors[task.id] || [];

    if (predecessors.length === 0) {
      // No dependencies, use task's own start date
      earliestStart[task.id] = (task.start_date.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      // Start after latest predecessor finishes
      const maxPredecessorFinish = Math.max(
        ...predecessors.map((predId) => earliestFinish[predId] || 0)
      );
      earliestStart[task.id] = maxPredecessorFinish;
    }

    earliestFinish[task.id] = earliestStart[task.id] + taskDuration;
  });

  return { earliestStart, earliestFinish };
}

function calculateLatestTimes(
  tasks: GanttTask[],
  depMap: DependencyMap,
  earliestFinish: TimeMap
): { latestStart: TimeMap; latestFinish: TimeMap } {
  const latestStart: TimeMap = {};
  const latestFinish: TimeMap = {};

  // Find project end date (maximum earliest finish)
  const projectEnd = Math.max(...Object.values(earliestFinish), 0);

  // Process tasks in reverse topological order
  const sorted = topologicalSort(tasks, []);
  const reversed = [...sorted].reverse();

  reversed.forEach((task) => {
    const taskDuration = (task.end_date.getTime() - task.start_date.getTime()) / (1000 * 60 * 60 * 24);
    const successors = depMap.successors[task.id] || [];

    if (successors.length === 0) {
      // No successors, must finish by project end
      latestFinish[task.id] = projectEnd;
    } else {
      // Finish before earliest successor starts
      const minSuccessorStart = Math.min(
        ...successors.map((succId) => latestStart[succId] || projectEnd)
      );
      latestFinish[task.id] = minSuccessorStart;
    }

    latestStart[task.id] = latestFinish[task.id] - taskDuration;
  });

  return { latestStart, latestFinish };
}

/**
 * Obtém tarefas que bloqueiam outras tarefas
 */
export function getBlockingTasks(
  taskId: string,
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): GanttTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depMap = buildDependencyMap(dependencies);

  // Find all tasks that would be blocked if this task is delayed
  const blocked: GanttTask[] = [];
  const visited = new Set<string>();

  function visit(succId: string) {
    if (visited.has(succId)) return;
    visited.add(succId);

    const task = taskMap.get(succId);
    if (task) {
      blocked.push(task);
    }

    const successors = depMap.successors[succId] || [];
    successors.forEach(visit);
  }

  const immediateSuccessors = depMap.successors[taskId] || [];
  immediateSuccessors.forEach(visit);

  return blocked;
}

/**
 * Obtém tarefas que bloqueiam esta tarefa
 */
export function getBlockedByTasks(
  taskId: string,
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): GanttTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depMap = buildDependencyMap(dependencies);

  const predecessors = depMap.predecessors[taskId] || [];
  return predecessors
    .map((id) => taskMap.get(id))
    .filter((t): t is GanttTask => t !== undefined);
}
