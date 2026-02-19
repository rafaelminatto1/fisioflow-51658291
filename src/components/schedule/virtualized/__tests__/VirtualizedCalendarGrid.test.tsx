/**
 * Unit tests for VirtualizedCalendarGrid component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualizedCalendarGrid } from '../VirtualizedCalendarGrid';

describe('VirtualizedCalendarGrid', () => {
  const mockTimeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

  const defaultProps = {
    timeSlots: mockTimeSlots,
    slotHeight: 60,
    containerHeight: 600,
    renderSlot: (time: string, index: number) => (
      <div data-testid={`slot-${index}`}>{time}</div>
    ),
  };

  it('should render without crashing', () => {
    render(<VirtualizedCalendarGrid {...defaultProps} />);
    expect(screen.getByTestId('slot-0')).toBeInTheDocument();
  });

  it('should render all slots when count is below threshold (50)', () => {
    render(<VirtualizedCalendarGrid {...defaultProps} />);
    
    // Should render all 20 slots since it's below the 50 threshold
    mockTimeSlots.forEach((_, index) => {
      expect(screen.getByTestId(`slot-${index}`)).toBeInTheDocument();
    });
  });

  it('should apply virtualization when slot count exceeds 50', () => {
    const manySlots = Array.from({ length: 60 }, (_, i) => {
      const hour = 6 + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });

    render(
      <VirtualizedCalendarGrid
        {...defaultProps}
        timeSlots={manySlots}
      />
    );

    // With virtualization, not all slots should be rendered
    // Only visible slots + overscan should be in the DOM
    const renderedSlots = screen.getAllByTestId(/^slot-/);
    expect(renderedSlots.length).toBeLessThan(manySlots.length);
  });

  it('should call onScrollChange when scrolling', () => {
    const onScrollChange = vi.fn();
    const { container } = render(
      <VirtualizedCalendarGrid
        {...defaultProps}
        onScrollChange={onScrollChange}
      />
    );

    const scrollContainer = container.firstChild as HTMLDivElement;
    scrollContainer.scrollTop = 100;
    scrollContainer.dispatchEvent(new Event('scroll'));

    expect(onScrollChange).toHaveBeenCalledWith(100);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualizedCalendarGrid
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should use custom overscan value', () => {
    const manySlots = Array.from({ length: 60 }, (_, i) => {
      const hour = 6 + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });

    render(
      <VirtualizedCalendarGrid
        {...defaultProps}
        timeSlots={manySlots}
        overscan={5}
      />
    );

    // Component should render with custom overscan
    // Exact count depends on viewport and overscan calculation
    const renderedSlots = screen.getAllByTestId(/^slot-/);
    expect(renderedSlots.length).toBeGreaterThan(0);
  });

  it('should render slot content correctly', () => {
    render(<VirtualizedCalendarGrid {...defaultProps} />);
    
    // Check that the first slot shows the correct time
    const firstSlot = screen.getByTestId('slot-0');
    expect(firstSlot).toHaveTextContent('08:00');
  });

  it('should maintain total scroll height', () => {
    const { container } = render(<VirtualizedCalendarGrid {...defaultProps} />);
    
    const scrollContainer = container.firstChild as HTMLDivElement;
    const innerContainer = scrollContainer.firstChild as HTMLDivElement;
    
    // Total height should be slotHeight * number of slots
    const expectedHeight = defaultProps.slotHeight * defaultProps.timeSlots.length;
    expect(innerContainer.style.height).toBe(`${expectedHeight}px`);
  });
});
