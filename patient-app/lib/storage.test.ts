/**
 * Storage Utilities Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Storage } from './storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('Storage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Storage.get', () => {
    it('should retrieve string value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('value');

      const result = await Storage.get('key');

      expect(result).toBe('value');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('key');
    });

    it('should parse JSON object', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{"foo":"bar"}');

      const result = await Storage.get<{ foo: string }>('key');

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for missing key', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await Storage.get('key');

      expect(result).toBeNull();
    });
  });

  describe('Storage.set', () => {
    it('should store string value', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await Storage.set('key', 'value');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', 'value');
    });

    it('should store object as JSON', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await Storage.set('key', { foo: 'bar' });

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify({ foo: 'bar' }));
    });
  });

  describe('Storage.remove', () => {
    it('should remove item', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await Storage.remove('key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key');
    });
  });

  describe('Storage.clear', () => {
    it('should clear all storage', async () => {
      (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);

      await Storage.clear();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Storage.getAllKeys', () => {
    it('should return all keys', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['key1', 'key2']);

      const keys = await Storage.getAllKeys();

      expect(keys).toEqual(['key1', 'key2']);
    });
  });

  describe('Storage.has', () => {
    it('should check if key exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('value');

      const result = await Storage.has('key');

      expect(result).toBe(true);
    });

    it('should return false for missing key', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await Storage.has('key');

      expect(result).toBe(false);
    });
  });
});
