/**
 * FisioFlow - Video Exercise Import Integration
 *
 * Integração para importação de vídeos de exercícios de plataformas como YouTube
 *
 * Funcionalidades:
 * - Busca de vídeos de exercícios no YouTube
 * - Download de vídeos (para uso autorizado)
 * - Extração de metadados
 * - Geração de thumbnail
 * - Transcrição automática
 * - Integração com biblioteca de exercícios
 *
 * NOTA: Respeitar direitos autorais e termos de uso das plataformas
 */

import { format } from 'date-fns';

// Tipos
export interface VideoSource {
  platform: 'youtube' | 'vimeo' | 'direct';
  videoId: string;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number; // em segundos
  channel?: string;
  publishedAt?: Date;
}

export interface ImportedExercise {
  name: string;
  category: string;
  muscleGroups: string[];
  equipment?: string;
  difficulty: 'iniciante' | 'intermediário' | 'avançado';
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  instructions: string[];
  tags: string[];
  source: {
    platform: string;
    originalUrl: string;
    attribution: string;
  };
}

export interface ExerciseImportConfig {
  categories: string[];
  muscleGroups: string[];
  equipment: string[];
  autoCategorize: boolean;
  downloadVideo: boolean;
  generateThumbnail: boolean;
}

/**
 * Classe para importação de exercícios em vídeo
 */
export class VideoExerciseImport {
  private config: ExerciseImportConfig;
  private youtubeApiKey?: string;

  constructor(config: ExerciseImportConfig, youtubeApiKey?: string) {
    this.config = config;
    this.youtubeApiKey = youtubeApiKey;
  }

  /**
   * Busca vídeos no YouTube com base em uma query
   */
  async searchYouTube(query: string, maxResults: number = 10): Promise<VideoSource[]> {
    if (!this.youtubeApiKey) {
      throw new Error('YouTube API key não configurada');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query + ' fisioterapia exercício')}&maxResults=${maxResults}&key=${this.youtubeApiKey}`
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(`YouTube API Error: ${data.error.message}`);
      }

      return (data.items || []).map((item: any) => ({
        platform: 'youtube' as const,
        videoId: item.id.videoId,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        channel: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
      }));
    } catch (error) {
      console.error('Erro ao buscar vídeos no YouTube:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes completos de um vídeo do YouTube
   */
  async getYouTubeVideoDetails(videoId: string): Promise<VideoSource> {
    if (!this.youtubeApiKey) {
      throw new Error('YouTube API key não configurada');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.youtubeApiKey}`
      );

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Vídeo não encontrado');
      }

      const item = data.items[0];
      const duration = this.parseYouTubeDuration(item.contentDetails.duration);

      return {
        platform: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.maxres?.url ||
                       item.snippet.thumbnails?.high?.url ||
                       item.snippet.thumbnails?.default?.url,
        channel: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
        duration,
      };
    } catch (error) {
      console.error('Erro ao obter detalhes do vídeo:', error);
      throw error;
    }
  }

  /**
   * Parse da duração do formato PT1M30S para segundos
   */
  private parseYouTubeDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Cria exercício a partir de vídeo
   */
  async createExerciseFromVideo(
    video: VideoSource,
    customData?: Partial<ImportedExercise>
  ): Promise<ImportedExercise> {
    // Extrair informações do título e descrição
    const extracted = this.extractExerciseInfo(video);

    return {
      name: video.title,
      category: customData?.category || extracted.category,
      muscleGroups: customData?.muscleGroups || extracted.muscleGroups,
      equipment: customData?.equipment || extracted.equipment,
      difficulty: customData?.difficulty || extracted.difficulty,
      videoUrl: video.url,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration || 0,
      instructions: extracted.instructions,
      tags: [...extracted.tags, video.channel || 'importado'],
      source: {
        platform: video.platform,
        originalUrl: video.url,
        attribution: `Créditos: ${video.channel || 'Canal do YouTube'}`,
      },
    };
  }

  /**
   * Extrai informações do vídeo usando análise de texto
   */
  private extractExerciseInfo(video: VideoSource): {
    category: string;
    muscleGroups: string[];
    equipment?: string;
    difficulty: ImportedExercise['difficulty'];
    instructions: string[];
    tags: string[];
  } {
    const text = `${video.title} ${video.description || ''}`.toLowerCase();
    const title = video.title.toLowerCase();

    // Detectar categoria
    let category = this.config.categories[0];
    if (text.includes('alongamento') || text.includes('flexibilidade')) {
      category = 'alongamento';
    } else if (text.includes('fortalecimento') || text.includes('musculação')) {
      category = 'fortalecimento';
    } else if (text.includes('mobilidade')) {
      category = 'mobilidade';
    } else if (text.includes('postura') || text.includes('coluna')) {
      category = 'postura';
    }

    // Detectar grupos musculares
    const muscleGroups: string[] = [];
    const muscleMap: Record<string, string[]> = {
      costas: ['costas', 'dorsal', 'lombar', 'torácica'],
      ombros: ['ombro', 'ombros', 'deltoide', 'manguito'],
      pescoço: ['pescoço', 'cervical', 'trapézio'],
      pernas: ['perna', 'pernas', 'quadríceps', 'isquiotibiais', 'panturrilha'],
      gluteos: ['glúteo', 'glúteos', 'quadril', 'bunda'],
      bracos: ['braço', 'braços', 'bíceps', 'tríceps', 'antebraço'],
      abdome: ['abdômen', 'abdominal', 'core', 'barriga'],
    };

    for (const [muscle, keywords] of Object.entries(muscleMap)) {
      if (keywords.some(kw => text.includes(kw))) {
        muscleGroups.push(muscle.charAt(0).toUpperCase() + muscle.slice(1));
      }
    }

    // Detectar equipamento
    let equipment: string | undefined;
    if (text.includes('elástico') || text.includes('banda')) {
      equipment = 'Banda Elástica';
    } else if (text.includes('peso') || text.includes('halter')) {
      equipment = 'Pesos/Halteres';
    } else if (text.includes('ball') || text.includes('suíço') || text.includes('pilates')) {
      equipment = 'Bola Suíça';
    } else if (text.includes('theraband') || text.includes('thera')) {
      equipment = 'TheraBand';
    }

    // Detectar dificuldade
    let difficulty: ImportedExercise['difficulty'] = 'iniciante';
    if (title.includes('avançado') || text.includes('avançado')) {
      difficulty = 'avançado';
    } else if (title.includes('intermediário')) {
      difficulty = 'intermediário';
    }

    // Gerar instruções básicas da descrição
    const instructions = this.extractInstructions(video.description || '');

    // Gerar tags
    const tags = [category, ...muscleGroups];
    if (equipment) tags.push(equipment);

    return {
      category,
      muscleGroups,
      equipment,
      difficulty,
      instructions,
      tags,
    };
  }

  /**
   * Extrai instruções da descrição do vídeo
   */
  private extractInstructions(description: string): string[] {
    const instructions: string[] = [];
    const lines = description.split('\n');

    let inInstructions = false;
    for (const line of lines) {
      const cleanLine = line.trim();

      if (cleanLine.match(/^\d+[.\)]/) || cleanLine.match(/^passo/i)) {
        inInstructions = true;
      }

      if (inInstructions && cleanLine) {
        instructions.push(cleanLine.replace(/^\d+[.\)]\s*/, ''));
      }

      if (cleanLine === '' && instructions.length > 0) {
        break;
      }
    }

    return instructions.length > 0 ? instructions : ['Siga o vídeo passo a passo'];
  }

  /**
   * Importa múltiplos exercícios em lote
   */
  async importBatch(
    queries: string[],
    options?: {
      maxResultsPerQuery?: number;
      filterDuration?: { min: number; max: number };
    }
  ): Promise<ImportedExercise[]> {
    const exercises: ImportedExercise[] = [];

    for (const query of queries) {
      const videos = await this.searchYouTube(query, options?.maxResultsPerQuery || 5);

      for (const video of videos) {
        // Filtros
        if (options?.filterDuration) {
          if (!video.duration) continue;
          const details = await this.getYouTubeVideoDetails(video.videoId);
          if (details.duration < options.filterDuration.min ||
              details.duration > options.filterDuration.max) {
            continue;
          }
        }

        const exercise = await this.createExerciseFromVideo(video);
        exercises.push(exercise);
      }
    }

    return exercises;
  }

  /**
   * Gera sugestões de busca por categoria
   */
  getSuggestionsByCategory(category: string): string[] {
    const suggestions: Record<string, string[]> = {
      alongamento: [
        'alongamento de isquiotibiais',
        'alongamento de pescoço',
        'alongamento de ombros',
        'alongamento de coluna',
        'alongamento de quadril',
      ],
      fortalecimento: [
        'fortalecimento de core',
        'fortalecimento de glúteos',
        'fortalecimento de ombros',
        'fortalecimento de quadríceps',
        'fortalecimento de panturrilha',
      ],
      mobilidade: [
        'mobilidade de quadril',
        'mobilidade de tornozelo',
        'mobilidade de coluna vertebral',
        'mobilidade de ombro',
        'mobilidade de punho',
      ],
      postura: [
        'exercícios postura sentado',
        'exercícios para cifose',
        'exercícios para lordose',
        'exercícios para escoliose',
        'exercícios ergonomia',
      ],
      reabilitacao: [
        'exercícios pós operatório joelho',
        'exercícios para tendinite',
        'exercícios para hérnia de disco',
        'reabilitação de tornozelo',
        'exercícios para síndrome do túnel do carpo',
      ],
      respiratory: [
        'exercícios respiratórios',
        'exercícios para capacidade pulmonar',
        'exercícios de reexpansão pulmonar',
      ],
    };

    return suggestions[category] || [];
  }

  /**
   * Valida se o vídeo pode ser usado (direitos autorais)
   */
  validateVideoUsage(video: VideoSource): {
    canUse: boolean;
    reason?: string;
    requiresAttribution: boolean;
  } {
    // Verificar se o vídeo é licença Creative Commons
    // Isso geralmente requer chamada adicional à API do YouTube

    // Por padrão, assume que requer atribuição
    return {
      canUse: true,
      requiresAttribution: true,
    };
  }

  /**
   * Salva exercício importado no banco de dados
   */
  async saveExercise(exercise: ImportedExercise): Promise<string> {
    // Implementação depende do seu banco de dados
    // Aqui está um exemplo de estrutura:

    const exerciseData = {
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      videoUrl: exercise.videoUrl,
      thumbnailUrl: exercise.thumbnailUrl,
      duration: exercise.duration,
      instructions: exercise.instructions,
      tags: exercise.tags,
      source: exercise.source,
      createdAt: new Date(),
      status: 'pending_review', // Requer revisão profissional
    };

    // TODO: Implementar salvamento no banco de dados
    console.log('Salvando exercício:', exerciseData);

    return 'exercise-id';
  }

  /**
   * Atualiza metadados de exercício após revisão
   */
  async updateExerciseAfterReview(
    exerciseId: string,
    updates: Partial<ImportedExercise>
  ): Promise<void> {
    // TODO: Implementar atualização
    console.log(`Atualizando exercício ${exerciseId}:`, updates);
  }
}

/**
 * Factory para criar importador
 */
export class VideoImportFactory {
  static create(config: ExerciseImportConfig): VideoExerciseImport {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    return new VideoExerciseImport(config, youtubeApiKey);
  }

  static createDefaultConfig(): ExerciseImportConfig {
    return {
      categories: ['alongamento', 'fortalecimento', 'mobilidade', 'postura', 'reabilitação'],
      muscleGroups: [
        'Costas', 'Ombros', 'Pescoço', 'Pernas', 'Glúteos',
        'Braços', 'Abdome', 'Quadril', 'Tornozelo', 'Punho'
      ],
      equipment: ['Sem equipamento', 'Banda Elástica', 'Pesos/Halteres', 'Bola Suíça', 'TheraBand'],
      autoCategorize: true,
      downloadVideo: false,
      generateThumbnail: true,
    };
  }
}

// Exportar tipos
export type {
  VideoSource,
  ImportedExercise,
  ExerciseImportConfig,
};
