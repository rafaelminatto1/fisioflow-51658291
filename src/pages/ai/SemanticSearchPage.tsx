/**
 * Página de Busca Semântica
 *
 * Demonstração da funcionalidade de busca semântica em evoluções
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SemanticSearch, SemanticSearchExamples } from '@/components/ai/SemanticSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { featureFlags } from '@/lib/config/remote-config';
import { logger } from '@/lib/logging/logger';

export function SemanticSearchPage() {
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [selectedEvolution, setSelectedEvolution] = useState<string | null>(null);

  React.useEffect(() => {
    async function checkFlag() {
      const enabled = await featureFlags.isSemanticSearchEnabled();
      setIsEnabled(enabled);

      if (!enabled) {
        logger.info('[SemanticSearch] Feature desabilitada via Remote Config');
      }
    }

    checkFlag();
  }, []);

  const handleSelectEvolution = (evolutionId: string) => {
    setSelectedEvolution(evolutionId);
    // Navegar para a página da evolução
    navigate(`/patients/${evolutionId}`);
  };

  const handleExampleSearch = (query: string) => {
    // A busca será feita automaticamente pelo componente
    logger.info(`[SemanticSearch] Busca de exemplo: ${query}`);
  };

  if (isEnabled === false) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3">
                <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <CardTitle>Busca Semântica Indisponível</CardTitle>
                <CardDescription>
                  Esta funcionalidade está temporariamente desativada.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              A busca semântica requer índices vetoriais configurados no Firestore.
              Entre em contato com o administrador do sistema para ativar esta funcionalidade.
            </p>

            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-3xl font-bold">Busca Semântica</h1>
              <p className="text-muted-foreground mt-1">
                Encontre evoluções similares usando linguagem natural
              </p>
            </div>
          </div>

          <Badge variant="outline" className="hidden sm:flex">
            <Search className="h-3 w-3 mr-1" />
            Firestore Vector Search
          </Badge>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Como funciona
          </CardTitle>
        </CardHeader>

        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            A busca semântica usa <strong>embeddings vetoriais</strong> para encontrar
            evoluções clinicamente similares, não apenas correspondências exatas de texto.
          </p>

          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Busque em português natural: <em>"pacientes com dor lombar que melhoraram"</em></li>
            <li>Encontre casos similares mesmo com terminologia diferente</li>
            <li>Resultados classificados por similaridade clínica</li>
          </ul>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buscar Evoluções</CardTitle>
              <CardDescription>
                Digite sua consulta em linguagem natural
              </CardDescription>
            </CardHeader>

            <CardContent>
              <SemanticSearch
                onSelectEvolution={handleSelectEvolution}
              />
            </CardContent>
          </Card>
        </div>

        {/* Examples Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exemplos de Busca</CardTitle>
            </CardHeader>

            <CardContent>
              <SemanticSearchExamples onSelect={handleExampleSearch} />
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dicas</CardTitle>
            </CardHeader>

            <CardContent className="text-sm space-y-3">
              <div>
                <p className="font-medium mb-1">Seja específico</p>
                <p className="text-muted-foreground">
                  "Dor lombar aguda após levantamento de peso" funciona melhor que "dor nas costas"
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">Use contexto clínico</p>
                <p className="text-muted-foreground">
                  "Paciente 30 dias após cirurgia de LCA com edema leve"
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">Combine termos</p>
                <p className="text-muted-foreground">
                  "Limitação de movimento no ombro direito com teste de Neer positivo"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estatísticas</CardTitle>
            </CardHeader>

            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evoluções indexadas:</span>
                <span className="font-medium">~1,200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensões do embedding:</span>
                <span className="font-medium">768</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modelo:</span>
                <span className="font-medium">text-embedding-004</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Similaridade mínima:</span>
                <span className="font-medium">65%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SemanticSearchPage;
