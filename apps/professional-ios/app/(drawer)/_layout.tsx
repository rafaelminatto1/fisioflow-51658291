import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  House,
  Users,
  Calendar,
  Dumbbell,
  ChartLineUp,
  Gear,
  SignOut,
} from '@phosphor-icons/react-native';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '@fisioflow/shared-api';

function DrawerContent() {
  const { user } = useAuth();

  async function handleLogout() {
    await signOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <DrawerContentItems />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <SignOut size={24} color="#EF4444" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

function DrawerContentItems() {
  return (
    <View style={styles.items}>
      <DrawerItem
        href="/(drawer)/dashboard"
        icon={<House size={24} color="#94A3B8" />}
        label="Dashboard"
      />
      <DrawerItem
        href="/(drawer)/patients"
        icon={<Users size={24} color="#94A3B8" />}
        label="Pacientes"
      />
      <DrawerItem
        href="/(drawer)/calendar"
        icon={<Calendar size={24} color="#94A3B8" />}
        label="Agenda"
      />
      <DrawerItem
        href="/(drawer)/exercises"
        icon={<Dumbbell size={24} color="#94A3B8" />}
        label="Exercícios"
      />
      <DrawerItem
        href="/(drawer)/financial"
        icon={<ChartLineUp size={24} color="#94A3B8" />}
        label="Financeiro"
      />
      <DrawerItem
        href="/(drawer)/settings"
        icon={<Gear size={24} color="#94A3B8" />}
        label="Configurações"
      />
    </View>
  );
}

function DrawerItem({ href, icon, label }: { href: string; icon: any; label: string }) {
  return (
    <TouchableOpacity style={styles.item}>
      {icon}
      <Text style={styles.itemLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1E293B',
        },
        headerTintColor: '#fff',
        drawerStyle: {
          backgroundColor: '#0F172A',
        },
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen
        name="patients"
        options={{ title: 'Pacientes' }}
      />
      <Drawer.Screen
        name="calendar"
        options={{ title: 'Agenda' }}
      />
      <Drawer.Screen
        name="exercises"
        options={{ title: 'Exercícios' }}
      />
      <Drawer.Screen
        name="financial"
        options={{ title: 'Financeiro' }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: 'Configurações' }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
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
    color: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 'auto',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
});
