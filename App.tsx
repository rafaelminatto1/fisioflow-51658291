/**
 * FisioFlow - Mobile App Entry Point
 * Carrega o sistema web completo via WebView
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, StatusBar, SafeAreaView, Text } from 'react-native';
import { WebView } from 'react-native-webview';

// URL do sistema web - usa IP local ou localhost
const WEB_APP_URL = 'http://192.168.31.36:8081'; // IP local da máquina

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurar orientação para retrato (apenas em nativo)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ScreenOrientation = require('expo-screen-orientation');
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {
          // Silenciosamente ignorar erro
        });
      } catch {
        // Módulo não disponível, ignorar
      }
    }
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setIsLoading(false);
    setError(nativeEvent.message || 'Erro ao carregar o sistema');
  }, []);

  const handleReload = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // WebView will reload automatically when re-rendered
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="auto" />
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Erro de Conexão</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            Verifique se o servidor web está rodando em:{'\n'}
            {WEB_APP_URL}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        style={styles.webView}
        source={{ uri: WEB_APP_URL }}
        onLoad={handleLoad}
        onError={handleError}
        startInLoadingState={true}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        allowUniversalAccessFromFileURLs={true}
        allowFileAccess={true}
        cacheEnabled={true}
        incognito={false}
        // Habilitar zoom
        scalesPageToFit={true}
        // User agent para identificar como mobile app
        injectedJavaScript={`
          window.isNativeApp = true;
          window.ReactNativeWebView = true;
        `}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Carregando FisioFlow...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fef2f2',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#991b1b',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});
