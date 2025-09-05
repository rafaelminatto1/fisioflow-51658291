import { supabase } from '@/integrations/supabase/client';

interface ProviderAccount {
  id: string;
  provider: string;
  account_name: string;
  is_active: boolean;
  daily_usage_count: number;
  daily_limit: number;
  last_used_at: string | null;
}

interface ProviderResponse {
  response: string;
  confidence: number;
  provider: string;
}

interface AIQueryContext {
  patientId?: string;
  userId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

export class ProviderRotator {
  private readonly PROVIDER_PRIORITY = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  
  async query(question: string, context: AIQueryContext): Promise<ProviderResponse | null> {
    try {
      const availableProvider = await this.getAvailableProvider();
      
      if (!availableProvider) {
        console.warn('No available providers for AI query');
        return null;
      }

      const response = await this.executeQuery(availableProvider, question, context);
      
      if (response) {
        await this.updateProviderUsage(availableProvider.id);
        return {
          response: response.text,
          confidence: response.confidence || 0.8,
          provider: availableProvider.provider
        };
      }

      return null;
    } catch (error) {
      console.error('Error in provider rotation:', error);
      return null;
    }
  }

  private async getAvailableProvider(): Promise<ProviderAccount | null> {
    try {
      const { data: providers } = await supabase
        .from('ai_provider_accounts')
        .select('*')
        .eq('is_active', true)
        .order('daily_usage_count', { ascending: true });

      if (!providers || providers.length === 0) {
        return null;
      }

      // Filtra provedores que ainda têm quota disponível
      const availableProviders = providers.filter(p => 
        p.daily_usage_count < p.daily_limit
      );

      if (availableProviders.length === 0) {
        // Se nenhum tem quota, retorna o que foi usado há mais tempo
        return providers.sort((a, b) => {
          const timeA = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
          const timeB = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
          return timeA - timeB;
        })[0];
      }

      // Seleciona baseado na prioridade e quota disponível
      for (const preferredProvider of this.PROVIDER_PRIORITY) {
        const provider = availableProviders.find(p => p.provider === preferredProvider);
        if (provider) {
          return provider;
        }
      }

      // Fallback para qualquer provedor disponível
      return availableProviders[0];
    } catch (error) {
      console.error('Error getting available provider:', error);
      return null;
    }
  }

  private async executeQuery(
    provider: ProviderAccount, 
    question: string, 
    context: AIQueryContext
  ): Promise<{ text: string; confidence: number } | null> {
    try {
      // Simulação de diferentes provedores
      // Em produção, aqui seria implementada a integração real com cada provedor
      switch (provider.provider) {
        case 'chatgpt':
          return await this.queryChatGPT(question);
        case 'claude':
          return await this.queryClaude(question);
        case 'gemini':
          return await this.queryGemini(question);
        case 'perplexity':
          return await this.queryPerplexity(question);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error querying ${provider.provider}:`, error);
      return null;
    }
  }

  private async queryChatGPT(question: string): Promise<{ text: string; confidence: number } | null> {
    // Simulação - em produção seria integração real com ChatGPT Plus
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    return {
      text: `[ChatGPT Plus] Resposta para: ${question}\n\nBaseado na consulta realizada, posso fornecer as seguintes recomendações clínicas...`,
      confidence: 0.85
    };
  }

  private async queryClaude(question: string): Promise<{ text: string; confidence: number } | null> {
    // Simulação - em produção seria integração real com Claude Pro
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));
    
    return {
      text: `[Claude Pro] Análise para: ${question}\n\nConsiderando os aspectos clínicos apresentados, recomendo a seguinte abordagem...`,
      confidence: 0.82
    };
  }

  private async queryGemini(question: string): Promise<{ text: string; confidence: number } | null> {
    // Simulação - em produção seria integração real com Gemini Pro
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));
    
    return {
      text: `[Gemini Pro] Avaliação de: ${question}\n\nCom base nas evidências científicas atuais, sugiro o seguinte protocolo...`,
      confidence: 0.78
    };
  }

  private async queryPerplexity(question: string): Promise<{ text: string; confidence: number } | null> {
    // Simulação - em produção seria integração real com Perplexity Pro
    await new Promise(resolve => setTimeout(resolve, 900 + Math.random() * 700));
    
    return {
      text: `[Perplexity Pro] Pesquisa sobre: ${question}\n\nSegundo as fontes médicas mais recentes, os estudos indicam...`,
      confidence: 0.88
    };
  }

  private async updateProviderUsage(providerId: string): Promise<void> {
    try {
      // Get current usage count
      const { data: currentProvider } = await supabase
        .from('ai_provider_accounts')
        .select('daily_usage_count')
        .eq('id', providerId)
        .single();

      if (currentProvider) {
        await supabase
          .from('ai_provider_accounts')
          .update({
            daily_usage_count: currentProvider.daily_usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', providerId);
      }
    } catch (error) {
      console.error('Error updating provider usage:', error);
    }
  }

  async resetDailyUsage(): Promise<void> {
    try {
      await supabase
        .from('ai_provider_accounts')
        .update({ daily_usage_count: 0 });
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }

  async getProviderStats(): Promise<{
    provider: string;
    account: string;
    isActive: boolean;
    usage: number;
    limit: number;
    utilizationRate: number;
    lastUsed: string | null;
  }[]> {
    try {
      const { data: providers } = await supabase
        .from('ai_provider_accounts')
        .select('*');

      return providers?.map(provider => ({
        provider: provider.provider,
        account: provider.account_name,
        isActive: provider.is_active,
        usage: provider.daily_usage_count,
        limit: provider.daily_limit,
        utilizationRate: (provider.daily_usage_count / provider.daily_limit) * 100,
        lastUsed: provider.last_used_at
      })) || [];
    } catch (error) {
      console.error('Error getting provider stats:', error);
      return [];
    }
  }
}