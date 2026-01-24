import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { signOut } from '@fisioflow/shared-api';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Editar Perfil</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Alterar Senha</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Notificações</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Calendário</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Backup</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte</Text>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Central de Ajuda</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Fale Conosco</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Termos de Uso</Text>
        </Pressable>
        <Pressable style={styles.item}>
          <Text style={styles.itemText}>Política de Privacidade</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </Pressable>

      <Text style={styles.version}>FisioFlow Profissionais v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  logoutButton: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 16,
    marginBottom: 32,
  },
});
