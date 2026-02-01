/**
 * useLocalStorage Hook Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useLocalStorage } from './useLocalStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default value', async () => {
    (require('@react-native-async-storage/async-storage').getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    expect(result.current[0]).toBe('default');
  });

  it('should load saved value on mount', async () => {
    (require('@react-native-async-storage/async-storage').getItem as jest.Mock).mockResolvedValue('saved');

    const { result, waitForNextUpdate } = renderHook(() => useLocalStorage('key', 'default'));

    // Wait for the async load
    await waitForNextUpdate();

    expect(result.current[0]).toBe('saved');
  });

  it('should save value when setValue is called', async () => {
    (require('@react-native-async-storage/async-storage').getItem as jest.Mock).mockResolvedValue(null);
    (require('@react-native-async-storage/async-storage').setItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    const [, setValue] = result.current;

    await act(async () => {
      await setValue('new-value');
    });

    expect(require('@react-native-async-storage/async-storage').setItem).toHaveBeenCalledWith('key', 'new-value');
  });

  it('should remove value when setValue is called with null', async () => {
    (require('@react-native-async-storage/async-storage').getItem as jest.Mock).mockResolvedValue('saved');
    (require('@react-native-async-storage/async-storage').removeItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    const [, setValue] = result.current;

    await act(async () => {
      await setValue(null);
    });

    expect(require('@react-native-async-storage/async-storage').removeItem).toHaveBeenCalledWith('key');
  });

  it('should return value and setValue', () => {
    (require('@react-native-async-storage/async-storage').getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    const [value, setValue] = result.current;

    expect(value).toBe('default');
    expect(setValue).toBeDefined();
    expect(typeof setValue).toBe('function');
  });
});
