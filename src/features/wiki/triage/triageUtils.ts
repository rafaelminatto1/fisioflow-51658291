import type { WikiPage } from '@/types/wiki';

export type TriageStatus = 'backlog' | 'in-progress' | 'done';

export interface TriageFilters {
  templateId: string;
  ownerId: string;
  tagQuery: string;
  textQuery: string;
}

export interface TriageUpdate {
  id: string;
  triage_order: number;
  tags: string[];
  category: string;
}

export interface TriageDropPlanInput {
  draggableId: string;
  sourceStatus: TriageStatus;
  destinationStatus: TriageStatus;
  destinationIndex: number;
  buckets: Record<TriageStatus, WikiPage[]>;
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === 'function') {
    return maybeTs.toDate().getTime();
  }

  return 0;
}

export function getTriageStatus(page: Pick<WikiPage, 'tags'>): TriageStatus {
  if (page.tags.includes('triage-done')) return 'done';
  if (page.tags.includes('triage-in-progress')) return 'in-progress';
  return 'backlog';
}

export function applyTriageStatus(tags: string[], status: TriageStatus): string[] {
  const nextTags = tags.filter(
    (tag) => tag !== 'triage-backlog' && tag !== 'triage-in-progress' && tag !== 'triage-done'
  );

  if (!nextTags.includes('triage')) nextTags.push('triage');

  if (status === 'done') nextTags.push('triage-done');
  else if (status === 'in-progress') nextTags.push('triage-in-progress');
  else nextTags.push('triage-backlog');

  return Array.from(new Set(nextTags));
}

export function sortByTriageOrder(a: WikiPage, b: WikiPage): number {
  const orderA = typeof a.triage_order === 'number' ? a.triage_order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.triage_order === 'number' ? b.triage_order : Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) return orderA - orderB;

  const timeA = toMillis(a.updated_at);
  const timeB = toMillis(b.updated_at);
  return timeB - timeA;
}

export function reorderTriagePages(list: WikiPage[], startIndex: number, endIndex: number): WikiPage[] {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function filterTriagePages(pages: WikiPage[], filters: TriageFilters): WikiPage[] {
  const tagQuery = filters.tagQuery.trim().toLowerCase();
  const textQuery = filters.textQuery.trim().toLowerCase();

  return pages.filter((page) => {
    if (filters.templateId !== 'all' && (page.template_id || 'manual') !== filters.templateId) return false;
    if (filters.ownerId !== 'all' && page.created_by !== filters.ownerId) return false;

    if (tagQuery) {
      const matchesTag = page.tags.some((tag) => tag.toLowerCase().includes(tagQuery));
      if (!matchesTag) return false;
    }

    if (textQuery) {
      const haystack = `${page.title} ${page.content}`.toLowerCase();
      if (!haystack.includes(textQuery)) return false;
    }

    return true;
  });
}

export function calculateAverageAgeDays(pages: WikiPage[], status: TriageStatus, now = new Date()): number {
  const scoped = pages.filter((page) => getTriageStatus(page) === status);
  if (scoped.length === 0) return 0;

  const total = scoped.reduce((acc, page) => {
    const createdAt = toMillis(page.created_at) || toMillis(page.updated_at);
    if (!createdAt) return acc;
    const diffMs = Math.max(0, now.getTime() - createdAt);
    return acc + diffMs / (1000 * 60 * 60 * 24);
  }, 0);

  return Number((total / scoped.length).toFixed(1));
}

export function calculateAverageTimeInColumnDays(
  pages: WikiPage[],
  status: TriageStatus,
  now = new Date()
): number {
  const scoped = pages.filter((page) => getTriageStatus(page) === status);
  if (scoped.length === 0) return 0;

  const total = scoped.reduce((acc, page) => {
    const lastStatusUpdateAt = toMillis(page.updated_at) || toMillis(page.created_at);
    if (!lastStatusUpdateAt) return acc;
    const diffMs = Math.max(0, now.getTime() - lastStatusUpdateAt);
    return acc + diffMs / (1000 * 60 * 60 * 24);
  }, 0);

  return Number((total / scoped.length).toFixed(1));
}

export function countDoneThisWeek(pages: WikiPage[], now = new Date()): number {
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diffToMonday);

  return pages.filter((page) => {
    if (getTriageStatus(page) !== 'done') return false;
    const updatedAt = toMillis(page.updated_at);
    return updatedAt >= start.getTime();
  }).length;
}

export function calculateLeadTimeDays(pages: WikiPage[]): number {
  const donePages = pages.filter((page) => getTriageStatus(page) === 'done');
  if (donePages.length === 0) return 0;

  const totalDays = donePages.reduce((acc, page) => {
    const createdAt = toMillis(page.created_at);
    const updatedAt = toMillis(page.updated_at);
    if (!createdAt || !updatedAt || updatedAt < createdAt) return acc;
    return acc + (updatedAt - createdAt) / (1000 * 60 * 60 * 24);
  }, 0);

  return Number((totalDays / donePages.length).toFixed(1));
}

export function buildTriageDropPlan(input: TriageDropPlanInput): TriageUpdate[] {
  const { draggableId, sourceStatus, destinationStatus, destinationIndex, buckets } = input;

  const sourceList = [...buckets[sourceStatus]];
  const destinationList = sourceStatus === destinationStatus ? sourceList : [...buckets[destinationStatus]];

  const sourceIndex = sourceList.findIndex((item) => item.id === draggableId);
  if (sourceIndex === -1) return [];

  const movedPage = sourceList[sourceIndex];
  if (!movedPage) return [];

  if (sourceStatus === destinationStatus) {
    const reordered = reorderTriagePages(sourceList, sourceIndex, destinationIndex);
    return reordered.map((page, index) => ({
      id: page.id,
      triage_order: index + 1,
      tags: applyTriageStatus(page.tags, sourceStatus),
      category: 'triage',
    }));
  }

  sourceList.splice(sourceIndex, 1);
  destinationList.splice(destinationIndex, 0, movedPage);

  const sourceUpdates = sourceList.map((page, index) => ({
    id: page.id,
    triage_order: index + 1,
    tags: applyTriageStatus(page.tags, sourceStatus),
    category: 'triage',
  }));

  const destinationUpdates = destinationList.map((page, index) => ({
    id: page.id,
    triage_order: index + 1,
    tags: applyTriageStatus(page.tags, destinationStatus),
    category: 'triage',
  }));

  return [...sourceUpdates, ...destinationUpdates];
}
