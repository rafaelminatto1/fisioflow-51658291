import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { generateOpenAPISpec } from '@/lib/openapi/generator';

export default function ApiDocs() {
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tentar carregar o arquivo OpenAPI YAML
    const loadSpec = async () => {
      try {
        // Primeiro, tentar carregar do arquivo YAML
        const yamlRes = await fetch('/docs/2026/FisioFlow_OpenAPI.yaml');
        if (yamlRes.ok) {
          const yamlText = await yamlRes.text();
          // Tentar usar js-yaml se disponível
          try {
            const yaml = await import('js-yaml');
            const spec = yaml.load(yamlText) as any;
            setOpenApiSpec(spec);
            setLoading(false);
            return;
          } catch (yamlErr) {
            // Se js-yaml não estiver disponível, usar spec gerada
            console.warn('js-yaml não disponível, usando spec gerada');
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar YAML, usando spec gerada:', err);
      }

      // Fallback: usar spec gerada programaticamente
      const spec = generateOpenAPISpec();
      setOpenApiSpec(spec);
      setLoading(false);
    };

    loadSpec();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando documentação da API...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar documentação</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentação da API</h1>
        <p className="text-muted-foreground mt-2">
          Documentação interativa da API REST do FisioFlow v3.0
        </p>
      </div>

      <Tabs defaultValue="swagger" className="w-full">
        <TabsList>
          <TabsTrigger value="swagger">Swagger UI</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="swagger" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {openApiSpec && (
                <div className="swagger-ui-wrapper">
                  <SwaggerUI
                    spec={openApiSpec}
                    docExpansion="list"
                    defaultModelsExpandDepth={1}
                    defaultModelExpandDepth={1}
                    tryItOutEnabled={true}
                    requestInterceptor={(request) => {
                      // Adicionar token de autenticação se disponível
                      const token = localStorage.getItem('supabase.auth.token');
                      if (token) {
                        try {
                          const parsed = JSON.parse(token);
                          if (parsed.access_token) {
                            request.headers['Authorization'] = `Bearer ${parsed.access_token}`;
                          }
                        } catch (e) {
                          // Ignorar erro de parse
                        }
                      }
                      return request;
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a API</CardTitle>
              <CardDescription>
                Informações gerais sobre a API REST do FisioFlow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Autenticação</h3>
                <p className="text-sm text-muted-foreground">
                  Todas as requisições devem incluir o header <code>Authorization</code> com um
                  token JWT válido do Supabase Auth.
                </p>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
                  Authorization: Bearer {'{token}'}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Rate Limiting</h3>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>100 requisições por minuto por IP</li>
                  <li>1000 requisições por hora por usuário</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Versionamento</h3>
                <p className="text-sm text-muted-foreground">
                  A versão atual da API é v1. O versionamento é feito via path prefix{' '}
                  <code>/functions/v1</code>.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Produção:</strong>{' '}
                  <code>https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Desenvolvimento:</strong>{' '}
                  <code>http://localhost:54321/functions/v1</code>
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Códigos de Erro</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <code className="bg-muted px-1 rounded">400</code> - Bad Request
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">401</code> - Unauthorized
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">403</code> - Forbidden
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">404</code> - Not Found
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">409</code> - Conflict
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">422</code> - Unprocessable Entity
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">429</code> - Too Many Requests
                  </div>
                  <div>
                    <code className="bg-muted px-1 rounded">500</code> - Internal Server Error
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

