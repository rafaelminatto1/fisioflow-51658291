import { Alert } from 'react-native';
import { HapticFeedback } from './haptics';

/**
 * Error types for better handling
 */
export enum ErrorType {
  NETWORK = 'network',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Error messages in Portuguese
 */
const ERROR_MESSAGES: Record<ErrorType, { title: string; generic: string }> = {
  [ErrorType.NETWORK]: {
    title: 'Erro de Conexão',
    generic: 'Verifique sua conexão com a internet e tente novamente.',
  },
  [ErrorType.PERMISSION]: {
    title: 'Sem Permissão',
    generic: 'Você não tem permissão para realizar esta ação.',
  },
  [ErrorType.VALIDATION]: {
    title: 'Dados Inválidos',
    generic: 'Verifique os dados informados e tente novamente.',
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Não Encontrado',
    generic: 'O registro solicitado não foi encontrado.',
  },
  [ErrorType.SERVER]: {
    title: 'Erro do Servidor',
    generic: 'O servidor está indisponível. Tente novamente em alguns instantes.',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Erro',
    generic: 'Ocorreu um erro inesperado. Tente novamente.',
  },
};

/**
 * Get error type from error object
 */
function getErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  const message = error?.message?.toLowerCase() || error?.code?.toLowerCase() || '';

  // Network errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('offline') ||
    error?.code === 'firestore/failed-precondition' ||
    error?.code === 'firestore/unavailable'
  ) {
    return ErrorType.NETWORK;
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    error?.code === 'permission-denied'
  ) {
    return ErrorType.PERMISSION;
  }

  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('no document') ||
    error?.code === 'not-found'
  ) {
    return ErrorType.NOT_FOUND;
  }

  // Server errors
  if (
    error?.code?.startsWith('5') ||
    message.includes('internal server') ||
    message.includes('servidor')
  ) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: any): string {
  if (!error) return ERROR_MESSAGES[ErrorType.UNKNOWN].generic;

  // Check for specific error messages
  const message = error?.message?.toLowerCase() || '';

  // Firebase auth errors
  if (error?.code === 'auth/user-not-found') {
    return 'Usuário não encontrado.';
  }
  if (error?.code === 'auth/wrong-password') {
    return 'Senha incorreta.';
  }
  if (error?.code === 'auth/email-already-in-use') {
    return 'Este email já está cadastrado.';
  }
  if (error?.code === 'auth/invalid-email') {
    return 'Email inválido.';
  }
  if (error?.code === 'auth/weak-password') {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  // Firestore errors
  if (error?.code === 'firestore/permission-denied') {
    return 'Você não tem permissão para acessar este dado.';
  }
  if (error?.code === 'firestore/unavailable') {
    return 'Serviço temporariamente indisponível. Verifique sua conexão.';
  }

  // Use generic message based on error type
  return ERROR_MESSAGES[getErrorType(error)].generic;
}

/**
 * Show error alert to user
 */
export function showErrorAlert(
  error: any,
  customMessage?: string,
  onRetry?: () => void
): void {
  const errorType = getErrorType(error);
  const { title } = ERROR_MESSAGES[errorType];
  const message = customMessage || getErrorMessage(error);

  HapticFeedback.error();

  const buttons = [
    { text: 'OK' },
  ] as const;

  // Add retry button if callback provided
  if (onRetry) {
    buttons.push({
      text: 'Tentar Novamente',
      onPress: () => {
        HapticFeedback.light();
        onRetry();
      },
    });
  }

  Alert.alert(title, message, buttons as any);
}

/**
 * Show success alert
 */
export function showSuccessAlert(
  title: string,
  message: string,
  onConfirm?: () => void
): void {
  HapticFeedback.success();

  const buttons = [
    { text: 'OK', onPress: onConfirm },
  ] as const;

  Alert.alert(title, message, buttons as any);
}

/**
 * Show confirmation dialog
 */
export function showConfirmationAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  destructive?: boolean
): void {
  HapticFeedback.medium();

  const buttons = [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Confirmar',
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ] as const;

  Alert.alert(title, message, buttons as any);
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends any[]>(
  asyncFn: (...args: T) => Promise<void>,
  customMessage?: string
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await asyncFn(...args);
    } catch (error) {
      showErrorAlert(error, customMessage);
      throw error; // Re-throw for caller to handle if needed
    }
  };
}
