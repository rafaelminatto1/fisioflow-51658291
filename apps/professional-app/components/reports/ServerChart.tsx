import React, { useState, useEffect } from "react";
import { View, Image, ActivityIndicator, StyleSheet, Text } from "react-native";
import { config } from "@/lib/config";
import { getToken } from "@/lib/token-storage";
import { useColors } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";

interface ServerChartProps {
  endpoint: string;
  width?: number | string;
  height?: number;
}

export function ServerChart({ endpoint, width = "100%", height = 220 }: ServerChartProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const colors = useColors();

  useEffect(() => {
    let mounted = true;
    getToken().then((t) => {
      if (mounted) {
        setToken(t);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { width, height, backgroundColor: colors.background + "40" }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !token) {
    return (
      <View style={[styles.container, { width, height, backgroundColor: colors.background + "40" }]}>
        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Falha ao carregar gráfico
        </Text>
      </View>
    );
  }

  const uri = `${config.apiUrl}${endpoint}${endpoint.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setError(true)}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  loadingOverlay: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
  },
});
