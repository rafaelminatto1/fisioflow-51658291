import { Alert, Platform, ToastAndroid } from "react-native";

type ToastVariant = "success" | "error" | "info" | "warning";

const TITLES: Record<ToastVariant, string> = {
  success: "Sucesso",
  error: "Erro",
  info: "Aviso",
  warning: "Atenção",
};

function show(message: string, variant: ToastVariant) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  // iOS não tem toast nativo: usamos Alert como feedback equivalente.
  Alert.alert(TITLES[variant], message);
}

export const toast = {
  show: (message: string) => show(message, "info"),
  success: (message: string) => show(message, "success"),
  error: (message: string) => show(message, "error"),
  info: (message: string) => show(message, "info"),
  warning: (message: string) => show(message, "warning"),
};
