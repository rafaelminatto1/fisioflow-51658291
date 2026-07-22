import { render, screen } from '@testing-library/react';
import { MeasurementDiagramYBalance } from '../MeasurementDiagramYBalance';

describe('MeasurementDiagramYBalance', () => {
  test('renders without throwing when values are empty', () => {
    const values = {};
    const onChange = () => {};
    
    expect(() => {
      const component = render(
        <MeasurementDiagramYBalance
          values={values}
          onChange={onChange}
        />
      );
      return component;
    }).not.toThrow();
  });

  test('renders without throwing when values are filled', () => {
    const values = { anterior: '20', posteromedial: '30', posterolateral: '25' };
    const onChange = () => {};
    
    expect(() => {
      const component = render(
        <MeasurementDiagramYBalance
          values={values}
          onChange={onChange}
        />
      );
      return component;
    }).not.toThrow();
  });

  test('renders successfully with complete props', () => {
    const values = { anterior: '20', posteromedial: '30', posterolateral: '25' };
    const onChange = jest.fn();
    
    expect(() => {
      return render(
        <MeasurementDiagramYBalance
          values={values}
          onChange={onChange}
          unit="cm"
          compositeLabel="Composto (média)"
        />
      );
    }).not.toThrow();
  });

  test('contains expected UI elements when values present', () => {
    const values = { anterior: '20', posteromedial: '30', posterolateral: '25' };
    render(
      <MeasurementDiagramYBalance
        values={values}
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
    expect(screen.getByText('PL')).toBeInTheDocument();
  });
});