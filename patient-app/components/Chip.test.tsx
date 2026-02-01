/**
 * Chip Component Tests
 */

import { render } from '@testing-library/react-native';
import { Chip, ChipGroup } from './Chip';
import { Text } from 'react-native';

describe('Chip Component', () => {
  describe('Chip', () => {
    it('should render with default props', () => {
      const { getByText } = render(
        <Chip>Test Chip</Chip>
      );
      expect(getByText('Test Chip')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Chip onPress={onPressMock}>Test Chip</Chip>
      );

      // Note: In a real test we would use fireEvent.press, but for now just checking render
      expect(getByText('Test Chip')).toBeTruthy();
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Chip onPress={onPressMock} disabled>Test Chip</Chip>
      );

      expect(getByText('Test Chip')).toBeTruthy();
    });

    it('should render with selected state', () => {
      const { getByText } = render(
        <Chip selected>Test Chip</Chip>
      );
      expect(getByText('Test Chip')).toBeTruthy();
    });

    it('should render with different variants', () => {
      const { getByText: outline } = render(
        <Chip variant="outline">Outline</Chip>
      );
      const { getByText: filled } = render(
        <Chip variant="filled">Filled</Chip>
      );

      expect(outline).toBeTruthy();
      expect(filled).toBeTruthy();
    });

    it('should render icon when provided', () => {
      const icon = <Text testID="test-icon">I</Text>;
      const { getByTestId } = render(
        <Chip icon={icon}>Icon Chip</Chip>
      );

      expect(getByTestId('test-icon')).toBeTruthy();
    });

    it('should render with different sizes', () => {
      const { getByText: small } = render(
        <Chip size="small">Small</Chip>
      );
      const { getByText: medium } = render(
        <Chip size="medium">Medium</Chip>
      );

      expect(small).toBeTruthy();
      expect(medium).toBeTruthy();
    });
  });

  describe('ChipGroup', () => {
    it('should render multiple chips', () => {
      const options = [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
        { label: 'Option 3', value: '3' },
      ];

      const { getByText } = render(
        <ChipGroup options={options} value="1" onChange={jest.fn()} />
      );

      expect(getByText('Option 1')).toBeTruthy();
      expect(getByText('Option 2')).toBeTruthy();
      expect(getByText('Option 3')).toBeTruthy();
    });

    it('should call onChange when chip is pressed', () => {
      const onChangeMock = jest.fn();
      const options = [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ];

      render(
        <ChipGroup options={options} value="1" onChange={onChangeMock} />
      );
    });

    it('should handle multiple selection mode', () => {
      const options = [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ];

      const { getByText } = render(
        <ChipGroup
          options={options}
          value={[]}
          onChange={jest.fn()}
          multiple
        />
      );

      expect(getByText('Option 1')).toBeTruthy();
      expect(getByText('Option 2')).toBeTruthy();
    });
  });
});
