import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { register } from '@fisioflow/shared-api';
import { Button, Input, useTheme, toast } from '@fisioflow/shared-ui';

export default function RegisterScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register({
        email,
        password,
        name,
        role: 'patient',
      });
      toast.success('Conta criada com sucesso!');
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.message || 'Falha ao criar conta';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.colors.primary[500] }]}>
          ← Voltar
        </Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Criar Conta
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Comece sua jornada de recuperação
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Nome completo"
          placeholder="Seu nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

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
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          helperText="Mínimo 6 caracteres"
          error={error}
        />

        <Input
          label="Confirmar senha"
          placeholder="Digite a senha novamente"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={password !== confirmPassword && confirmPassword ? 'As senhas não coincidem' : ''}
        />

        <Button
          onPress={handleRegister}
          loading={loading}
          fullWidth
          size="lg"
        >
          Criar Conta
        </Button>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={[styles.link, { color: theme.colors.primary[500] }]}>
            Já tem conta? Faça login
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
  backButton: {
    marginTop: 44,
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 32,
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
