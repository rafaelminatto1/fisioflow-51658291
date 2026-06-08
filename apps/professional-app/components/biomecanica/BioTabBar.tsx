import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, Video, Users, ListChecks, Menu } from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";

type TabKey = "painel" | "captura" | "pacientes" | "testes" | "mais";

const TABS: { key: TabKey; label: string; Icon: typeof Video; href?: string }[] = [
  { key: "painel", label: "Painel", Icon: LayoutDashboard, href: "/biomecanica" },
  { key: "captura", label: "Captura", Icon: Video, href: "/biomecanica/capture" },
  { key: "pacientes", label: "Pacientes", Icon: Users, href: "/(tabs)/patients" },
  { key: "testes", label: "Testes", Icon: ListChecks, href: "/biomecanica/tests" },
  { key: "mais", label: "Mais", Icon: Menu, href: "/(tabs)" },
];

export function BioTabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(({ key, label, Icon, href }) => {
        const isActive = key === active;
        const color = isActive ? bio.primary : bio.mutedSoft;
        return (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => href && router.push(href as never)}
            hitSlop={6}
          >
            <Icon size={22} color={color} strokeWidth={2} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: bio.card,
    borderTopWidth: 1,
    borderTopColor: bio.border,
    paddingTop: 9,
    paddingHorizontal: 12,
  },
  tab: { alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, minWidth: 56 },
  label: { fontSize: 10, fontFamily: font.bold, letterSpacing: 0.2 },
});
