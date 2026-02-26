import { describe, expect, it } from 'vitest';
import { instantiateTemplate } from '../templateTransform';

describe('instantiateTemplate', () => {
  it('fills variables with provided values', () => {
    const output = instantiateTemplate({
      templateId: 'product-prd-v1',
      values: {
        feature_name: 'Modo Offline de Wiki',
        owner: 'Equipe Core',
        target_date: '2026-03-15',
      },
    });

    expect(output.missingRequired).toEqual([]);
    expect(output.content).toContain('Modo Offline de Wiki');
    expect(output.content).toContain('Equipe Core');
    expect(output.content).toContain('2026-03-15');
  });

  it('reports missing required variables', () => {
    const output = instantiateTemplate({
      templateId: 'clinical-protocol-v1',
      values: {
        protocol_name: 'Reabilitacao de LCA',
      },
    });

    expect(output.missingRequired).toEqual(['condition', 'owner']);
  });

  it('uses default values when defined in template', () => {
    const output = instantiateTemplate({
      templateId: 'incident-postmortem-v1',
      values: {
        incident_title: 'Falha no indexador',
        date: '2026-02-24',
      },
    });

    expect(output.missingRequired).toEqual([]);
    expect(output.content).toContain('SEV-2');
  });
});
