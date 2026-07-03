import React from "react";
import { render } from "@testing-library/react-native";
import { JumpAnalysis } from "../JumpAnalysis";

describe("JumpAnalysis", () => {
  it("renders 'Select takeoff and landing' when no flight time is available", () => {
    const { getByText } = render(<JumpAnalysis flightTimeMs={0} />);
    expect(getByText("Selecione os pontos de decolagem e aterrissagem")).toBeTruthy();
  });

  it("calculates jump height correctly for a given flight time", () => {
    // Flight time = 500ms (0.5s)
    // h = (t^2 * 9.81) / 8 = (0.25 * 9.81) / 8 = 0.3065625m = ~30.6cm
    const { getByTestId } = render(<JumpAnalysis flightTimeMs={500} />);
    const heightText = getByTestId("jump-height-result");
    expect(heightText.props.children).toContain("30.7");
  });
});
