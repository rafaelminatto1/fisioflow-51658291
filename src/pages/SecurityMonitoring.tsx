import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SecurityMonitoring() {
  const { recentAttempts, suspiciousActivity, isLoading } = useSecurityMonitoring();

  const successRate = recentAttempts.length > 0
    ? ((recentAttempts.filter((a) => a.success).length / recentAttempts.length) * 100).toFixed(1)
    : '0';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento de Segurança</h1>
          <p className="text-muted-foreground">
            Acompanhe tentativas de login e atividades suspeitas
          </p>
        </div>

        {/* Alertas de Atividade Suspeita */}
        {suspiciousActivity.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{suspiciousActivity.length} atividade(s) suspeita(s) detectada(s)</strong>
              <br />
              Múltiplas tentativas de login falhadas na última hora.
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Tentativas</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentAttempts.length}</div>
              <p className="text-xs text-muted-foreground">Últimas 50 tentativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">Login bem-sucedidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atividades Suspeitas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suspiciousActivity.length}</div>
              <p className="text-xs text-muted-foreground">Na última hora</p>
            </CardContent>
          </Card>
        </div>

        {/* Atividades Suspeitas */}
        {suspiciousActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Atividades Suspeitas
              </CardTitle>
              <CardDescription>
                Contas com múltiplas falhas de login na última hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Tentativas Falhadas</TableHead>
                    <TableHead>IPs Utilizados</TableHead>
                    <TableHead>Última Tentativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspiciousActivity.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{activity.email}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{activity.failed_attempts}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {activity.ip_addresses.map((ip, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {ip || 'N/A'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {format(new Date(activity.last_attempt), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tentativas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Tentativas de Login Recentes</CardTitle>
            <CardDescription>Últimas 50 tentativas de autenticação</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando tentativas...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        {attempt.success ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Falha
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{attempt.email}</TableCell>
                      <TableCell>
                        <code className="text-xs">{attempt.ip_address || 'N/A'}</code>
                      </TableCell>
                      <TableCell>
                        {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm:ss', {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
