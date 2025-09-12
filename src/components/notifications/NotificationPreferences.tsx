import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  CreditCard,
  Clock,
  Smartphone,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { notificationManager } from '@/lib/services/NotificationManager'
import { NotificationPreferences as INotificationPreferences, NotificationPermissionState } from '@/types/notifications'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<INotificationPreferences | null>(null)
  const [permissionState, setPermissionState] = useState<NotificationPermissionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingNotification, setTestingNotification] = useState(false)

  // Load preferences and permission state
  useEffect(() => {
    loadPreferences()
    loadPermissionState()
  }, [])

  const loadPreferences = async () => {
    try {
      const prefs = await notificationManager.getPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error('Erro ao carregar preferências')
    } finally {
      setLoading(false)
    }
  }

  const loadPermissionState = async () => {
    try {
      const state = await notificationManager.getPermissionState()
      setPermissionState(state)
    } catch (error) {
      console.error('Failed to load permission state:', error)
    }
  }

  const handlePermissionRequest = async () => {
    try {
      const granted = await notificationManager.requestPermission()
      if (granted) {
        await notificationManager.subscribe()
        toast.success('Notificações ativadas com sucesso!')
      } else {
        toast.error('Permissão para notificações negada')
      }
      await loadPermissionState()
    } catch (error) {
      console.error('Failed to request permission:', error)
      toast.error('Erro ao solicitar permissão')
    }
  }

  const handleUnsubscribe = async () => {
    try {
      await notificationManager.unsubscribe()
      toast.success('Notificações desativadas')
      await loadPermissionState()
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      toast.error('Erro ao desativar notificações')
    }
  }

  const handlePreferenceChange = (key: keyof INotificationPreferences, value: any) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      [key]: value
    })
  }

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    if (!preferences) return
    
    setPreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value
      }
    })
  }

  const handleSave = async () => {
    if (!preferences) return
    
    setSaving(true)
    try {
      const updated = await notificationManager.updatePreferences({
        appointmentReminders: preferences.appointmentReminders,
        exerciseReminders: preferences.exerciseReminders,
        progressUpdates: preferences.progressUpdates,
        systemAlerts: preferences.systemAlerts,
        therapistMessages: preferences.therapistMessages,
        paymentReminders: preferences.paymentReminders,
        quietHours: preferences.quietHours,
        weekendNotifications: preferences.weekendNotifications
      })
      
      if (updated) {
        setPreferences(updated)
        toast.success('Preferências salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar preferências')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Erro ao salvar preferências')
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    setTestingNotification(true)
    try {
      // This would call a test notification endpoint
      toast.success('Notificação de teste enviada!')
    } catch (error) {
      console.error('Failed to send test notification:', error)
      toast.error('Erro ao enviar notificação de teste')
    } finally {
      setTestingNotification(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Status das Notificações Push
          </CardTitle>
          <CardDescription>
            Configure as permissões para receber notificações no seu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!permissionState?.supported && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Seu navegador não suporta notificações push.
              </AlertDescription>
            </Alert>
          )}
          
          {permissionState?.supported && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permissionState.permission === 'granted' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    {permissionState.permission === 'granted' ? 'Ativadas' : 'Desativadas'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permissionState.subscribed ? 'Inscrito para receber notificações' : 'Não inscrito'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {permissionState.permission !== 'granted' ? (
                  <Button onClick={handlePermissionRequest}>
                    Ativar Notificações
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleTestNotification}
                      disabled={testingNotification}
                    >
                      {testingNotification ? 'Enviando...' : 'Testar'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleUnsubscribe}
                    >
                      Desativar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>  
    {/* Notification Types */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Tipos de Notificação
            </CardTitle>
            <CardDescription>
              Escolha quais tipos de notificação você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appointment Reminders */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <Label className="text-base font-medium">Lembretes de Consulta</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes 24h e 2h antes das suas consultas
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.appointmentReminders}
                onCheckedChange={(checked) => handlePreferenceChange('appointmentReminders', checked)}
              />
            </div>

            <Separator />

            {/* Exercise Reminders */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-green-500" />
                <div>
                  <Label className="text-base font-medium">Lembretes de Exercícios</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes para fazer seus exercícios prescritos
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.exerciseReminders}
                onCheckedChange={(checked) => handlePreferenceChange('exerciseReminders', checked)}
              />
            </div>

            <Separator />

            {/* Progress Updates */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <div>
                  <Label className="text-base font-medium">Atualizações de Progresso</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações sobre seu progresso e conquistas
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.progressUpdates}
                onCheckedChange={(checked) => handlePreferenceChange('progressUpdates', checked)}
              />
            </div>

            <Separator />

            {/* Therapist Messages */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <div>
                  <Label className="text-base font-medium">Mensagens do Fisioterapeuta</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações de mensagens do seu fisioterapeuta
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.therapistMessages}
                onCheckedChange={(checked) => handlePreferenceChange('therapistMessages', checked)}
              />
            </div>

            <Separator />

            {/* Payment Reminders */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-yellow-500" />
                <div>
                  <Label className="text-base font-medium">Lembretes de Pagamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes sobre pagamentos pendentes
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.paymentReminders}
                onCheckedChange={(checked) => handlePreferenceChange('paymentReminders', checked)}
              />
            </div>

            <Separator />

            {/* System Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <Label className="text-base font-medium">Alertas do Sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas importantes sobre o sistema
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.systemAlerts}
                onCheckedChange={(checked) => handlePreferenceChange('systemAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiet Hours & Schedule */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horários e Programação
            </CardTitle>
            <CardDescription>
              Configure quando você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quiet Hours */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Horário Silencioso</Label>
              <p className="text-sm text-muted-foreground">
                Defina um período em que você não deseja receber notificações
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quiet-start" className="text-sm">De:</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="quiet-end" className="text-sm">Até:</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Weekend Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Notificações nos Finais de Semana</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações aos sábados e domingos
                </p>
              </div>
              <Switch
                checked={preferences.weekendNotifications}
                onCheckedChange={(checked) => handlePreferenceChange('weekendNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {preferences && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-32"
          >
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationPreferences