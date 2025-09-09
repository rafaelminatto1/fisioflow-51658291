import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Shield, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Edit2, 
  PenTool, 
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  record_id: string;
  action: AuditAction;
  user_id: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  session_id: string;
  changes?: FieldChange[];
  reason?: string;
  compliance_flags?: ComplianceFlag[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface FieldChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
  field_type: 'text' | 'json' | 'number' | 'boolean' | 'date';
}

interface ComplianceFlag {
  type: 'gdpr' | 'lgpd' | 'hipaa' | 'signature' | 'consent' | 'retention';
  status: 'compliant' | 'warning' | 'violation';
  message: string;
}

type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'sign'
  | 'export'
  | 'print'
  | 'backup'
  | 'restore'
  | 'access_denied'
  | 'login'
  | 'logout';

interface AuditTrailProps {
  recordId: string;
  entries: AuditEntry[];
  onExportAudit?: () => void;
  showComplianceReport?: boolean;
  className?: string;
}

const actionLabels: Record<AuditAction, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  create: { label: 'Criado', icon: FileText, color: 'bg-green-100 text-green-800' },
  update: { label: 'Atualizado', icon: Edit2, color: 'bg-blue-100 text-blue-800' },
  delete: { label: 'Deletado', icon: Trash2, color: 'bg-red-100 text-red-800' },
  view: { label: 'Visualizado', icon: Eye, color: 'bg-gray-100 text-gray-800' },
  sign: { label: 'Assinado', icon: PenTool, color: 'bg-purple-100 text-purple-800' },
  export: { label: 'Exportado', icon: Download, color: 'bg-orange-100 text-orange-800' },
  print: { label: 'Impresso', icon: FileText, color: 'bg-indigo-100 text-indigo-800' },
  backup: { label: 'Backup', icon: Shield, color: 'bg-teal-100 text-teal-800' },
  restore: { label: 'Restaurado', icon: Shield, color: 'bg-cyan-100 text-cyan-800' },
  access_denied: { label: 'Acesso Negado', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  login: { label: 'Login', icon: User, color: 'bg-green-100 text-green-800' },
  logout: { label: 'Logout', icon: User, color: 'bg-yellow-100 text-yellow-800' }
};

const riskLevels = {
  low: { label: 'Baixo', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Médio', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Alto', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800' }
};

export function AuditTrail({
  recordId: _recordId,
  entries,
  onExportAudit,
  showComplianceReport = true,
  className
}: AuditTrailProps) {
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>(entries);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let filtered = [...entries];

    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(entry => entry.action === filterAction);
    }

    // Filter by user
    if (filterUser !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === filterUser);
    }

    // Filter by date range
    if (filterDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filterDateRange) {
        case '24h':
          filterDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= filterDate
      );
    }

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ip_address.includes(searchTerm) ||
        entry.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  }, [entries, filterAction, filterUser, filterDateRange, searchTerm]);

  const getComplianceSummary = () => {
    const flags = entries.flatMap(entry => entry.compliance_flags || []);
    const compliant = flags.filter(f => f.status === 'compliant').length;
    const warnings = flags.filter(f => f.status === 'warning').length;
    const violations = flags.filter(f => f.status === 'violation').length;
    
    return { compliant, warnings, violations, total: flags.length };
  };

  const uniqueUsers = Array.from(new Set(entries.map(e => ({ id: e.user_id, name: e.user_name }))))
    .filter((user, index, self) => self.findIndex(u => u.id === user.id) === index);

  const renderFieldChange = (change: FieldChange) => {
    const formatValue = (value: unknown, type: string) => {
      if (value === null || value === undefined) return 'N/A';
      
      switch (type) {
        case 'date':
          return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ptBR });
        case 'json':
          return JSON.stringify(value, null, 2);
        case 'boolean':
          return value ? 'Sim' : 'Não';
        default:
          return String(value);
      }
    };

    return (
      <div key={change.field} className="p-3 bg-muted/50 rounded border">
        <h5 className="font-medium text-sm mb-2">{change.field}</h5>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Valor Anterior:</span>
            <pre className="mt-1 p-2 bg-red-50 rounded text-red-800 whitespace-pre-wrap">
              {formatValue(change.old_value, change.field_type)}
            </pre>
          </div>
          <div>
            <span className="text-muted-foreground">Novo Valor:</span>
            <pre className="mt-1 p-2 bg-green-50 rounded text-green-800 whitespace-pre-wrap">
              {formatValue(change.new_value, change.field_type)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const complianceSummary = getComplianceSummary();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Trilha de Auditoria
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Log completo de todas as ações realizadas neste registro
              </p>
            </div>
            {onExportAudit && (
              <Button onClick={onExportAudit} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar Auditoria
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Summary */}
          {showComplianceReport && complianceSummary.total > 0 && (
            <Card className="bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo de Conformidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{complianceSummary.compliant}</div>
                    <div className="text-xs text-muted-foreground">Conformes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{complianceSummary.warnings}</div>
                    <div className="text-xs text-muted-foreground">Avisos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{complianceSummary.violations}</div>
                    <div className="text-xs text-muted-foreground">Violações</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{complianceSummary.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8"
                  />
                </div>
                
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {Object.entries(actionLabels).map(([key, action]) => (
                      <SelectItem key={key} value={key}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todo período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground flex items-center">
                  {filteredEntries.length} de {entries.length} entradas
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Entries */}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma entrada encontrada com os filtros aplicados.</p>
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => {
                const action = actionLabels[entry.action];
                const ActionIcon = action.icon;
                const risk = riskLevels[entry.risk_level];

                return (
                  <Card 
                    key={entry.id} 
                    className={`transition-all hover:shadow-md cursor-pointer ${
                      entry.risk_level === 'critical' ? 'border-red-200 bg-red-50/30' :
                      entry.risk_level === 'high' ? 'border-orange-200 bg-orange-50/30' :
                      'border-border'
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-muted rounded-full">
                            <ActionIcon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={action.color}>
                                {action.label}
                              </Badge>
                              <Badge className={risk.color} variant="outline">
                                {risk.label}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">{entry.user_name}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{entry.user_role}</div>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(new Date(entry.timestamp), 'dd/MM HH:mm:ss', { locale: ptBR })}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">Session: {entry.session_id.slice(0, 8)}...</div>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{entry.ip_address}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {entry.user_agent.split(' ')[0]}
                                </div>
                              </div>
                            </div>
                            
                            {entry.reason && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <strong>Motivo:</strong> {entry.reason}
                              </div>
                            )}

                            {entry.compliance_flags && entry.compliance_flags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {entry.compliance_flags.map((flag, idx) => (
                                  <Badge 
                                    key={idx}
                                    className={
                                      flag.status === 'compliant' ? 'bg-green-100 text-green-800' :
                                      flag.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }
                                    variant="outline"
                                  >
                                    {flag.type.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Detailed Entry Modal */}
          {selectedEntry && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Detalhes da Auditoria</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedEntry(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ação</label>
                    <div className="mt-1">
                      <Badge className={actionLabels[selectedEntry.action].color}>
                        {actionLabels[selectedEntry.action].label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nível de Risco</label>
                    <div className="mt-1">
                      <Badge className={riskLevels[selectedEntry.risk_level].color}>
                        {riskLevels[selectedEntry.risk_level].label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Usuário</label>
                    <p className="mt-1">{selectedEntry.user_name} ({selectedEntry.user_role})</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                    <p className="mt-1">{format(new Date(selectedEntry.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <p className="mt-1 font-mono text-sm">{selectedEntry.ip_address}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                    <p className="mt-1 font-mono text-sm">{selectedEntry.session_id}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="mt-1 font-mono text-xs bg-muted p-2 rounded">{selectedEntry.user_agent}</p>
                </div>

                {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Alterações Realizadas</h4>
                    <div className="space-y-3">
                      {selectedEntry.changes.map(renderFieldChange)}
                    </div>
                  </div>
                )}

                {selectedEntry.compliance_flags && selectedEntry.compliance_flags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Flags de Conformidade</h4>
                    <div className="space-y-2">
                      {selectedEntry.compliance_flags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded">
                          <div className={`p-1 rounded ${
                            flag.status === 'compliant' ? 'bg-green-100' :
                            flag.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            {flag.status === 'compliant' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                             flag.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-600" /> :
                             <AlertTriangle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{flag.type.toUpperCase()}</div>
                            <div className="text-sm text-muted-foreground">{flag.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}