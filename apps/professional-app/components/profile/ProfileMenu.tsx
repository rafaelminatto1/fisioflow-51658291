import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ProfileSection({ title, children }: ProfileSectionProps) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.prototype.props.name;
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  value?: string;
  iconColor?: string;
}

export function ProfileMenuItem({
  icon,
  label,
  onPress,
  showDivider = true,
  value,
  iconColor,
}: ProfileMenuItemProps) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.6}>
      <View style={[styles.iconWrapper, { backgroundColor: (iconColor || colors.primary) + "10" }]}>
        <Ionicons name={icon as any} size={20} color={iconColor || colors.primary} />
      </View>
      <View
        style={[
          styles.menuItemContent,
          showDivider && { borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
        ]}
      >
        <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
        <View style={styles.menuItemRight}>
          {value && (
            <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>{value}</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface SettingsItemProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

export function SettingsItem({ label, value, onToggle }: SettingsItemProps) {
  const colors = useColors();
  return (
    <View style={styles.menuItem}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.info + "10" }]}>
        <Ionicons name="options-outline" size={20} color={colors.info} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + "80" }}
          thumbColor={value ? colors.primary : "#f4f3f4"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingRight: 16,
    marginLeft: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemValue: {
    fontSize: 13,
  },
});
