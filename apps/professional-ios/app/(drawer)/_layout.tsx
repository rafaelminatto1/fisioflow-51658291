import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, signOut } from '@fisioflow/shared-api';
import { Avatar, useTheme } from '@fisioflow/shared-ui';

function DrawerContent() {
  const { user } = useAuth();
  const theme = useTheme();

  async function handleLogout() {
    await signOut();
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PF';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Avatar name={user?.name || 'Profissional'} size="lg" style={styles.avatar} />
        <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
          {user?.name}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>
          {user?.email}
        </Text>
      </View>

      <DrawerContentItems />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

function DrawerContentItems() {
  const theme = useTheme();

  return (
    <View style={styles.items}>
      <DrawerItem
        href="/(drawer)/dashboard"
        icon={<Ionicons name="home-outline" size={24} color={theme.colors.text.secondary} />}
        label="Dashboard"
      />
      <DrawerItem
        href="/(drawer)/patients"
        icon={<Ionicons name="people-outline" size={24} color={theme.colors.text.secondary} />}
        label="Pacientes"
      />
      <DrawerItem
        href="/(drawer)/calendar"
        icon={<Ionicons name="calendar-outline" size={24} color={theme.colors.text.secondary} />}
        label="Agenda"
      />
      <DrawerItem
        href="/(drawer)/exercises"
        icon={<Ionicons name="fitness-outline" size={24} color={theme.colors.text.secondary} />}
        label="Exercícios"
      />
      <DrawerItem
        href="/(drawer)/financial"
        icon={<Ionicons name="trending-up-outline" size={24} color={theme.colors.text.secondary} />}
        label="Financeiro"
      />
      <DrawerItem
        href="/(drawer)/settings"
        icon={<Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />}
        label="Configurações"
      />
    </View>
  );
}

function DrawerItem({ href, icon, label }: { href: string; icon: any; label: string }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={styles.item}>
      {icon}
      <Text style={[styles.itemLabel, { color: theme.colors.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary[500],
        },
        headerTintColor: '#fff',
        drawerStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="patients" options={{ title: 'Pacientes' }} />
      <Drawer.Screen name="calendar" options={{ title: 'Agenda' }} />
      <Drawer.Screen name="exercises" options={{ title: 'Exercícios' }} />
      <Drawer.Screen name="financial" options={{ title: 'Financeiro' }} />
      <Drawer.Screen name="settings" options={{ title: 'Configurações' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  items: {
    padding: 16,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  itemLabel: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 'auto',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
});
