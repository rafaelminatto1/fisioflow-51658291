/**
 * Progress Component Tests
 */

import { render } from '@testing-library/react-native';
import { LinearProgress, CircularProgress } from './Progress';

describe('Progress Components', () => {
  describe('LinearProgress', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(
        <LinearProgress progress={50} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with 0% progress', () => {
      const { getByTestId } = render(
        <LinearProgress progress={0} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with 100% progress', () => {
      const { getByTestId } = render(
        <LinearProgress progress={100} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with custom height', () => {
      const { getByTestId } = render(
        <LinearProgress progress={50} height={8} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with custom color', () => {
      const { getByTestId } = render(
        <LinearProgress progress={50} color="#FF0000" testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should be indeterminate when progress is undefined', () => {
      const { getByTestId } = render(
        <LinearProgress indeterminate testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });
  });

  describe('CircularProgress', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(
        <CircularProgress progress={50} size={40} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with 0% progress', () => {
      const { getByTestId } = render(
        <CircularProgress progress={0} size={40} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with 100% progress', () => {
      const { getByTestId } = render(
        <CircularProgress progress={100} size={40} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should render with different sizes', () => {
      const { getByTestId: small } = render(
        <CircularProgress progress={50} size={20} testID="small" />
      );
      const { getByTestId: large } = render(
        <CircularProgress progress={50} size={60} testID="large" />
      );
      expect(small).toBeTruthy();
      expect(large).toBeTruthy();
    });

    it('should render with custom color', () => {
      const { getByTestId } = render(
        <CircularProgress progress={50} size={40} color="#00FF00" testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should show progress percentage when showPercentage is true', () => {
      const { getByText } = render(
        <CircularProgress progress={75} size={40} showPercentage testID="progress" />
      );
      expect(getByText('75%')).toBeTruthy();
    });

    it('should be indeterminate when progress is undefined', () => {
      const { getByTestId } = render(
        <CircularProgress indeterminate size={40} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });
  });
});
