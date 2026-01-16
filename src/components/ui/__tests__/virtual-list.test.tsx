/**
 * Tests for VirtualizedList component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { VirtualizedList, useVirtualizedList } from '@/components/ui/virtualized-list';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

describe('VirtualizedList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    name: `Item ${i + 1}`,
  }));

  const renderItem = (item: { id: string; name: string }) => (
    <div data-testid={`item-${item.id}`} style={{ height: '50px' }}>
      {item.name}
    </div>
  );

  const keyExtractor = (item: { id: string }) => item.id;

  it('should render visible items only', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
      />
    );

    // With 200px container and 50px items, should render ~4-7 items (with overscan)
    const visibleItems = container.querySelectorAll('[data-virtual-index]');
    expect(visibleItems.length).toBeGreaterThan(0);
    expect(visibleItems.length).toBeLessThan(items.length);
  });

  it('should render empty state when no items', () => {
    const { getByText } = render(
      <VirtualizedList
        items={[]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
        emptyState={<div>No items found</div>}
      />
    );

    expect(getByText('No items found')).toBeInTheDocument();
  });

  it('should render loading indicator', () => {
    const { getByText } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
        isLoading={true}
        loadingIndicator={<div>Loading...</div>}
      />
    );

    expect(getByText('Loading...')).toBeInTheDocument();
  });

  it('should call onEndReached when scrolling to end', async () => {
    const onEndReached = vi.fn();

    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
        onEndReached={onEndReached}
        endReachedThreshold={100}
      />
    );

    const scrollContainer = container.querySelector('.overflow-auto') as HTMLElement;
    if (scrollContainer) {
      // Simulate scrolling to bottom
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 200, writable: true });

      scrollContainer.dispatchEvent(new Event('scroll', {
        bubbles: true,
        cancelable: true,
      }));

      await waitFor(() => {
        expect(onEndReached).toHaveBeenCalled();
      });
    }
  });

  it('should render header and footer', () => {
    const { getByText } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
        renderHeader={() => <div>Header</div>}
        renderFooter={() => <div>Footer</div>}
      />
    );

    expect(getByText('Header')).toBeInTheDocument();
    expect(getByText('Footer')).toBeInTheDocument();
  });

  it('should handle dynamic item heights', () => {
    const itemsWithDynamicHeight = items.map((item, i) => ({
      ...item,
      height: 30 + (i % 5) * 10, // Heights from 30 to 70
    }));

    const { container } = render(
      <VirtualizedList
        items={itemsWithDynamicHeight}
        renderItem={(item) => (
          <div data-testid={`item-${item.id}`} style={{ height: `${item.height}px` }}>
            {item.name}
          </div>
        )}
        keyExtractor={(item) => item.id}
        itemHeight={(item) => item.height}
        height={300}
      />
    );

    // Should render without errors
    const visibleItems = container.querySelectorAll('[data-virtual-index]');
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it('should handle overscan correctly', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
        overscan={5}
      />
    );

    // With overscan=5, should render more items than the viewport can show
    const visibleItems = container.querySelectorAll('[data-virtual-index]');
    const viewportItems = Math.ceil(200 / 50); // ~4 items fit in viewport

    expect(visibleItems.length).toBeGreaterThan(viewportItems);
  });

  it('should expose scrollToIndex method', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        height={200}
      />
    );

    const virtualListElement = container.querySelector('[data-virtual-list]') as any;
    expect(virtualListElement).toBeDefined();
    expect(typeof virtualListElement.scrollToIndex).toBe('function');
  });
});

describe('useVirtualizedList hook', () => {
  it('should manage visible items state', () => {
    const { result } = renderHook(() =>
      useVirtualizedList(
        Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Item ${i}` })),
        {
          itemHeight: 50,
          containerHeight: 200,
        }
      )
    );

    expect(result.current.visibleItems).toHaveLength(20);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(20);
    expect(result.current.totalItems).toBe(100);
  });

  it('should load more items', () => {
    const { result } = renderHook(() =>
      useVirtualizedList(
        Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Item ${i}` })),
        {
          itemHeight: 50,
          containerHeight: 200,
        }
      )
    );

    act(() => {
      result.current.loadMore(20, 40);
    });

    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(40);
  });
});
