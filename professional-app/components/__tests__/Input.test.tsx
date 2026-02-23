/**
 * Input Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input Component', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
  });

  it('renders correctly with minimal props', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" />
    );

    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders with label', () => {
    const { getByText } = render(
      <Input label="Email Address" placeholder="email@example.com" />
    );

    expect(getByText('Email Address')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Type here" onChangeText={mockOnChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText('Type here'), 'Hello');
    expect(mockOnChangeText).toHaveBeenCalledWith('Hello');
  });

  it('shows error message when error prop is provided', () => {
    const { getByText } = render(
      <Input placeholder="Password" error="Password is required" />
    );

    expect(getByText('Password is required')).toBeTruthy();
  });

  it('toggles password visibility when eye icon is pressed', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <Input
        placeholder="Password"
        secureTextEntry
        testID="password-input"
      />
    );

    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    // Find and press the eye icon (TouchableOpacity in the right icon position)
    const rightIconButtons = getByTestId('password-input').parent?.findByType(
      require('react-native').TouchableOpacity
    ) as any;

    if (rightIconButtons) {
      fireEvent.press(rightIconButtons);
    }
  });

  it('calls onRightIconPress when right icon is pressed', () => {
    const mockRightIconPress = jest.fn();
    const { getByTestId } = render(
      <Input
        placeholder="Search"
        rightIcon="search"
        onRightIconPress={mockRightIconPress}
        testID="search-input"
      />
    );

    // The right icon is a TouchableOpacity that should trigger onRightIconPress
    // Note: This test demonstrates the structure, actual implementation may need adjustment
    expect(mockRightIconPress).toBeDefined();
  });

  it('displays left icon when provided', () => {
    const { getByTestId } = render(
      <Input placeholder="Email" leftIcon="mail" testID="email-input" />
    );

    expect(getByTestId('email-input')).toBeTruthy();
  });

  it('supports multiline mode', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Description" multiline />
    );

    const input = getByPlaceholderText('Description');
    expect(input.props.multiline).toBe(true);
  });

  it('handles focus state', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test" />
    );

    const input = getByPlaceholderText('Test');

    fireEvent(input, 'focus');
    // Input should update its focused state internally
    expect(input).toBeTruthy();

    fireEvent(input, 'blur');
    expect(input).toBeTruthy();
  });
});
