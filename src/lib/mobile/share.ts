import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Serviço para compartilhamento nativo (Share Sheet)
 * Funciona apenas em dispositivos nativos (iOS/Android)
 */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Comparte conteúdo usando o share sheet nativo do iOS
 * @param options Opções de compartilhamento
 */
export async function shareContent(options: ShareOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback para web
    if (navigator.share) {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return;
    }

    console.warn('Share não disponível neste dispositivo');
    return;
  }

  try {
    await Share.share({
      title: options.title ?? 'FisioFlow',
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle ?? 'Compartilhar',
    });
  } catch (error: any) {
    if (error.message?.includes('User canceled')) {
      // Usuário cancelou, não é um erro
      return;
    }
    console.error('Erro ao compartilhar:', error);
  }
}

/**
 * Compartilha um exercício
 * @param exerciseId ID do exercício
 * @param exerciseName Nome do exercício
 */
export async function shareExercise(exerciseId: string, exerciseName: string): Promise<void> {
  const url = `https://fisioflow.com/exercises/${exerciseId}`;

  await shareContent({
    title: exerciseName,
    text: `Confira este exercício do FisioFlow: ${exerciseName}`,
    url: url,
    dialogTitle: 'Compartilhar Exercício',
  });
}

/**
 * Compartilha um relatório ou evolução
 * @param pdfUrl URL do PDF
 * @param title Título do relatório
 */
export async function shareReport(pdfUrl: string, title: string): Promise<void> {
  await shareContent({
    title: title,
    text: `Relatório: ${title}`,
    url: pdfUrl,
    dialogTitle: 'Compartilhar Relatório',
  });
}

/**
 * Compartilha o app FisioFlow
 */
export async function shareApp(): Promise<void> {
  await shareContent({
    title: 'FisioFlow - Gestão para Fisioterapia',
    text: 'Conheça o FisioFlow, o sistema completo para gestão de clínicas de fisioterapia!',
    url: 'https://fisioflow.com',
    dialogTitle: 'Convide um colega',
  });
}

/**
 * Compartilha mensagem do WhatsApp
 */
export async function shareWhatsApp(phone: string, message: string): Promise<void> {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  await shareContent({
    title: 'WhatsApp',
    url: url,
    dialogTitle: 'Enviar pelo WhatsApp',
  });
}

/**
 * Compartilha por email
 */
export async function shareEmail(to: string, subject: string, body: string): Promise<void> {
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  await shareContent({
    title: 'Email',
    url: url,
    dialogTitle: 'Enviar por Email',
  });
}
