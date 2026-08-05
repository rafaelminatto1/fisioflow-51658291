import { Redirect } from "expo-router";
import { isAuthorized, useAuthStore } from "@/store/auth";

export default function Index() {
  const { isAuthenticated, isLocked, user } = useAuthStore();

  if (isAuthenticated && user && isAuthorized(user.role)) {
    // Sessão válida mas bloqueada por inatividade: exige PIN/biometria antes do app.
    if (isLocked) {
      return <Redirect href="/(auth)/unlock" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
