import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Silhueta sagital simples (cabeça + tronco + pernas) usada em thumbs e players. */
export function Silhouette({
  width = 60,
  height = 120,
  color = "#94A3B8",
  opacity = 0.85,
}: {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 200" opacity={opacity}>
      <Circle cx="50" cy="22" r="9" fill={color} />
      <Path d="M50 31 L54 90 L44 90 Z" fill={color} />
      <Rect x="42" y="88" width="6" height="60" rx="3" fill={color} />
      <Rect x="52" y="88" width="6" height="60" rx="3" fill={color} />
    </Svg>
  );
}
