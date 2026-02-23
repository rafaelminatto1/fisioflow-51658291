import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { AuthGuard } from '@/components/navigation/AuthGuard';

export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        presentation: 'card',
      }}
    >
      {/* Rotas protegidas - requer autenticação */}
      <AuthGuard>
        <Stack.Screen
          name="agenda/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="agenda/[id]/start"
          options={{
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="agenda/[id]/evaluate"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patients/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="evolutions/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="evolutions/[id]/edit"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="evaluations/[id]"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="evaluations/[id]/edit"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="notifications/index"
          options={{
            presentation: 'card',
          }}
        />
      </AuthGuard>
    </Stack>
  );
}
