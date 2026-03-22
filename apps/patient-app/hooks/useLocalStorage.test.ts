/**
 * useLocalStorage Hook Tests
 */


// Mock AsyncStorage

import { useLocalStorage } from './useLocalStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export useLocalStorage function', () => {
    expect(typeof useLocalStorage).toBe('function');
  });

  it('should have correct number of parameters', () => {
    expect(useLocalStorage.length).toBe(2); // key and initialValue
  });
});
