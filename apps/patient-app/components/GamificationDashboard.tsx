import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { useGamification } from "@/hooks/useGamification";
import { Card } from "./Card";
import { LinearProgress } from "./Progress";
import { GamificationBadge } from "./GamificationBadge";
import { Ionicons } from "@expo/vector-icons";

export const GamificationDashboard: React.FC = () => {
  const colors = useColors();
  const { profile, currentLevel, currentXp, xpPerLevel, progressPercentage, isLoading } = useGamification();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const badges = profile?.badges || [];

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.levelText}>{currentLevel}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]}>Nível {currentLevel}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {currentXp} / {xpPerLevel} XP para o próximo nível
          </Text>
        </View>
      </View>

      <LinearProgress
        progress={progressPercentage}
        height={10}
        color={colors.primary}
        style={styles.progressBar}
      />

      <View style={styles.badgesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Suas Conquistas</Text>
          <Text style={[styles.badgeCount, { color: colors.primary }]}>
            {badges.filter((b: any) => b.unlockedAt).length} / {badges.length || 5}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesScroll}
        >
          {badges.length > 0 ? (
            badges.map((badge: any) => (
              <GamificationBadge
                key={badge.id}
                name={badge.name}
                imageUrl={badge.imageUrl}
                unlockedAt={badge.unlockedAt}
                size={56}
              />
            ))
          ) : (
            // Placeholders se não houver badges no perfil ainda
            <>
              <GamificationBadge name="Iniciante" unlockedAt={new Date().toISOString()} size={56} />
              <GamificationBadge name="7 Dias" size={56} />
              <GamificationBadge name="Ativo" size={56} />
              <GamificationBadge name="Focado" size={56} />
            </>
          )}
        </ScrollView>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  levelText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
  },
  progressBar: {
    marginBottom: 20,
    borderRadius: 5,
  },
  badgesSection: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgesScroll: {
    paddingRight: 10,
    gap: 12,
  },
});
