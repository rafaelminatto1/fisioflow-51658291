import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { notificationManager } from '@/lib/services/NotificationManager'
import { NotificationHistory as INotificationHistory, NotificationType, NotificationStatus } from '@/types/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.APPOINTMENT_REMINDER:
    case NotificationType.APPOINTMENT_CHANGE:
      return <Calendar className="w-4 h-4 text-blue-500" />
    case NotificationType.EXERCISE_REMINDER:
    case NotificationType.EXERCISE_MILESTONE:
      return <Dumbbell className="w-4 h-4 text-green-500" />
    case NotificationType.PROGRESS_UPDATE:
      return <TrendingUp className="w-4 h-4 text-purple-500" />
    case NotificationType.THERAPIST_MESSAGE:
      return <MessageSquare className="w-4 h-4 text-orange-500" />
    case NotificationType.PAYMENT_REMINDER:
      return <CreditCard className="w-4 h-4 text-yellow-500" />
    case NotificationType.SYSTEM_ALERT:
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    default:
      return <Bell className="w-4 h-4 text-gray-500" />
  }
}

const getStatusIcon = (status: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.DELIVERED:
      return <CheckCircle className="w-3 h-3 text-green-500" />
    case NotificationStatus.CLICKED:
      return <CheckCircle className="w-3 h-3 text-blue-500" />
    case NotificationStatus.FAILED:
      return <XCircle className="w-3 h-3 text-red-500" />
    case NotificationStatus.PENDING:
      return <Clock className="w-3 h-3 text-yellow-500" />
    default:
      return <Clock className="w-3 h-3 text-gray-500" />
  }
}

const getStatusColor = (status: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.DELIVERED:
      return 'bg-green-100 text-green-800 border-green-200'
    case NotificationStatus.CLICKED:
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case NotificationStatus.FAILED:
      return 'bg-red-100 text-red-800 border-red-200'
    case NotificationStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusLabel = (status: NotificationStatus) => {
  switch (status) {
    case NotificationStatus.SENT:
      return 'Enviada'
    case NotificationStatus.DELIVERED:
      return 'Entregue'
    case NotificationStatus.CLICKED:
      return 'Clicada'
    case NotificationStatus.FAILED:
      return 'Falhou'
    case NotificationStatus.PENDING:
      return 'Pendente'
    default:
      return 'Desconhecido'
  }
}

export const NotificationHistory: React.FC = () => {
  const [notifications, setNotifications] = useState<INotificationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async (offset = 0) => {
    try {
      if (offset === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const newNotifications = await notificationManager.getNotificationHistory(20, offset)
      
      if (offset === 0) {
        setNotifications(newNotifications)
      } else {
        setNotifications(prev => [...prev, ...newNotifications])
      }

      setHasMore(newNotifications.length === 20)
    } catch (error) {
      console.error('Failed to load notification history:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadNotifications(notifications.length)
    }
  }

  const refresh = () => {
    loadNotifications(0)
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Histórico de Notificações
            </CardTitle>
            <CardDescription>
              Visualize todas as notificações enviadas para você
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm leading-tight">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(notification.status))}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(notification.status)}
                              {getStatusLabel(notification.status)}
                            </span>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.sentAt, { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                        
                        {notification.clickedAt && (
                          <p className="text-xs text-muted-foreground">
                            Clicada {formatDistanceToNow(notification.clickedAt, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        )}
                      </div>
                      
                      {notification.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">
                          Erro: {notification.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {index < notifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMore} 
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Carregar mais'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationHistory