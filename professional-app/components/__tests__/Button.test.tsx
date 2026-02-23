/**
 * Button Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const { getByText } = render(
      <Button title="Disabled" onPress={mockOnPress} disabled />
    );

    fireEvent.press(getByText('Disabled'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const { getByRole } = render(
      <Button title="Loading" onPress={mockOnPress} loading />
    );

    // Button should be disabled when loading
    expect(getByRole('button')).toBeDisabled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { getByRole, queryByText } = render(
      <Button title="Loading" onPress={mockOnPress} loading />
    );

    expect(getByRole('button', { name: 'Loading' })).toBeTruthy();
    expect(queryByText('Loading')).toBeNull();
  });

  it('renders with different variants', () => {
    const { getByText, rerender } = render(
      <Button title="Primary" onPress={mockOnPress} variant="primary" />
    );
    expect(getByText('Primary')).toBeTruthy();

    rerender(<Button title="Secondary" onPress={mockOnPress} variant="secondary" />);
    expect(getByText('Secondary')).toBeTruthy();

    rerender(<Button title="Outline" onPress={mockOnPress} variant="outline" />);
    expect(getByText('Outline')).toBeTruthy();

    rerender(<Button title="Ghost" onPress={mockOnPress} variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { getByText, rerender } = render(
      <Button title="Small" onPress={mockOnPress} size="sm" />
    );
    expect(getByText('Small')).toBeTruthy();

    rerender(<Button title="Medium" onPress={mockOnPress} size="md" />);
    expect(getByText('Medium')).toBeTruthy();

    rerender(<Button title="Large" onPress={mockOnPress} size="lg" />);
    expect(getByText('Large')).toBeTruthy();
  });

  it('has correct accessibility props', () => {
    const { getByRole } = render(
      <Button title="Accessible Button" onPress={mockOnPress} />
    );

    const button = getByRole('button', { name: 'Accessible Button' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
  });

  it('has disabled accessibility state when disabled', () => {
    const { getByRole } = render(
      <Button title="Disabled Button" onPress={mockOnPress} disabled />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
  });

  it('has busy accessibility state when loading', () => {
    const { getByRole } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 10 };
    const { getByRole } = render(
      <Button title="Styled" onPress={mockOnPress} style={customStyle} />
    );

    expect(getByRole('button').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});
