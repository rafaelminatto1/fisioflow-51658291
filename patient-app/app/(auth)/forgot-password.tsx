import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { validators } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    // Validate email
    const emailError = validators.email(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch (error: any) {
      let message = 'Erro ao enviar email de recuperação';
      if (error.code === 'auth/user-not-found') {
        message = 'Email não encontrado';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email inválido';
      }
      Alert.alert('Erro', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.successLight }]}>
            <Ionicons name="mail" size={48} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Email Enviado!</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Enviamos um link de recuperação para {email}. Verifique sua caixa de entrada.
          </Text>
          <Button
            title="Voltar ao Login"
            onPress={() => router.back()}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
            <Ionicons name="key" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Esqueceu a Senha?</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Digite seu email e enviaremos um link para redefinir sua senha.
          </Text>

          <Input
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            error={error}
            containerStyle={styles.input}
          />

          <Button
            title="Enviar Link"
            onPress={handleResetPassword}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            title="Voltar"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.backButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    width: '100%',
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  backButton: {
    width: '100%',
    marginTop: 12,
  },
});
