import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { User, Building, Clock, Bell, Shield, Download, Upload, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // Profile
    name: 'Dr. João Silva',
    crm: 'CRM/SP 123456',
    specialty: 'Fisioterapia',
    email: 'joao.silva@email.com',
    phone: '(11) 99999-9999',
    
    // Clinic
    clinicName: 'Clínica FisioFlow',
    clinicAddress: 'Rua das Flores, 123 - São Paulo, SP',
    clinicPhone: '(11) 3333-4444',
    
    // Work Hours
    workStart: '08:00',
    workEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    reminderHours: '24',
    
    // System
    theme: 'system',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    
    // Consultation Types and Values
    consultationTypes: [
      { name: 'Consulta Inicial', duration: 60, value: 150 },
      { name: 'Fisioterapia', duration: 45, value: 120 },
      { name: 'Reavaliação', duration: 30, value: 100 },
      { name: 'Consulta de Retorno', duration: 30, value: 80 }
    ]
  });

  const handleSave = () => {
    // Mock save functionality
    localStorage.setItem('clinicSettings', JSON.stringify(settings));
    toast({
      title: "Configurações salvas",
      description: "Suas configurações foram atualizadas com sucesso.",
    });
  };

  const handleExportData = () => {
    // Mock export functionality
    const dataToExport = {
      patients: JSON.parse(localStorage.getItem('patients') || '[]'),
      appointments: JSON.parse(localStorage.getItem('appointments') || '[]'),
      exercises: JSON.parse(localStorage.getItem('exercises') || '[]'),
      settings: settings
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fisioflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    toast({
      title: "Dados exportados",
      description: "Backup dos dados criado com sucesso.",
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          // Mock import functionality
          if (importedData.patients) localStorage.setItem('patients', JSON.stringify(importedData.patients));
          if (importedData.appointments) localStorage.setItem('appointments', JSON.stringify(importedData.appointments));
          if (importedData.exercises) localStorage.setItem('exercises', JSON.stringify(importedData.exercises));
          if (importedData.settings) setSettings(importedData.settings);
          
          toast({
            title: "Dados importados",
            description: "Dados restaurados com sucesso. Recarregue a página para ver as alterações.",
          });
        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: "Erro na importação",
            description: "Arquivo inválido ou corrompido.",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  value={settings.crm}
                  onChange={(e) => setSettings(prev => ({ ...prev, crm: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  value={settings.specialty}
                  onChange={(e) => setSettings(prev => ({ ...prev, specialty: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Dados da Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => setSettings(prev => ({ ...prev, clinicName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="clinicAddress">Endereço</Label>
              <Textarea
                id="clinicAddress"
                value={settings.clinicAddress}
                onChange={(e) => setSettings(prev => ({ ...prev, clinicAddress: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="clinicPhone">Telefone da Clínica</Label>
              <Input
                id="clinicPhone"
                value={settings.clinicPhone}
                onChange={(e) => setSettings(prev => ({ ...prev, clinicPhone: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horários de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="workStart">Início Expediente</Label>
                <Input
                  id="workStart"
                  type="time"
                  value={settings.workStart}
                  onChange={(e) => setSettings(prev => ({ ...prev, workStart: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="workEnd">Fim Expediente</Label>
                <Input
                  id="workEnd"
                  type="time"
                  value={settings.workEnd}
                  onChange={(e) => setSettings(prev => ({ ...prev, workEnd: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lunchStart">Início Almoço</Label>
                <Input
                  id="lunchStart"
                  type="time"
                  value={settings.lunchStart}
                  onChange={(e) => setSettings(prev => ({ ...prev, lunchStart: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lunchEnd">Fim Almoço</Label>
                <Input
                  id="lunchEnd"
                  type="time"
                  value={settings.lunchEnd}
                  onChange={(e) => setSettings(prev => ({ ...prev, lunchEnd: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label>Dias de Funcionamento</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { key: 'monday', label: 'Segunda' },
                  { key: 'tuesday', label: 'Terça' },
                  { key: 'wednesday', label: 'Quarta' },
                  { key: 'thursday', label: 'Quinta' },
                  { key: 'friday', label: 'Sexta' },
                  { key: 'saturday', label: 'Sábado' },
                  { key: 'sunday', label: 'Domingo' }
                ].map((day) => (
                  <Badge
                    key={day.key}
                    variant={settings.workDays.includes(day.key) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newWorkDays = settings.workDays.includes(day.key)
                        ? settings.workDays.filter(d => d !== day.key)
                        : [...settings.workDays, day.key];
                      setSettings(prev => ({ ...prev, workDays: newWorkDays }));
                    }}
                  >
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultation Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Consulta e Valores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.consultationTypes.map((type, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                  <div>
                    <Label>Tipo de Consulta</Label>
                    <Input value={type.name} readOnly />
                  </div>
                  <div>
                    <Label>Duração (min)</Label>
                    <Input
                      type="number"
                      value={type.duration}
                      onChange={(e) => {
                        const newTypes = [...settings.consultationTypes];
                        newTypes[index].duration = parseInt(e.target.value);
                        setSettings(prev => ({ ...prev, consultationTypes: newTypes }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      value={type.value}
                      onChange={(e) => {
                        const newTypes = [...settings.consultationTypes];
                        newTypes[index].value = parseFloat(e.target.value);
                        setSettings(prev => ({ ...prev, consultationTypes: newTypes }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">Receber lembretes de consultas por email</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsNotifications">Notificações por SMS</Label>
                <p className="text-sm text-muted-foreground">Receber lembretes de consultas por SMS</p>
              </div>
              <Switch
                id="smsNotifications"
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
              />
            </div>
            
            <div>
              <Label htmlFor="reminderHours">Antecedência dos Lembretes</Label>
              <Select value={settings.reminderHours} onValueChange={(value) => setSettings(prev => ({ ...prev, reminderHours: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora antes</SelectItem>
                  <SelectItem value="2">2 horas antes</SelectItem>
                  <SelectItem value="24">1 dia antes</SelectItem>
                  <SelectItem value="48">2 dias antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Preferências do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="theme">Tema</Label>
                <Select value={settings.theme} onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="language">Idioma</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (BR)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                    <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gerenciamento de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportData} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar Dados
              </Button>
              
              <div>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-data"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('import-data')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar Dados
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              O backup inclui todos os pacientes, agendamentos, exercícios e configurações.
              Mantenha backups regulares dos seus dados importantes.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Salvar Configurações
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}