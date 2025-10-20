import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateDemoUsers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCreateUsers = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-demo-users');

      if (functionError) {
        setError(functionError.message);
        return;
      }

      setResults(data);
    } catch (err: any) {
      console.error('Error creating demo users:', err);
      setError(err.message || 'Erro ao criar usuários de demonstração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Criar Usuários de Demonstração</CardTitle>
          </div>
          <CardDescription>
            Clique no botão abaixo para criar os usuários de demonstração no sistema.
            Esta ação só precisa ser executada uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Usuários que serão criados:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  <strong>Admin:</strong> admin@fisioflow.com (senha: Admin@2025)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  <strong>Fisioterapeuta:</strong> fisio@fisioflow.com (senha: Fisio@2025)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>
                  <strong>Estagiário:</strong> estagiario@fisioflow.com (senha: Estag@2025)
                </span>
              </li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Resultados:</p>
                  <ul className="space-y-1 text-sm">
                    {results.results?.map((result: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        {result.status === 'created' || result.status === 'already_exists' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span>
                          {result.email}: {result.status}
                          {result.error && ` (${result.error})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreateUsers} disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Usuários de Demonstração
            </Button>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Ir para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}