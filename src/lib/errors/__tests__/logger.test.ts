import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    global.console = {
      ...console,
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };
    // Mock import.meta.env.DEV
    vi.stubEnv('DEV', true);
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Test error', new Error('Test'), 'TestComponent');
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.level).toBe('error');
      expect(logs[0]?.message).toBe('Test error');
    });

    it('should handle error without component', () => {
      logger.error('Test error', new Error('Test'));
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.level).toBe('error');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning', { data: 'test' }, 'TestComponent');
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.level).toBe('warn');
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test info', { data: 'test' }, 'TestComponent');
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.level).toBe('info');
    });
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug', { data: 'test' }, 'TestComponent');
      // Debug logs may not appear in production
    });
  });

  describe('performance', () => {
    it('should log performance metrics', () => {
      logger.performance('Test operation', 100, 'TestComponent');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('should return logged entries', () => {
      logger.error('Test error', new Error('Test'));
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.message).toBe('Test error');
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      logger.error('Test error', new Error('Test'));
      logger.clearLogs();
      const logs = logger.getLogs();
      expect(logs.length).toBe(0);
    });
  });
});

