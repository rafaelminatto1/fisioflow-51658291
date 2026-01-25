import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { login } from '@fisioflow/shared-api';
import { Button, Input, useTheme, toast } from '@fisioflow/shared-ui';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.message || 'Falha ao fazer login';
      setError(message);
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
          Seu exercício, seu progresso
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="E-mail"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={error}
        />

        <Input
          label="Senha"
          placeholder="••••••••"
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

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={[styles.link, { color: theme.colors.primary[500] }]}>
            Esqueci minha senha
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={[styles.link, { color: theme.colors.primary[500] }]}>
            Não tem conta? Cadastre-se
          </Text>
        </TouchableOpacity>
      </View>
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
  form: {
    gap: 16,
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});
