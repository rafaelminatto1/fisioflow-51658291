import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MeasurementDiagramYBalance } from '../MeasurementDiagramYBalance';

describe('MeasurementDiagramYBalance', () => {
  test('renders without throwing when values are empty', () => {
    const values = {};
    const onChange = vi.fn();

    expect(() => {
      render(
        <MeasurementDiagramYBalance
          values={values}
          onChange={onChange}
        />
      );
    }).not.toThrow();
  });

  test('renders without throwing when values are filled', () => {
    const values = { anterior: '20', posteromedial: '30', posterolateral: '25' };
    const onChange = vi.fn();

    expect(() => {
      render(
        <MeasurementDiagramYBalance
          values={values}
          onChange={onChange}
        />
      );
    }).not.toThrow();
  });

  test('renders successfully with complete props', () => {
    const values = { anterior: '20', posteromedial: '30', posterolateral: '25' };
    const onChange = vi.fn();

    expect(() => {
      render(
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

    // Full direction names appear once (in input section <p> tags)
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Posteromedial')).toBeInTheDocument();
    expect(screen.getByText('Posterolateral')).toBeInTheDocument();

    // Short labels (ANT, PM, PL) appear twice: in SVG <text> and in input <span>
    expect(screen.getAllByText('ANT')).toHaveLength(2);
    expect(screen.getAllByText('PM')).toHaveLength(2);
    expect(screen.getAllByText('PL')).toHaveLength(2);
  });
});
