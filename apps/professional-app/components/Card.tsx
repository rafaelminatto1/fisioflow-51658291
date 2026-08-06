import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { radius, shadow } from "@/constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: "none" | "sm" | "md" | "lg";
  /**
   * Eleva a superfície. Use apenas para conteúdo que FLUTUA sobre a página —
   * popover, menu, bottom sheet.
   *
   * O design system pede card chapado: a separação vem da borda e do fundo,
   * não da sombra. Card de lista com sombra é o erro mais comum ao portar
   * este kit, e é o que faz uma tela de FisioFlow parecer um template
   * genérico. Por isso o padrão é `false` e elevar exige dizer que quer.
   */
  elevated?: boolean;
}

export function Card({ children, style, padding = "md", elevated = false }: CardProps) {
  const colors = useColors();

  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return 12;
      case "lg":
        return 24;
      default:
        return 16;
    }
  };

  return (
    <View
      style={[
        styles.card,
        elevated && shadow.popover,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: getPadding(),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
