import { useState, useEffect } from "react";

export type ColorScheme = "light" | "dark";

export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setScheme(isDark ? "dark" : "light");

    const matcher = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setScheme(e.matches ? "dark" : "light");
    };
    matcher.addEventListener("change", onChange);
    return () => matcher.removeEventListener("change", onChange);
  }, []);

  return scheme;
}

export function useColors() {
  const scheme = useColorScheme();
  return {
    text: scheme === "dark" ? "#ffffff" : "#000000",
    textSecondary: scheme === "dark" ? "#94a3b8" : "#64748b",
    background: scheme === "dark" ? "#0f172a" : "#ffffff",
  };
}
