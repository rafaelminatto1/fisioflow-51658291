/**
 * FisioFlow - Notion Integration
 *
 * Integração com Notion para documentação automatizada
 * usando a skill notion-automation via Rube MCP (Composio).
 *
 * Funcionalidades:
 * - Sincronização de documentação de processos
 * - Criação automática de páginas para procedimentos
 * - Registro de reuniões clínicas
 * - Base de conhecimento de exercícios
 * - Wiki da equipe
 *
 * Baseado na claude-skills notion-automation
 */

import { Client, BlockObjectRequest, PageObjectRequest } from '@notionhq/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
export interface NotionConfig {
  apiKey: string;
  databaseIds?: {
    procedures?: string;
    exercises?: string;
    meetings?: string;
    wiki?: string;
  };
}

export interface NotionPage {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
  status?: string;
  parentId?: string;
}

export interface MeetingNotes {
  date: Date;
  title: string;
  attendees: string[];
  agenda: string[];
  decisions: Array<{ topic: string; decision: string; responsible?: string }>;
  actionItems: Array<{ task: string; responsible: string; dueDate?: Date }>;
  notes?: string;
}

/**
 * Classe de integração com Notion
 */
export class NotionIntegration {
  private client: Client;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.client = new Client({ auth: config.apiKey });
  }

  /**
   * Cria uma página no Notion
   */
  async createPage(page: NotionPage): Promise<string> {
    try {
      const parent = page.parentId
        ? { type: 'page_id' as const, page_id: page.parentId }
        : { type: 'workspace' as const };

      const properties: PageObjectRequest['properties'] = {
        title: {
          title: [
            {
              text: {
                content: page.title,
              },
            },
          ],
        },
      };

      if (page.tags && page.tags.length > 0) {
        properties.tags = {
          multi_select: page.tags.map((tag) => ({ name: tag })),
        };
      }

      if (page.status) {
        properties.status = {
          select: { name: page.status },
        };
      }

      const response = await this.client.pages.create({
        parent,
        properties,
        children: page.content
          ? [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: { content: page.content },
                    },
                  ],
                },
              },
            ]
          : undefined,
      });

      return response.id;
    } catch (error) {
      console.error('Erro ao criar página no Notion:', error);
      throw error;
    }
  }

  /**
   * Cria página de procedimento clínico
   */
  async createProcedurePage(procedure: {
    title: string;
    description: string;
    indications: string[];
    contraindications: string[];
    steps: Array<{ title: string; description: string }>;
    observations?: string;
    references?: string[];
    tags?: string[];
  }): Promise<string> {
    const contentBlocks: BlockObjectRequest[] = [];

    // Descrição
    contentBlocks.push({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: procedure.description } }],
      },
    });

    // Indicações
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '✅ Indicações' } }],
      },
    });

    for (const indication of procedure.indications) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ type: 'text' as const, text: { content: indication } }],
        },
      });
    }

    // Contraindicações
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '❌ Contraindicações' } }],
      },
    });

    for (const contraindication of procedure.contraindications) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ type: 'text' as const, text: { content: contraindication } }],
        },
      });
    }

    // Passos
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '📋 Passo a Passo' } }],
      },
    });

    for (const [index, step] of procedure.steps.entries()) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'numbered_list_item' as const,
        numbered_list_item: {
          rich_text: [
            { type: 'text' as const, text: { content: step.title, bold: true } },
            { type: 'text' as const, text: { content: ': ' } },
            { type: 'text' as const, text: { content: step.description } },
          ],
        },
      });
    }

    // Observações
    if (procedure.observations) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '⚠️ Observações' } }],
        },
      });

      contentBlocks.push({
        object: 'block' as const,
        type: 'callout' as const,
        callout: {
          rich_text: [{ type: 'text' as const, text: { content: procedure.observations } }],
          emoji: '💡',
        },
      });
    }

    // Referências
    if (procedure.references && procedure.references.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '📚 Referências' } }],
      },
    });

      for (const reference of procedure.references) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'bulleted_list_item' as const,
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text' as const,
                text: { content: reference },
                href: reference.startsWith('http') ? reference : undefined,
              },
            ],
          },
        });
      }
    }

    const response = await this.client.pages.create({
      parent: this.config.databaseIds?.procedures
        ? { type: 'database_id' as const, database_id: this.config.databaseIds.procedures }
        : { type: 'workspace' as const },
      properties: {
        title: {
          title: [{ text: { content: procedure.title } }],
        },
        tags: procedure.tags
          ? { multi_select: procedure.tags.map((t) => ({ name: t })) }
          : undefined,
      },
      children: contentBlocks,
    });

    return response.id;
  }

  /**
   * Cria página de exercício
   */
  async createExercisePage(exercise: {
    name: string;
    category: string;
    muscleGroups: string[];
    equipment?: string;
    difficulty: 'iniciante' | 'intermediário' | 'avançado';
    instructions: string[];
    repetitions?: string;
    duration?: string;
    precautions?: string[];
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<string> {
    const contentBlocks = [];

    // Categoria e dificuldade
    contentBlocks.push({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [
          { type: 'text' as const, text: { content: 'Categoria: ', bold: true } },
          { type: 'text' as const, text: { content: exercise.category } },
          { type: 'text' as const, text: { content: ' | Dificuldade: ', bold: true } },
          { type: 'text' as const, text: { content: exercise.difficulty } },
        ],
      },
    });

    // Grupos musculares
    if (exercise.muscleGroups.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '💪 Grupos Musculares' } }],
        },
      });

      contentBlocks.push({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: exercise.muscleGroups.map((mg) => ({
            type: 'text' as const,
            text: { content: `#${mg} ` },
          })),
        },
      });
    }

    // Equipamento
    if (exercise.equipment) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '🏋️ Equipamento' } }],
        },
      });

      contentBlocks.push({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: exercise.equipment } }],
        },
      });
    }

    // Instruções
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '📋 Instruções' } }],
      },
    });

    for (const [index, instruction] of exercise.instructions.entries()) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'numbered_list_item' as const,
        numbered_list_item: {
          rich_text: [{ type: 'text' as const, text: { content: instruction } }],
        },
      });
    }

    // Parâmetros
    if (exercise.repetitions || exercise.duration) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '⏱️ Parâmetros' } }],
        },
      });

      if (exercise.repetitions) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              { type: 'text' as const, text: { content: 'Repetições: ', bold: true } },
              { type: 'text' as const, text: { content: exercise.repetitions } },
            ],
          },
        });
      }

      if (exercise.duration) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              { type: 'text' as const, text: { content: 'Duração: ', bold: true } },
              { type: 'text' as const, text: { content: exercise.duration } },
            ],
          },
        });
      }
    }

    // Precauções
    if (exercise.precautions && exercise.precautions.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '⚠️ Precauções' } }],
        },
      });

      for (const precaution of exercise.precautions) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'bulleted_list_item' as const,
          bulleted_list_item: {
            rich_text: [{ type: 'text' as const, text: { content: precaution } }],
          },
        });
      }
    }

    // Mídia
    if (exercise.imageUrl || exercise.videoUrl) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '🎥 Mídia' } }],
        },
      });

      if (exercise.imageUrl) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'image' as const,
          image: {
            type: 'external' as const,
            external: { url: exercise.imageUrl },
          },
        });
      }

      if (exercise.videoUrl) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              { type: 'text' as const, text: { content: 'Vídeo: ' }, bold: true },
              {
                type: 'text' as const,
                text: { content: exercise.videoUrl },
                href: exercise.videoUrl,
              },
            ],
          },
        });
      }
    }

    const response = await this.client.pages.create({
      parent: this.config.databaseIds?.exercises
        ? { type: 'database_id' as const, database_id: this.config.databaseIds.exercises }
        : { type: 'workspace' as const },
      properties: {
        title: { title: [{ text: { content: exercise.name } }] },
        category: { select: { name: exercise.category } },
        difficulty: { select: { name: exercise.difficulty } },
      },
      children: contentBlocks,
    });

    return response.id;
  }

  /**
   * Cria página de reunião
   */
  async createMeetingPage(meeting: MeetingNotes): Promise<string> {
    const contentBlocks = [];

    // Data e participantes
    contentBlocks.push({
      object: 'block' as const,
      type: 'callout' as const,
      callout: {
        emoji: '📅',
        rich_text: [
          { type: 'text' as const, text: { content: 'Data: ', bold: true } },
          { type: 'text' as const, text: { content: format(meeting.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) } },
          { type: 'text' as const, text: { content: '\nParticipantes: ', bold: true } },
          { type: 'text' as const, text: { content: meeting.attendees.join(', ') } },
        ],
      },
    });

    // Agenda
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '📋 Agenda' } }],
      },
    });

    for (const item of meeting.agenda) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'to_do' as const,
        to_do: {
          rich_text: [{ type: 'text' as const, text: { content: item } }],
          checked: false,
        },
      });
    }

    // Decisões
    if (meeting.decisions.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '✅ Decisões' } }],
        },
      });

      for (const decision of meeting.decisions) {
        const content = decision.responsible
          ? `${decision.topic} → ${decision.decision} (Responsável: ${decision.responsible})`
          : `${decision.topic} → ${decision.decision}`;

        contentBlocks.push({
          object: 'block' as const,
          type: 'bulleted_list_item' as const,
          bulleted_list_item: {
            rich_text: [{ type: 'text' as const, text: { content } }],
          },
        });
      }
    }

    // Action Items
    if (meeting.actionItems.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '⚡ Ações' } }],
        },
      });

      for (const action of meeting.actionItems) {
        const content = action.dueDate
          ? `${action.task} - ${action.responsible} (até ${format(action.dueDate, 'dd/MM')})`
          : `${action.task} - ${action.responsible}`;

        contentBlocks.push({
          object: 'block' as const,
          type: 'to_do' as const,
          to_do: {
            rich_text: [{ type: 'text' as const, text: { content } }],
            checked: false,
          },
        });
      }
    }

    // Notas
    if (meeting.notes) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '📝 Notas' } }],
        },
      });

      contentBlocks.push({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: meeting.notes } }],
        },
      });
    }

    const response = await this.client.pages.create({
      parent: this.config.databaseIds?.meetings
        ? { type: 'database_id' as const, database_id: this.config.databaseIds.meetings }
        : { type: 'workspace' as const },
      properties: {
        title: {
          title: [{ text: { content: meeting.title } }],
        },
        date: {
          date: { start: meeting.date.toISOString() },
        },
      },
      children: contentBlocks,
    });

    return response.id;
  }

  /**
   * Adiciona conteúdo a uma página existente
   */
  async appendToPage(pageId: string, content: string): Promise<void> {
    try {
      await this.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [{ type: 'text' as const, text: { content } }],
            },
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao adicionar conteúdo à página:', error);
      throw error;
    }
  }

  /**
   * Busca páginas no Notion
   */
  async searchPages(query: string): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await this.client.search({
        query,
        filter: {
          property: 'object',
          value: 'page',
        },
      });

      return (response.results as Array<{
        id: string;
        properties?: {
          title?: { title?: Array<{ plain_text: string }> };
        };
      }>).map((result) => ({
        id: result.id,
        title: result.properties?.title?.title?.[0]?.plain_text || 'Sem título',
      }));
    } catch (error) {
      console.error('Erro ao buscar páginas:', error);
      throw error;
    }
  }

  /**
   * Cria documentação de uma nova feature do sistema
   */
  async createFeatureDocumentation(feature: {
    name: string;
    description: string;
    userStories: Array<{ as: string; iWant: string; soThat: string }>;
    acceptanceCriteria: string[];
    wireframes?: string[];
    apiEndpoints?: Array<{ method: string; path: string; description: string }>;
  }): Promise<string> {
    const contentBlocks = [];

    // Descrição
    contentBlocks.push({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: feature.description } }],
      },
    });

    // User Stories
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '📖 User Stories' } }],
      },
    });

    for (const story of feature.userStories) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'numbered_list_item' as const,
        numbered_list_item: {
          rich_text: [
            { type: 'text' as const, text: { content: 'Como ', bold: true } },
            { type: 'text' as const, text: { content: story.as } },
            { type: 'text' as const, text: { content: ', eu quero ', bold: true } },
            { type: 'text' as const, text: { content: story.iWant } },
            { type: 'text' as const, text: { content: ', para que ', bold: true } },
            { type: 'text' as const, text: { content: story.soThat } },
          ],
        },
      });
    }

    // Critérios de Aceite
    contentBlocks.push({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: {
        rich_text: [{ type: 'text' as const, text: { content: '✅ Critérios de Aceite' } }],
      },
    });

    for (const [index, criteria] of feature.acceptanceCriteria.entries()) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'to_do' as const,
        to_do: {
          rich_text: [{ type: 'text' as const, text: { content: criteria } }],
          checked: false,
        },
      });
    }

    // Wireframes
    if (feature.wireframes && feature.wireframes.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '🎨 Wireframes' } }],
        },
      });

      for (const wireframe of feature.wireframes) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'image' as const,
          image: {
            type: 'external' as const,
            external: { url: wireframe },
          },
        });
      }
    }

    // API Endpoints
    if (feature.apiEndpoints && feature.apiEndpoints.length > 0) {
      contentBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ type: 'text' as const, text: { content: '🔌 API Endpoints' } }],
        },
      });

      for (const endpoint of feature.apiEndpoints) {
        contentBlocks.push({
          object: 'block' as const,
          type: 'code' as const,
          code: {
            rich_text: [
              { type: 'text' as const, text: { content: `${endpoint.method} ${endpoint.path}` } },
            ],
            language: 'http',
          },
        });

        contentBlocks.push({
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [{ type: 'text' as const, text: { content: endpoint.description } }],
          },
        });
      }
    }

    const response = await this.client.pages.create({
      parent: this.config.databaseIds?.wiki
        ? { type: 'database_id' as const, database_id: this.config.databaseIds.wiki }
        : { type: 'workspace' as const },
      properties: {
        title: { title: [{ text: { content: feature.name } }] },
        status: { select: { name: 'Em Desenvolvimento' } },
      },
      children: contentBlocks,
    });

    return response.id;
  }

  /**
   * Atualiza status de uma página
   */
  async updatePageStatus(pageId: string, status: string): Promise<void> {
    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          status: {
            select: { name: status },
          },
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar status da página:', error);
      throw error;
    }
  }

  /**
   * Adiciona comentário a uma página
   */
  async addComment(pageId: string, comment: string): Promise<void> {
    try {
      await this.client.comments.create({
        parent: { page_id: pageId },
        rich_text: [
          {
            type: 'text',
            text: { content: comment },
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      throw error;
    }
  }
}

/**
 * Factory para criar integração com Notion
 */
export class NotionIntegrationFactory {
  static create(config: NotionConfig): NotionIntegration {
    return new NotionIntegration(config);
  }

  static async createFromEnv(): Promise<NotionIntegration> {
    const apiKey = process.env.NOTION_API_KEY || '';
    const databaseIds = {
      procedures: process.env.NOTION_PROCEDURES_DB,
      exercises: process.env.NOTION_EXERCISES_DB,
      meetings: process.env.NOTION_MEETINGS_DB,
      wiki: process.env.NOTION_WIKI_DB,
    };

    return new NotionIntegration({
      apiKey,
      databaseIds,
    });
  }
}
