/**
 * useToggle Hook Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToggle, useArray, useCounter } from './useHooks';

describe('Utility Hooks', () => {
  describe('useToggle', () => {
    it('should toggle boolean value', () => {
      const { result } = renderHook(() => useToggle(true));

      expect(result.current[0]).toBe(true);

      act(() => {
        result.current[1]();
      });

      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1]();
      });

      expect(result.current[0]).toBe(true);
    });

    it('should start with false as default', () => {
      const { result } = renderHook(() => useToggle());

      expect(result.current[0]).toBe(false);
    });
  });

  describe('useArray', () => {
    it('should provide array operations', () => {
      const { result } = renderHook(() => useArray([1, 2, 3]));

      const [array, { push, remove, update, clear, filter }] = result.current;

      expect(array).toEqual([1, 2, 3]);
      expect(push).toBeDefined();
      expect(remove).toBeDefined();
      expect(update).toBeDefined();
      expect(clear).toBeDefined();
      expect(filter).toBeDefined();
    });

    it('should push item to array', () => {
      const { result } = renderHook(() => useArray<number>([]));

      const [, { push }] = result.current;

      act(() => {
        push(1);
      });

      expect(result.current[0]).toEqual([1]);
    });

    it('should remove item from array', () => {
      const { result } = renderHook(() => useArray([1, 2, 3]));

      const [, { remove }] = result.current;

      act(() => {
        remove(1);
      });

      expect(result.current[0]).toEqual([1, 3]);
    });

    it('should filter array', () => {
      const { result } = renderHook(() => useArray([1, 2, 3, 4]));

      const [, { filter }] = result.current;

      act(() => {
        filter((item) => item % 2 === 0);
      });

      expect(result.current[0]).toEqual([2, 4]);
    });

    it('should clear array', () => {
      const { result } = renderHook(() => useArray([1, 2, 3]));

      const [, { clear }] = result.current;

      act(() => {
        clear();
      });

      expect(result.current[0]).toEqual([]);
    });
  });

  describe('useCounter', () => {
    it('should provide counter operations', () => {
      const { result } = renderHook(() => useCounter(5));

      const [count, { increment, decrement, reset, set }] = result.current;

      expect(count).toBe(5);
      expect(increment).toBeDefined();
      expect(decrement).toBeDefined();
      expect(reset).toBeDefined();
      expect(set).toBeDefined();
    });

    it('should start from 0 when no initial value provided', () => {
      const { result } = renderHook(() => useCounter());

      expect(result.current[0]).toBe(0);
    });

    it('should increment counter', () => {
      const { result } = renderHook(() => useCounter());

      const [, { increment }] = result.current;

      act(() => {
        increment();
      });

      expect(result.current[0]).toBe(1);
    });

    it('should decrement counter', () => {
      const { result } = renderHook(() => useCounter(5));

      const [, { decrement }] = result.current;

      act(() => {
        decrement();
      });

      expect(result.current[0]).toBe(4);
    });

    it('should reset counter to initial value', () => {
      const { result } = renderHook(() => useCounter(5));

      const [, { reset }] = result.current;

      act(() => {
        result.current[1](); // increment to 6
        reset();
      });

      expect(result.current[0]).toBe(5);
    });

    it('should set counter to specific value', () => {
      const { result } = renderHook(() => useCounter(0));

      const [, { set }] = result.current;

      act(() => {
        set(10);
      });

      expect(result.current[0]).toBe(10);
    });
  });
});
