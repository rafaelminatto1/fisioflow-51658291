import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { resetPassword } from '@fisioflow/shared-api';
import { Button, Input, useTheme, toast, Card } from '@fisioflow/shared-ui';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      toast.error('Digite seu e-mail');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSent(true);
      toast.success('E-mail enviado com sucesso!');
    } catch (error: any) {
      const message = error.message || 'Falha ao enviar e-mail';
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
          Esqueci minha senha
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          {!sent
            ? 'Digite seu e-mail para receber as instruções'
            : 'E-mail enviado! Verifique sua caixa de entrada.'}
        </Text>
      </View>

      {!sent ? (
        <Card variant="elevated" style={styles.card}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Button
            onPress={handleReset}
            loading={loading}
            fullWidth
            size="lg"
          >
            Enviar Instruções
          </Button>
        </Card>
      ) : (
        <Card variant="elevated" style={styles.card}>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: theme.colors.success[100] }]}>
              <Text style={[styles.successIconText, { color: theme.colors.success[500] }]}>
                ✓
              </Text>
            </View>
            <Text style={[styles.successText, { color: theme.colors.text.secondary }]}>
              Enviamos as instruções para recuperar sua senha no e-mail informado.
            </Text>
          </View>

          <Button
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            size="lg"
          >
            Voltar ao Login
          </Button>
        </Card>
      )}
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
    lineHeight: 24,
  },
  card: {
    padding: 20,
    gap: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    fontSize: 36,
    fontWeight: '700',
  },
  successText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
