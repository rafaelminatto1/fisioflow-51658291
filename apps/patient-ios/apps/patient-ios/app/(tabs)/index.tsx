import { View, Text, StyleSheet } from "react-native";

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FisioFlow Pacientes</Text>
      <Text style={styles.subtitle}>Bem-vindo ao seu app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#1E293B" },
  subtitle: { fontSize: 16, color: "#64748B", marginTop: 4 },
});
