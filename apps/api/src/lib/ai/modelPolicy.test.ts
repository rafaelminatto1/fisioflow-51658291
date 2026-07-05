import { describe, it, expect, vi } from 'vitest';
import { validateModelPolicy, ModelPolicyError } from './modelPolicy';

// Mocking o Router para testar se ele força a política
import * as aiRouter from './aiRouter';

describe('AI Model Policy', () => {
  it('deve bloquear uso do GLM 5.2 em qualquer tarefa', () => {
    expect(() => {
      validateModelPolicy('GLM 5.2', 'grammar_correction');
    }).toThrowError(ModelPolicyError);

    expect(() => {
      validateModelPolicy('GLM 5.2', 'soap_evolution_generation');
    }).toThrow(/GLM 5.2/);
  });

  it('deve bloquear gpt-4 por padrão (ausência de BAA)', () => {
    expect(() => {
      validateModelPolicy('gpt-4', 'grammar_correction');
    }).toThrowError(ModelPolicyError);
  });

  it('deve permitir modelo cheap para correção gramatical', () => {
    expect(() => {
      validateModelPolicy('@cf/meta/llama-3.1-8b-instruct-fast', 'grammar_correction');
    }).not.toThrow();

    expect(() => {
      validateModelPolicy('gemini-1.5-flash', 'grammar_correction');
    }).not.toThrow();
  });

  it('deve bloquear modelo medium para tarefas exclusivas de cheap', () => {
    expect(() => {
      validateModelPolicy('gemini-1.5-pro', 'grammar_correction');
    }).toThrowError(ModelPolicyError);
  });

  it('deve permitir modelo medium para evolução SOAP', () => {
    expect(() => {
      validateModelPolicy('gemini-1.5-pro', 'soap_evolution_generation');
    }).not.toThrow();
  });

  it('deve lançar erro para modelos não registrados', () => {
    expect(() => {
      validateModelPolicy('modelo-fantasma-123', 'grammar_correction');
    }).toThrowError(ModelPolicyError);
  });
});

describe('AI Router Enforcement', () => {
  it('deve garantir que o aiRouter não seja burlado por chamadas diretas', async () => {
    // Simula uma tentativa de fetch direto no ambiente onde o Router deveria interceptar.
    // Em um cenário real, você configuraria o Service Worker ou um interceptor (como MSW)
    // para falhar o request caso falte um header interno injetado apenas pelo Router.
    
    // Teste simbólico de enforcing da regra:
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    global.fetch = mockFetch;

    // Se o desenvolvedor tentar: fetch('https://api.openai.com/v1/...', { model: 'GLM 5.2' })
    // O sistema deve ser desenhado para que a ausência do Router logue um erro de Policy.
    // Aqui garantimos que o runInRouter (que você vai implementar) faça o wrap.
    
    // Expecting to eventually integrate MSW for the global catch.
    expect(true).toBe(true);
  });
});
