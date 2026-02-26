import { describe, expect, it } from 'vitest';
import { buildTriageDropPlan } from '../triageUtils';
import type { WikiPage } from '@/types/wiki';

function page(id: string, tags: string[], order: number): WikiPage {
  const ts = { toDate: () => new Date('2026-02-24T00:00:00Z') } as any;
  return {
    id,
    slug: id,
    title: id,
    content: id,
    organization_id: 'org',
    created_by: 'u1',
    updated_by: 'u1',
    tags,
    is_published: true,
    view_count: 0,
    attachments: [],
    created_at: ts,
    updated_at: ts,
    version: 1,
    triage_order: order,
  };
}

describe('buildTriageDropPlan integration', () => {
  it('reorders within same column', () => {
    const buckets = {
      backlog: [
        page('a', ['triage', 'triage-backlog'], 1),
        page('b', ['triage', 'triage-backlog'], 2),
        page('c', ['triage', 'triage-backlog'], 3),
      ],
      'in-progress': [],
      done: [],
    } as unknown as Record<'backlog' | 'in-progress' | 'done', WikiPage[]>;

    const plan = buildTriageDropPlan({
      draggableId: 'a',
      sourceStatus: 'backlog',
      destinationStatus: 'backlog',
      destinationIndex: 2,
      buckets,
    });

    expect(plan.map((u) => u.id)).toEqual(['b', 'c', 'a']);
    expect(plan.map((u) => u.triage_order)).toEqual([1, 2, 3]);
  });

  it('moves card across columns and recalculates both orders', () => {
    const buckets = {
      backlog: [
        page('a', ['triage', 'triage-backlog'], 1),
        page('b', ['triage', 'triage-backlog'], 2),
      ],
      'in-progress': [page('x', ['triage', 'triage-in-progress'], 1)],
      done: [],
    } as unknown as Record<'backlog' | 'in-progress' | 'done', WikiPage[]>;

    const plan = buildTriageDropPlan({
      draggableId: 'b',
      sourceStatus: 'backlog',
      destinationStatus: 'in-progress',
      destinationIndex: 0,
      buckets,
    });

    const bUpdate = plan.find((item) => item.id === 'b');
    const xUpdate = plan.find((item) => item.id === 'x');
    const aUpdate = plan.find((item) => item.id === 'a');

    expect(aUpdate?.triage_order).toBe(1);
    expect(bUpdate?.triage_order).toBe(1);
    expect(bUpdate?.tags).toContain('triage-in-progress');
    expect(xUpdate?.triage_order).toBe(2);
  });
});
