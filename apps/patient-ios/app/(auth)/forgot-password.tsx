import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { resetPassword } from '@fisioflow/shared-api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Erro', 'Digite seu e-mail');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSent(true);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Voltar</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Esqueci minha senha</Text>
        <Text style={styles.subtitle}>
          {sent
            ? 'E-mail enviado! Verifique sua caixa de entrada.'
            : 'Digite seu e-mail para receber as instruções'}
        </Text>
      </View>

      {!sent && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Enviando...' : 'Enviar Instruções'}
            </Text>
          </Pressable>
        </View>
      )}

      {sent && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Voltar ao Login</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  backButton: {
    marginTop: 44,
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
