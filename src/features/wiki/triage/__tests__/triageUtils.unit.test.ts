import { describe, expect, it } from 'vitest';
import {
  applyTriageStatus,
  calculateAverageAgeDays,
  calculateAverageTimeInColumnDays,
  calculateLeadTimeDays,
  countDoneThisWeek,
  filterTriagePages,
  getTriageStatus,
} from '../triageUtils';
import type { WikiPage } from '@/types/wiki';

function makePage(partial: Partial<WikiPage>): WikiPage {
  return {
    id: partial.id || 'p1',
    slug: partial.slug || 'p1',
    title: partial.title || 'Page',
    content: partial.content || '',
    organization_id: partial.organization_id || 'org',
    created_by: partial.created_by || 'u1',
    updated_by: partial.updated_by || 'u1',
    tags: partial.tags || ['triage', 'triage-backlog'],
    is_published: partial.is_published ?? true,
    view_count: partial.view_count ?? 0,
    attachments: partial.attachments || [],
    created_at: (partial.created_at as any) || { toDate: () => new Date('2026-02-20T00:00:00Z') },
    updated_at: (partial.updated_at as any) || { toDate: () => new Date('2026-02-24T00:00:00Z') },
    version: partial.version ?? 1,
    template_id: partial.template_id,
    triage_order: partial.triage_order,
    category: partial.category,
    parent_id: partial.parent_id,
    icon: partial.icon,
    cover_image: partial.cover_image,
    html_content: partial.html_content,
    deleted_at: partial.deleted_at,
  };
}

describe('triageUtils unit', () => {
  it('getTriageStatus resolves from tags', () => {
    expect(getTriageStatus(makePage({ tags: ['triage', 'triage-backlog'] }))).toBe('backlog');
    expect(getTriageStatus(makePage({ tags: ['triage', 'triage-in-progress'] }))).toBe('in-progress');
    expect(getTriageStatus(makePage({ tags: ['triage', 'triage-done'] }))).toBe('done');
  });

  it('applyTriageStatus keeps non-status tags and updates status tag', () => {
    const next = applyTriageStatus(['triage', 'incident', 'triage-backlog'], 'done');
    expect(next).toContain('triage');
    expect(next).toContain('incident');
    expect(next).toContain('triage-done');
    expect(next).not.toContain('triage-backlog');
  });

  it('filterTriagePages applies template/owner/tag/text filters', () => {
    const pages = [
      makePage({ id: '1', title: 'Incidente API', template_id: 'incident-postmortem-v1', created_by: 'u1', tags: ['triage', 'incident', 'triage-backlog'] }),
      makePage({ id: '2', title: 'Ata semanal', template_id: 'meeting-notes-v1', created_by: 'u2', tags: ['triage', 'ata', 'triage-backlog'] }),
    ];

    const filtered = filterTriagePages(pages, {
      templateId: 'incident-postmortem-v1',
      ownerId: 'u1',
      tagQuery: 'incident',
      textQuery: 'api',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('calculates average age and done this week metrics', () => {
    const now = new Date('2026-02-25T00:00:00Z');
    const pages = [
      makePage({
        id: 'b1',
        tags: ['triage', 'triage-backlog'],
        created_at: { toDate: () => new Date('2026-02-23T00:00:00Z') } as any,
      }),
      makePage({
        id: 'i1',
        tags: ['triage', 'triage-in-progress'],
        created_at: { toDate: () => new Date('2026-02-22T00:00:00Z') } as any,
      }),
      makePage({
        id: 'd1',
        tags: ['triage', 'triage-done'],
        updated_at: { toDate: () => new Date('2026-02-24T10:00:00Z') } as any,
      }),
    ];

    expect(calculateAverageAgeDays(pages, 'backlog', now)).toBe(2);
    expect(calculateAverageAgeDays(pages, 'in-progress', now)).toBe(3);
    expect(calculateAverageTimeInColumnDays(pages, 'backlog', now)).toBe(1);
    expect(calculateAverageTimeInColumnDays(pages, 'in-progress', now)).toBe(1);
    expect(countDoneThisWeek(pages, now)).toBe(1);
    expect(calculateLeadTimeDays(pages)).toBe(4.4);
  });
});
