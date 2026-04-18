import { describe, it, expect, vi } from 'vitest';
import { AiGatewayService } from '../ai.service';
import type { Env } from '../../../types/env';

describe('AiGatewayService', () => {
  it('should call Cloudflare AI binding with correct parameters and return text', async () => {
    // Mock the Env object
    const mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({ response: 'Mocked AI Response' })
      }
    } as unknown as Env;

    const service = new AiGatewayService(mockEnv);
    const result = await service.runQuantizedModel(
      '@cf/meta/llama-3.1-8b-instruct',
      'System prompt',
      'User prompt',
      { maxTokens: 100, temperature: 0.5 }
    );

    expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User prompt' }
      ],
      max_tokens: 100,
      temperature: 0.5
    });

    expect(result).toBe('Mocked AI Response');
  });

  it('should handle AI binding errors gracefully', async () => {
    const mockEnv = {
      AI: {
        run: vi.fn().mockRejectedValue(new Error('Network error'))
      }
    } as unknown as Env;

    const service = new AiGatewayService(mockEnv);

    await expect(
      service.runQuantizedModel('model', 'sys', 'usr')
    ).rejects.toThrow('Falha ao processar a IA: Network error');
  });
});
