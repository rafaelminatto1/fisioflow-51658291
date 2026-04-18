import { describe, it, expect, vi } from 'vitest';
import { SyntheticPatientGenerator } from '../syntheticPatientGenerator';
import { AiGatewayService } from '../ai.service';
import type { Env } from '../../../types/env';

describe('SyntheticPatientGenerator', () => {
  it('should parse JSON returned by the AI Gateway correctly', async () => {
    // Mock the Env
    const mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: `Aqui está o JSON:\n{"patientProfile": {"name": "João"}, "simulatedSoap": {"subjective": "Dor"}}`
        })
      }
    } as unknown as Env;

    const aiService = new AiGatewayService(mockEnv);
    const generator = new SyntheticPatientGenerator(aiService);

    const result = await generator.generateCase('Dor lombar');

    expect(result).toEqual({
      patientProfile: { name: 'João' },
      simulatedSoap: { subjective: 'Dor' }
    });
  });

  it('should throw an error if AI does not return valid JSON', async () => {
    const mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: `Desculpe, não consegui gerar.`
        })
      }
    } as unknown as Env;

    const aiService = new AiGatewayService(mockEnv);
    const generator = new SyntheticPatientGenerator(aiService);

    await expect(generator.generateCase()).rejects.toThrow('Failed to parse AI output to JSON');
  });
});
