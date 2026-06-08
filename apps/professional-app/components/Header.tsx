import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, showBackButton = true, onBack, right }: HeaderProps) {
  const colors = useColors();

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  backButton: {
    padding: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flexShrink: 1,
  },
});
