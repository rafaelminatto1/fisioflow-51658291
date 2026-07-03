import React from "react";
import { render } from "@testing-library/react-native";
import { MeasurementLayer } from "../MeasurementLayer";

describe("MeasurementLayer", () => {
  it("renders without annotations", () => {
    const { getByTestId } = render(<MeasurementLayer annotations={[]} />);
    expect(getByTestId("measurement-layer")).toBeTruthy();
  });

  it("renders a line annotation", () => {
    const annotations = [
      {
        id: "1",
        type: "line" as const,
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
        color: "#ff0000"
      }
    ];
    
    const { getByTestId } = render(<MeasurementLayer annotations={annotations} />);
    const line = getByTestId("annotation-line-1");
    expect(line).toBeTruthy();
    expect(line.props.x1).toBe(10);
    expect(line.props.y1).toBe(10);
    expect(line.props.x2).toBe(50);
    expect(line.props.y2).toBe(50);
  });
  it("renders an angle annotation", () => {
    const annotations = [
      {
        id: "2",
        type: "angle" as const,
        points: [{ x: 10, y: 10 }, { x: 10, y: 50 }, { x: 50, y: 50 }],
        color: "#00ff00"
      }
    ];

    const { getByTestId } = render(<MeasurementLayer annotations={annotations} />);
    const angleText = getByTestId("annotation-angle-text-2");
    expect(angleText).toBeTruthy();
    // Angle should be 90 degrees based on points (10,10) -> (10,50) -> (50,50)
    expect(angleText.props.children.props.children).toBe("90.0°");
  });
});
