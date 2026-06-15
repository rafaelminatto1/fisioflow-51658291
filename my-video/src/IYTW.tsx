import { Sequence, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import React from "react";

export const IYTW: React.FC = () => {
  const frame = useCurrentFrame();

  // Opacity animation for text
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{ flex: 1, backgroundColor: "white", position: "relative", fontFamily: "sans-serif" }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 80,
          fontWeight: "bold",
          color: "#1a365d",
          opacity,
        }}
      >
        Exercício IYTW
      </div>

      {/* Sequence I */}
      <Sequence from={0} durationInFrames={30}>
        <div
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Img
            src={staticFile("i.png")}
            style={{ width: 800, height: 600, objectFit: "contain" }}
          />
          <div style={{ fontSize: 60, marginTop: 20, fontWeight: "bold", color: "#2b6cb0" }}>
            Posição I
          </div>
        </div>
      </Sequence>

      {/* Sequence Y */}
      <Sequence from={30} durationInFrames={30}>
        <div
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Img
            src={staticFile("y.png")}
            style={{ width: 800, height: 600, objectFit: "contain" }}
          />
          <div style={{ fontSize: 60, marginTop: 20, fontWeight: "bold", color: "#2b6cb0" }}>
            Posição Y
          </div>
        </div>
      </Sequence>

      {/* Sequence T */}
      <Sequence from={60} durationInFrames={30}>
        <div
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Img
            src={staticFile("t.png")}
            style={{ width: 800, height: 600, objectFit: "contain" }}
          />
          <div style={{ fontSize: 60, marginTop: 20, fontWeight: "bold", color: "#2b6cb0" }}>
            Posição T
          </div>
        </div>
      </Sequence>

      {/* Sequence W */}
      <Sequence from={90} durationInFrames={30}>
        <div
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Img
            src={staticFile("w.png")}
            style={{ width: 800, height: 600, objectFit: "contain" }}
          />
          <div style={{ fontSize: 60, marginTop: 20, fontWeight: "bold", color: "#2b6cb0" }}>
            Posição W
          </div>
        </div>
      </Sequence>
    </div>
  );
};
