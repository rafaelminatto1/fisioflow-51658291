import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";

export type ToastVariant = "default" | "success" | "destructive" | "warning";

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  onClose?: () => void;
}

export function Toast({
  id,
  title,
  description,
  variant = "default",
  duration = 3000,
  action,
  onClose,
}: ToastProps) {
  const colors = useColors();
  const [isVisible, setIsVisible] = React.useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim.current, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      handleHide();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleHide = () => {
    Animated.timing(fadeAnim.current, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onClose?.();
    });
  };

  if (!isVisible) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          backgroundColor: colors.successLight,
          borderColor: colors.success,
          icon: "checkmark-circle",
          textColor: colors.success,
        };
      case "destructive":
        return {
          backgroundColor: colors.errorLight,
          borderColor: colors.error,
          icon: "alert-circle",
          textColor: colors.error,
        };
      case "warning":
        return {
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
          icon: "warning",
          textColor: colors.warning,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          icon: "information-circle",
          textColor: colors.text,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: fadeAnim.current,
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={variantStyles.icon as any} size={20} color={variantStyles.textColor} />
        </View>
        <View style={styles.textContainer}>
          {title && <Text style={[styles.title, { color: variantStyles.textColor }]}>{title}</Text>}
          {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          )}
        </View>
      </View>
      {action && (
        <TouchableOpacity
          onPress={() => {
            action.onPress();
            handleHide();
          }}
          style={styles.actionButton}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
