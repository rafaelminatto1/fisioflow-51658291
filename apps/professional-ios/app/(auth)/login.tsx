import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { login } from '@fisioflow/shared-api';
import { Button, Input, useTheme, toast, Card } from '@fisioflow/shared-ui';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
      toast.success('Login realizado com sucesso!');
      router.replace('/(drawer)');
    } catch (error: any) {
      const message = error.message || 'Falha ao fazer login';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary[500] }]}>
          FisioFlow
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Para Profissionais
        </Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <Input
          label="E-mail"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Input
          label="Senha"
          placeholder="Digite sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          onPress={handleLogin}
          loading={loading}
          fullWidth
          size="lg"
        >
          Entrar
        </Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginTop: 80,
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    padding: 20,
    gap: 16,
  },
});
