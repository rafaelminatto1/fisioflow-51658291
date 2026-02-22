import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // TODO: Log to Crashlytics (Task 48.2)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
            <Text style={styles.title}>Ops! Algo deu errado.</Text>
            <Text style={styles.description}>
              Ocorreu um erro inesperado no aplicativo. Nossa equipe técnica já foi notificada.
            </Text>
            
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Tentar Novamente</Text>
            </TouchableOpacity>
            
            {__DEV__ && (
              <View style={styles.devContainer}>
                <Text style={styles.devTitle}>Debug Error:</Text>
                <Text style={styles.devText}>{this.state.error?.message}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  devContainer: {
    marginTop: 40,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: '100%',
  },
  devTitle: {
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  devText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#EF4444',
  }
});
