/**
 * Separator Component Tests
 */

import { render } from '@testing-library/react-native';
import { Separator, Spacing } from './Separator';

describe('Separator Component', () => {
  describe('Separator', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(<Separator testID="separator" />);
      expect(getByTestId('separator')).toBeTruthy();
    });

    it('should render with custom height', () => {
      const { getByTestId } = render(<Separator height={2} testID="separator" />);
      expect(getByTestId('separator')).toBeTruthy();
    });

    it('should render with custom color', () => {
      const { getByTestId } = render(<Separator color="#FF0000" testID="separator" />);
      expect(getByTestId('separator')).toBeTruthy();
    });

    it('should render with vertical orientation', () => {
      const { getByTestId } = render(<Separator vertical testID="separator" />);
      expect(getByTestId('separator')).toBeTruthy();
    });
  });

  describe('Spacing', () => {
    it('should render different sizes', () => {
      const { getByTestId: xs } = render(<Spacing size="xs" testID="xs" />);
      const { getByTestId: md } = render(<Spacing size="md" testID="md" />);
      const { getByTestId: xl } = render(<Spacing size="xl" testID="xl" />);

      expect(xs).toBeTruthy();
      expect(md).toBeTruthy();
      expect(xl).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { getByTestId } = render(<Spacing size={20} testID="spacing" />);
      expect(getByTestId('spacing')).toBeTruthy();
    });

    it('should render horizontal spacing', () => {
      const { getByTestId } = render(<Spacing horizontal testID="spacing" />);
      expect(getByTestId('spacing')).toBeTruthy();
    });
  });
});
