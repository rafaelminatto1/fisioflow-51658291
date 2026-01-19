# 🆕 Features Exclusivas iOS - FisioFlow Mobile

## 📋 Visão Geral

Este documento detalha todas as funcionalidades que são **exclusivas do aplicativo iOS** e não estão disponíveis (ou funcionam de forma limitada) no web app.

---

## 🔐 1. Autenticação Biométrica (Face ID / Touch ID)

### Descrição
Permite que os usuários façam login rápido e seguro usando biometria do iPhone.

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/local-authentication
npx cap sync
```

#### Hook - `src/hooks/useBiometricAuth.ts`
```typescript
import { LocalAuthentication } from '@capacitor/local-authentication';
import { useCallback, useState } from 'react';

export interface BiometricAuthState {
  isAvailable: boolean;
  isAuthenticated: boolean;
  deviceType: 'faceId' | 'touchId' | 'none';
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
}

export function useBiometricAuth(): BiometricAuthState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceType, setDeviceType] = useState<'faceId' | 'touchId' | 'none'>('none');

  const checkAvailability = useCallback(async () => {
    try {
      const available = await LocalAuthentication.isAvailable();
      setIsAvailable(available);

      if (available) {
        // Verificar tipo de biometria
        const supported = await LocalAuthentication.getSupportedAuthenticationTypes();

        if (supported.includes('face')) {
          setDeviceType('faceId');
        } else if (supported.includes('finger')) {
          setDeviceType('touchId');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setIsAvailable(false);
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticate({
        reason: 'Por favor, autentique para acessar o FisioFlow',
        title: 'Autenticação Biométrica',
        subtitle: deviceType === 'faceId' ? 'Use Face ID' : 'Use Touch ID',
        description: 'Escaneie sua face ou digital para continuar',
        fallbackTitle: 'Usar Senha',
        cancelTitle: 'Cancelar',
      });

      setIsAuthenticated(result);
      return result;
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);
      // Tratar erros específicos
      if (error.code === 'AUTHENTICATION_FAILED') {
        // Biometria falhou
      } else if (error.code === 'USER_CANCELATION') {
        // Usuário cancelou
      } else if (error.code === 'SYSTEM_CANCELATION') {
        // Sistema cancelou (ex: phone call)
      } else if (error.code === 'PASSCODE_NOT_SET') {
        // Usuário não tem código configurado
      } else if (error.code === 'BIOMETRY_NOT_ENROLLED') {
        // Nenhuma biometria configurada
      }
      return false;
    }
  }, [isAvailable, deviceType]);

  return {
    isAvailable,
    isAuthenticated,
    deviceType,
    authenticate,
    checkAvailability,
  };
}
```

#### Uso na UI
```typescript
// src/screens/LoginScreen.tsx
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useEffect } from 'react';

export function LoginScreen() {
  const { authenticate, isAvailable, checkAvailability, deviceType } = useBiometricAuth();

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleBiometricLogin = async () => {
    const success = await authenticate();
    if (success) {
      // Login bem-sucedido
      // Navegar para dashboard
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      {/* Form de login normal */}
      <LoginForm />

      {/* Botão biometria */}
      {isAvailable && (
        <button
          onClick={handleBiometricLogin}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg"
        >
          {deviceType === 'faceId' ? <FaceIdIcon /> : <TouchIdIcon />}
          <span>Entrar com {deviceType === 'faceId' ? 'Face ID' : 'Touch ID'}</span>
        </button>
      )}
    </div>
  );
}

// Icons
function FaceIdIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 17c0-4.418 3.582-8 8-8s8 3.582 8 8M12 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10" />
    </svg>
  );
}

function TouchIdIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10M6 12c0-3.314 2.686-6 6-6s6 2.686 6 6M9 12c0-1.657 1.343-3 3-3s3 1.343 3 3" />
    </svg>
  );
}
```

### Info.plist Permissions
```xml
<key>NSFaceIDUsageDescription</key>
<string>Usar Face ID ou Touch ID para login rápido e seguro no FisioFlow</string>
```

### Casos de Uso
- ✅ Login rápido sem digitar senha
- ✅ Confirmação de ações sensíveis (ex: excluir paciente)
- ✅ Desbloqueio do app após background
- ✅ Acesso a dados sensíveis (ex: histórico financeiro)

### Limitações
- ❌ Funciona apenas se usuário tiver biometria configurada no dispositivo
- ❌ Primeiro login deve ser com email/senha
- ❌ Precisa de fallback (senha) quando biometria falha

---

## 🔔 2. Push Notifications Nativas

### Descrição
Notificações em tempo real mesmo com app fechado, usando Apple Push Notification Service (APNs).

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/push-notifications
npm install @capacitor/local-notifications
npx cap sync
```

#### Configuração - `capacitor.config.ts`
```typescript
export const config: CapacitorConfig = {
  // ...
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      sound: 'beep.wav',
      iconColor: '#0EA5E9',
      smallIcon: 'ic_stat_icon_config_sample',
    },
  },
};
```

#### Service - `src/lib/push-notifications.ts`
```typescript
import { PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase';

export interface PushNotificationData {
  title: string;
  body: string;
  userId: string;
  type: 'appointment' | 'message' | 'alert' | 'update';
  data?: Record<string, any>;
}

/**
 * Inicializa o sistema de push notifications
 */
export async function initPushNotifications(): Promise<void> {
  // Solicitar permissão
  const result = await PushNotifications.requestPermissions();

  if (result.receive === 'granted') {
    await PushNotifications.register();
  } else {
    console.warn('Permissão de notificação negada');
    return;
  }

  // Listener: Registro bem-sucedido
  await PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Push token registrado:', token.value);

    // Enviar token para Supabase
    await savePushTokenToDatabase(token.value);
  });

  // Listener: Erro no registro
  await PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Erro no registro de push:', error);
  });

  // Listener: Notificação recebida (app em foreground)
  await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('Notificação recebida:', notification);

    // Mostrar notificação local também
    showLocalNotification(notification);
  });

  // Listener: Notificação clicada (app aberto pela notificação)
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification: PushNotificationSchema) => {
    console.log('Notificação clicada:', notification);

    // Navegar para tela relevante
    handleNotificationAction(notification);
  });
}

/**
 * Salva o token de push no banco de dados
 */
async function savePushTokenToDatabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('user_push_tokens').upsert({
        user_id: user.id,
        token: token,
        platform: 'ios',
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Erro ao salvar token:', error);
  }
}

/**
 * Mostra notificação local (quando app está aberto)
 */
async function showLocalNotification(notification: PushNotificationSchema): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: notification.data?.title || 'FisioFlow',
        body: notification.data?.body || '',
        id: Date.now(),
        schedule: { at: new Date() },
        sound: 'default',
        attachments: notification.data?.attachment ? [
          {
            id: 'attachment',
            url: notification.data.attachment,
          }
        ] : undefined,
        actionTypeId: '',
        extra: notification.data,
      },
    ],
  });
}

/**
 * Manipula clique na notificação
 */
function handleNotificationAction(notification: PushNotificationSchema): void {
  const type = notification.data?.type;

  switch (type) {
    case 'appointment':
      // Navegar para detalhes da consulta
      break;
    case 'message':
      // Navegar para chat
      break;
    case 'alert':
      // Navegar para alerta específico
      break;
    default:
      // Navegar para dashboard
  }
}

/**
 * Cancela todas as notificações
 */
export async function clearAllNotifications(): Promise<void> {
  await LocalNotifications.cancel();
}

/**
 * Cancela notificações específicas
 */
export async function cancelNotification(ids: number[]): Promise<void> {
  await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
}
```

#### Backend (Supabase Edge Function)
```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface APNsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    badge?: number;
    sound?: string;
    category?: string;
  };
  [key: string]: any;
}

serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json();

    // Buscar tokens do usuário
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('platform', 'ios');

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No tokens found' }), { status: 404 });
    }

    // Enviar para APNs
    const payload: APNsPayload = {
      aps: {
        alert: { title, body },
        badge: 1,
        sound: 'default',
      },
      ...data,
    };

    // Implementação real de envio APNs
    // (requer chave de autenticação .p8 da Apple)

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

#### Capacitação Xcode
1. No Xcode: `npx cap open ios`
2. Selecionar target "App"
3. "Signing & Capabilities" > "+ Capability"
4. Adicionar "Push Notifications"

### Tipos de Notificações

#### 1. Lembrete de Consulta
```json
{
  "title": "Consulta em 30 minutos",
  "body": "Você tem uma consulta com João Silva às 14:00",
  "type": "appointment",
  "appointmentId": "123"
}
```

#### 2. Confirmação de Agendamento
```json
{
  "title": "Agendamento confirmado",
  "body": "Sua consulta para 20/01 foi confirmada",
  "type": "update",
  "appointmentId": "456"
}
```

#### 3. Mensagem do Paciente
```json
{
  "title": "Nova mensagem de Maria",
  "body": "Sentei dor no exercício de ontem...",
  "type": "message",
  "conversationId": "789"
}
```

#### 4. Alerta de Tarefa
```json
{
  "title": "Evolução pendente",
  "body": "Lembre-se de registrar a evolução de João",
  "type": "alert",
  "taskId": "101"
}
```

### Info.plist
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

---

## 📸 3. Câmera Nativa

### Descrição
Acesso direto à câmera do iPhone com edição embutida para fotos de exercícios e documentos.

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/camera
npx cap sync
```

#### Hook - `src/hooks/useCamera.ts`
```typescript
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { useCallback, useState } from 'react';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  correctOrientation?: boolean;
  saveToGallery?: boolean;
}

export function useCamera() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const takePhoto = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);

    try {
      const image = await Camera.getPhoto({
        quality: options.quality ?? 90,
        allowEditing: options.allowEditing ?? true,
        correctOrientation: options.correctOrientation ?? true,
        saveToGallery: options.saveToGallery ?? true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      setPhoto(image);
      setIsLoading(false);
      return image;
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);

    try {
      const image = await Camera.getPhoto({
        quality: options.quality ?? 90,
        allowEditing: options.allowEditing ?? true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      setPhoto(image);
      setIsLoading(false);
      return image;
    } catch (error) {
      console.error('Erro ao selecionar foto:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  return {
    photo,
    isLoading,
    takePhoto,
    pickFromGallery,
    clearPhoto,
  };
}
```

#### Componente UI
```typescript
// src/components/mobile/CameraButton.tsx
import { useCamera } from '@/hooks/useCamera';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface CameraButtonProps {
  onPhotoSelected: (photo: string) => void;
  buttonText?: string;
  showGalleryOption?: boolean;
}

export function CameraButton({
  onPhotoSelected,
  buttonText = 'Adicionar Foto',
  showGalleryOption = true,
}: CameraButtonProps) {
  const { takePhoto, pickFromGallery, isLoading } = useCamera();

  const handleTakePhoto = async () => {
    const photo = await takePhoto();
    if (photo?.webPath) {
      onPhotoSelected(photo.webPath);
    }
  };

  const handlePickFromGallery = async () => {
    const photo = await pickFromGallery();
    if (photo?.webPath) {
      onPhotoSelected(photo.webPath);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleTakePhoto}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
      >
        <Camera size={20} />
        <span>{buttonText}</span>
      </button>

      {showGalleryOption && (
        <button
          onClick={handlePickFromGallery}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
        >
          <ImageIcon size={20} />
          <span>Galeria</span>
        </button>
      )}
    </div>
  );
}
```

### Info.plist Permissions
```xml
<!-- Câmera -->
<key>NSCameraUsageDescription</key>
<string>Precisamos da câmera para tirar fotos de exercícios e evoluções dos pacientes</string>

<!-- Galeria -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Precisamos acessar suas fotos para adicionar aos prontuários dos pacientes</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Precisamos salvar fotos de exercícios na sua galeria</string>
```

### Casos de Uso
- 📸 Foto de exercícios prescritos
- 📄 Documentos do paciente
- 🏥 Comprovantes de pagamento
- 📋 Fotos de evolução

---

## 📍 4. Geolocalização Precisa

### Descrição
GPS real com precisão de metros para comprovação de presença em atendimentos.

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/geolocation
npx cap sync
```

#### Service - `src/lib/geolocation.ts`
```typescript
import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';

export interface CheckInData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Obtém localização atual com alta precisão
 */
export async function getCurrentLocation(): Promise<CheckInData | null> {
  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  try {
    const position: Position = await Geolocation.getCurrentPosition(options);

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    console.error('Erro ao obter localização:', error);
    return null;
  }
}

/**
 * Inicia monitoramento contínuo de localização
 */
export async function watchPosition(
  callback: (location: CheckInData) => void
): Promise<string> {
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
    (position, err) => {
      if (err) {
        console.error('Erro no monitoramento:', err);
        return;
      }

      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      }
    }
  );

  return watchId;
}

/**
 * Para monitoramento de localização
 */
export async function clearWatch(watchId: string): Promise<void> {
  await Geolocation.clearWatch({ id: watchId });
}
```

#### Hook - `src/hooks/useCheckIn.ts`
```typescript
import { useState } from 'react';
import { getCurrentLocation } from '@/lib/geolocation';

export function useCheckIn() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);

  const performCheckIn = async (appointmentId: string) => {
    setIsCheckingIn(true);

    try {
      const location = await getCurrentLocation();

      if (!location) {
        throw new Error('Não foi possível obter localização');
      }

      // Enviar para Supabase
      const { data, error } = await supabase
        .from('appointment_checkins')
        .insert({
          appointment_id: appointmentId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          checked_at: new Date(location.timestamp).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLastCheckIn({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
      });

      return data;
    } catch (error) {
      console.error('Erro no check-in:', error);
      throw error;
    } finally {
      setIsCheckingIn(false);
    }
  };

  return {
    isCheckingIn,
    lastCheckIn,
    performCheckIn,
  };
}
```

### Info.plist Permissions
```xml
<!-- Localização em uso -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Precisamos da sua localização para registrar check-in em atendimentos</string>

<!-- Localização em segundo plano (opcional) -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Precisamos da sua localização para registrar atendimentos em segundo plano</string>
```

### Casos de Uso
- ✅ Check-in ao iniciar atendimento
- ✅ Comprovação de presença
- ✅ Registro de visita domiciliar
- ✅ Clínicas móveis

---

## 📳 5. Haptics (Feedback Tátil)

### Descrição
Vibrações hápticas para feedback tátil em ações importantes.

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/haptics
npx cap sync
```

#### Service - `src/lib/haptics.ts`
```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Impacto leve (toque suave)
 */
export async function hapticLight(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Light });
}

/**
 * Impacto médio (toque padrão)
 */
export async function hapticMedium(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Medium });
}

/**
 * Impacto forte (toque intenso)
 */
export async function hapticHeavy(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Heavy });
}

/**
 * Notificação de sucesso
 */
export async function hapticSuccess(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Success });
}

/**
 * Notificação de aviso
 */
export async function hapticWarning(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Warning });
}

/**
 * Notificação de erro
 */
export async function hapticError(): Promise<void> {
  await Haptics.notification({ type: NotificationType.Error });
}

/**
 * Seleção (efeito de rolagem/scroll)
 */
export async function hapticSelection(): Promise<void> {
  await Haptics.selectionStart();
  await Haptics.selectionEnd();
}

/**
 * Vibrar por duração customizada
 */
export async function hapticVibrate(duration: number): Promise<void> {
  await Haptics.vibrate({ duration });
}
```

#### Hook - `src/hooks/useHaptics.ts`
```typescript
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError } from '@/lib/haptics';

export function useHaptics() {
  return {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    error: hapticError,
  };
}
```

#### Uso
```typescript
import { useHaptics } from '@/hooks/useHaptics';

function AppointmentButton() {
  const { medium, success } = useHaptics();

  const handleBook = async () => {
    await medium(); // Feedback ao tocar
    const result = await bookAppointment();
    if (result) {
      await success(); // Sucesso
    }
  };

  return <Button onPress={handleBook}>Agendar</Button>;
}
```

### Casos de Uso
- ✅ Confirmar ação ao tocar em botão
- ✅ Sucesso após salvar formulário
- ✅ Erro de validação
- ✅ Scroll em listas longas
- ✅ Selecionar opções

---

## 📤 6. Share Sheet Nativo

### Descrição
Compartilhamento nativo do iOS para enviar exercícios, relatórios, etc.

### Implementação Técnica

#### Plugin
```bash
npm install @capacitor/share
npx cap sync
```

#### Service - `src/lib/share.ts`
```typescript
import { Share } from '@capacitor/share';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Compartilha conteúdo usando share sheet nativo
 */
export async function shareContent(options: ShareOptions): Promise<void> {
  await Share.share({
    title: options.title ?? 'FisioFlow',
    text: options.text,
    url: options.url,
    dialogTitle: options.dialogTitle ?? 'Compartilhar',
  });
}

/**
 * Compartilha exercício
 */
export async function shareExercise(exerciseId: string, exerciseName: string): Promise<void> {
  const url = `https://fisioflow.com/exercises/${exerciseId}`;

  await shareContent({
    title: exerciseName,
    text: `Confira este exercício do FisioFlow: ${exerciseName}`,
    url: url,
  });
}

/**
 * Compartilha relatório PDF
 */
export async function shareReport(pdfUrl: string, reportTitle: string): Promise<void> {
  await shareContent({
    title: reportTitle,
    text: `Relatório: ${reportTitle}`,
    url: pdfUrl,
  });
}
```

---

## 📐 7. Safe Area Handler

### Descrição
Adaptação automática para notch (Dynamic Island) e home indicator.

### Implementação Técnica

#### Plugin
```bash
npm install capacitor-plugin-safe-area
npx cap sync
```

#### Hook - `src/hooks/useSafeArea.ts`
```typescript
import { useEffect, useState } from 'react';
import { SafeArea } from 'capacitor-safe-area';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    SafeArea.getSafeAreaInsets().then(({ insets }) => {
      setInsets(insets);
    });

    const listener = SafeArea.addListener('safeAreaChanged', ({ insets }) => {
      setInsets(insets);
    });

    return () => listener.remove();
  }, []);

  return insets;
}
```

#### Componente
```typescript
// src/components/mobile/SafeAreaView.tsx
import { useSafeArea } from '@/hooks/useSafeArea';
import { ReactNode } from 'react';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
}

export function SafeAreaView({ children, className = '' }: SafeAreaViewProps) {
  const insets = useSafeArea();

  return (
    <div
      className={className}
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      {children}
    </div>
  );
}
```

---

## 🎹 8. Keyboard Handler

### Descrição
Controle total do teclado virtual para ajustes de layout.

### Implementação Técnica

#### Plugin (Junto com Capacitor Core)
```bash
# Já incluído no @capacitor/ios
```

#### Service - `src/lib/keyboard.ts`
```typescript
import { Keyboard } from '@capacitor/keyboard';

/**
 * Mostra o teclado
 */
export async function showKeyboard(): Promise<void> {
  await Keyboard.show();
}

/**
 * Esconde o teclado
 */
export async function hideKeyboard(): Promise<void> {
  await Keyboard.hide();
}

/**
 * Configura listeners do teclado
 */
export function setupKeyboardListeners({
  onShow,
  onHide,
}: {
  onShow?: (keyboardInfo: { keyboardHeight: number }) => void;
  onHide?: () => void;
}): void {
  Keyboard.addListener('keyboardWillShow', (info) => {
    onShow?.(info);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    onHide?.();
  });
}

/**
 * Retorna a altura do teclado (para ajustar layout)
 */
export async function getKeyboardHeight(): Promise<number> {
  return new Promise((resolve) => {
    const listener = Keyboard.addListener('keyboardWillShow', (info) => {
      listener.remove();
      resolve(info.keyboardHeight);
    });

    // Se o teclado já estiver aberto, não haverá evento
    // Timeout como fallback
    setTimeout(() => {
      listener.remove();
      resolve(0);
    }, 100);
  });
}
```

---

## 📱 Resumo de Features Exclusivas

| Feature | Plugin | Uso Principal |
|---------|--------|---------------|
| **Face ID / Touch ID** | @capacitor/local-authentication | Login rápido |
| **Push Notifications** | @capacitor/push-notifications | Alertas em tempo real |
| **Câmera** | @capacitor/camera | Fotos de exercícios |
| **Geolocalização** | @capacitor/geolocation | Check-in |
| **Haptics** | @capacitor/haptics | Feedback tátil |
| **Share Sheet** | @capacitor/share | Compartilhar |
| **Safe Area** | capacitor-plugin-safe-area | Adaptação ao notch |
| **Keyboard** | @capacitor/core | Controle do teclado |

---

**Última atualização**: 19 de Janeiro de 2026
