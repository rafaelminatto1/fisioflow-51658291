import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import {
  AppError,
  ValidationError,
  AuthError,
  NetworkError,
  FileUploadError,
  ErrorHandler,
  handleAsyncError,
  catchErrors
} from '@/lib/errors/handlers';
import { ZodError } from 'zod';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('Error Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create AppError with correct properties', () => {
        const error = new AppError('Test error', 400, true, 'TEST_CONTEXT');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('AppError');
        expect(error.isOperational).toBe(true);
        expect(error.context).toBe('TEST_CONTEXT');
        expect(error instanceof Error).toBe(true);
      });
      
      it('should have default status code 500', () => {
        const error = new AppError('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
      });
    });
    
    describe('ValidationError', () => {
      it('should create ValidationError with field errors', () => {
        const validationErrors = { email: ['Invalid email'], password: ['Too short'] };
        const error = new ValidationError('Validation failed', 'email', validationErrors);
        
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toEqual(validationErrors);
        expect(error.field).toBe('email');
        expect(error.context).toBe('ValidationError');
        expect(error.statusCode).toBe(400);
      });
    });
    
    describe('AuthError', () => {
      it('should create AuthError with correct properties', () => {
        const error = new AuthError('Unauthorized access', 401, 'login');
        
        expect(error.message).toBe('Unauthorized access');
        expect(error.context).toBe('AuthError');
        expect(error.statusCode).toBe(401);
        expect(error.authAction).toBe('login');
      });
    });
    
    describe('NetworkError', () => {
      it('should create NetworkError with correct properties', () => {
        const error = new NetworkError('Network timeout', 500, '/api/users', 'GET');
        
        expect(error.message).toBe('Network timeout');
        expect(error.context).toBe('NetworkError');
        expect(error.statusCode).toBe(500);
        expect(error.endpoint).toBe('/api/users');
        expect(error.method).toBe('GET');
      });
    });
    
    describe('FileUploadError', () => {
      it('should create FileUploadError with file info', () => {
        const error = new FileUploadError('Upload failed', 'document.pdf', 5242880); // 5MB
        
        expect(error.message).toBe('Upload failed');
        expect(error.fileName).toBe('document.pdf');
        expect(error.fileSize).toBe(5242880);
        expect(error.context).toBe('FileUploadError');
        expect(error.statusCode).toBe(400);
      });
    });
  });
  
  describe('ErrorHandler', () => {
    describe('handleApiError', () => {
      it('should handle 400 Bad Request', () => {
        const error = { status: 400, message: 'Bad request' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Dados inválidos. Verifique as informações e tente novamente.'
        );
        expect(mockConsole.error).toHaveBeenCalled();
      });
      
      it('should handle 401 Unauthorized', () => {
        const error = { status: 401, message: 'Unauthorized' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Sessão expirada. Faça login novamente.'
        );
      });
      
      it('should handle 403 Forbidden', () => {
        const error = { status: 403, message: 'Forbidden' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Você não tem permissão para realizar esta ação.'
        );
      });
      
      it('should handle 404 Not Found', () => {
        const error = { status: 404, message: 'Not found' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Recurso não encontrado.'
        );
      });
      
      it('should handle 500 Internal Server Error', () => {
        const error = { status: 500, message: 'Internal server error' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Erro interno do servidor. Tente novamente mais tarde.'
        );
      });
      
      it('should handle network errors', () => {
        const error = { message: 'Network Error' };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Erro de conexão. Verifique sua internet e tente novamente.'
        );
      });
      
      it('should handle unknown errors', () => {
        const error = { status: 418, message: "I'm a teapot" };
        
        ErrorHandler.handleApiError(error);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Ocorreu um erro inesperado. Tente novamente.'
        );
      });
    });
    
    describe('handleValidationError', () => {
      it('should handle ZodError with field errors', () => {
        const zodError = new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Expected string, received number'
          },
          {
            code: 'too_small',
            minimum: 8,
            type: 'string',
            inclusive: true,
            path: ['password'],
            message: 'String must contain at least 8 character(s)'
          }
        ]);
        
        const result = ErrorHandler.handleValidationError(zodError);
        
        expect(result).toEqual({
          email: 'Expected string, received number',
          password: 'String must contain at least 8 character(s)'
        });
        expect(toast.error).toHaveBeenCalledWith(
          'Dados inválidos. Verifique os campos destacados.'
        );
      });
      
      it('should handle ValidationError', () => {
        const validationError = new ValidationError('Validation failed', {
          name: 'Nome é obrigatório',
          email: 'Email inválido'
        });
        
        const result = ErrorHandler.handleValidationError(validationError);
        
        expect(result).toEqual({
          name: 'Nome é obrigatório',
          email: 'Email inválido'
        });
        expect(toast.error).toHaveBeenCalledWith('Validation failed');
      });
      
      it('should handle generic errors', () => {
        const genericError = new Error('Generic validation error');
        
        const result = ErrorHandler.handleValidationError(genericError);
        
        expect(result).toEqual({});
        expect(toast.error).toHaveBeenCalledWith(
          'Erro de validação. Verifique os dados informados.'
        );
      });
    });
    
    describe('handleAuthError', () => {
      it('should handle AuthError', () => {
        const authError = new AuthError('Invalid credentials');
        
        ErrorHandler.handleAuthError(authError);
        
        expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
        expect(mockConsole.error).toHaveBeenCalled();
      });
      
      it('should handle generic auth errors', () => {
        const genericError = new Error('Auth failed');
        
        ErrorHandler.handleAuthError(genericError);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Erro de autenticação. Verifique suas credenciais.'
        );
      });
    });
    
    describe('handleFileUploadError', () => {
      it('should handle FileUploadError', () => {
        const fileError = new FileUploadError(
          'File too large',
          'document.pdf',
          'FILE_TOO_LARGE'
        );
        
        ErrorHandler.handleFileUploadError(fileError);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Erro no upload do arquivo "document.pdf": File too large'
        );
      });
      
      it('should handle generic file upload errors', () => {
        const genericError = new Error('Upload failed');
        
        ErrorHandler.handleFileUploadError(genericError);
        
        expect(toast.error).toHaveBeenCalledWith(
          'Erro no upload do arquivo. Tente novamente.'
        );
      });
    });
  });
  
  describe('Utility Functions', () => {
    describe('handleAsyncError', () => {
      it('should handle successful async operation', async () => {
        const successFn = vi.fn().mockResolvedValue('success');
        
        const result = await handleAsyncError(successFn);
        
        expect(result).toBe('success');
        expect(successFn).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
      });
      
      it('should handle async operation with error', async () => {
        const errorFn = vi.fn().mockRejectedValue(new Error('Async error'));
        
        const result = await handleAsyncError(errorFn);
        
        expect(result).toBeNull();
        expect(errorFn).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          'Ocorreu um erro inesperado. Tente novamente.'
        );
      });
      
      it('should use custom error handler', async () => {
        const errorFn = vi.fn().mockRejectedValue(new Error('Custom error'));
        const customHandler = vi.fn();
        
        const result = await handleAsyncError(errorFn, customHandler);
        
        expect(result).toBeNull();
        expect(customHandler).toHaveBeenCalledWith(expect.any(Error));
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
    
    describe('catchErrors decorator', () => {
      it('should catch errors in decorated method', async () => {
        class TestClass {
          @catchErrors()
          async testMethod() {
            throw new Error('Method error');
          }
        }
        
        const instance = new TestClass();
        const result = await instance.testMethod();
        
        expect(result).toBeUndefined();
        expect(toast.error).toHaveBeenCalledWith(
          'Ocorreu um erro inesperado. Tente novamente.'
        );
      });
      
      it('should return result for successful method', async () => {
        class TestClass {
          @catchErrors()
          async testMethod() {
            return 'success';
          }
        }
        
        const instance = new TestClass();
        const result = await instance.testMethod();
        
        expect(result).toBe('success');
        expect(toast.error).not.toHaveBeenCalled();
      });
      
      it('should use custom error handler in decorator', async () => {
        const customHandler = vi.fn();
        
        class TestClass {
          @catchErrors(customHandler)
          async testMethod() {
            throw new Error('Decorator error');
          }
        }
        
        const instance = new TestClass();
        await instance.testMethod();
        
        expect(customHandler).toHaveBeenCalledWith(expect.any(Error));
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });
  
  describe('Error Integration', () => {
    it('should handle complex error scenarios', () => {
      // Simular erro de API com dados de validação
      const complexError = {
        status: 422,
        message: 'Validation failed',
        data: {
          errors: {
            email: ['Email já está em uso'],
            password: ['Senha muito fraca']
          }
        }
      };
      
      ErrorHandler.handleApiError(complexError);
      
      expect(toast.error).toHaveBeenCalledWith(
        'Dados inválidos. Verifique as informações e tente novamente.'
      );
      expect(mockConsole.error).toHaveBeenCalled();
    });
    
    it('should handle error chaining', async () => {
      const chainedError = async () => {
        try {
          throw new ValidationError('Initial validation error', {
            field: 'Invalid field'
          });
        } catch {
          throw new AppError('Wrapped error', 'WRAPPED_ERROR', 500);
        }
      };
      
      await handleAsyncError(chainedError);
      
      expect(toast.error).toHaveBeenCalledWith(
        'Ocorreu um erro inesperado. Tente novamente.'
      );
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });
});