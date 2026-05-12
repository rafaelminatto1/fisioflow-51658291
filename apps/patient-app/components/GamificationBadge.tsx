import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";

interface GamificationBadgeProps {
  name: string;
  description?: string;
  imageUrl?: string | null;
  unlockedAt?: string | null;
  size?: number;
}

export const GamificationBadge: React.FC<GamificationBadgeProps> = ({
  name,
  description,
  imageUrl,
  unlockedAt,
  size = 64,
}) => {
  const colors = useColors();
  const isLocked = !unlockedAt;

  return (
    <View style={[styles.container, { width: size + 20 }]}>
      <View
        style={[
          styles.badgeWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isLocked ? colors.surfaceVariant : colors.primary + "15",
            borderColor: isLocked ? colors.border : colors.primary,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              { width: size * 0.7, height: size * 0.7, opacity: isLocked ? 0.3 : 1 },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Ionicons
            name={isLocked ? "lock-closed" : "trophy"}
            size={size * 0.5}
            color={isLocked ? colors.textMuted : colors.primary}
          />
        )}
      </View>
      <Text
        style={[
          styles.name,
          { color: isLocked ? colors.textMuted : colors.text, fontSize: size * 0.18 },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  badgeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 6,
    overflow: "hidden",
  },
  image: {
    borderRadius: 8,
  },
  name: {
    fontWeight: "700",
    textAlign: "center",
  },
});
