import { useState, useEffect } from "react";
import { useColorScheme as useRNColorScheme, Appearance } from "react-native";
import { Colors, ColorScheme } from "@/constants/colors";

export function useColorScheme(): ColorScheme {
  const colorScheme = useRNColorScheme();
  return (colorScheme === "dark" ? "dark" : "light") as ColorScheme;
}

export function useColors() {
  const colorScheme = useColorScheme();
  return Colors[colorScheme];
}

// Hook para obter o esquema de cores atual sem depender do ciclo de renderização
export function useCurrentColorScheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    Appearance.getColorScheme() === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      setColorScheme(newScheme === "dark" ? "dark" : "light");
    });

    return () => subscription.remove();
  }, []);

  return colorScheme;
}
