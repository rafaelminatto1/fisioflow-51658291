import { describe, it, expect } from 'vitest';
import { signInSchema, signUpSchema } from '../auth';

describe('authSchema', () => {
  describe('signInSchema', () => {
    it('deve validar login com dados válidos', () => {
      const validLogin = {
        email: 'usuario@example.com',
        password: 'senha123',
      };

      const result = signInSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const invalidLogin = {
        email: 'email-invalido',
        password: 'senha123',
      };

      const result = signInSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha vazia', () => {
      const invalidLogin = {
        email: 'usuario@example.com',
        password: '',
      };

      const result = signInSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('signUpSchema', () => {
    it('deve validar cadastro com dados válidos', () => {
      const validSignUp = {
        email: 'novo@example.com',
        password: 'Senha@123',
        confirmPassword: 'Senha@123',
        fullName: 'Usuário Teste',
      };

      const result = signUpSchema.safeParse(validSignUp);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senha fraca', () => {
      const weakPassword = {
        email: 'novo@example.com',
        password: '123',
        confirmPassword: '123',
        fullName: 'Usuário Teste',
      };

      const result = signUpSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senhas diferentes', () => {
      const mismatchPasswords = {
        email: 'novo@example.com',
        password: 'Senha@123',
        confirmPassword: 'Senha@456',
        fullName: 'Usuário Teste',
      };

      const result = signUpSchema.safeParse(mismatchPasswords);
      expect(result.success).toBe(false);
    });
  });
});
