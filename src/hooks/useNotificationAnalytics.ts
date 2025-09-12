import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { notificationPerformanceService } from '@/lib/services/NotificationPerformanceService'

interface AnalyticsData {
  deliveryRate: number
  clickThroughRate: number
  errorRate: number
  averageDeliveryTime: number
  totalNotifications: number
  engagementTrends: Array<{
    date: string
    sent: number
    delivered: number
    clicked: number
    errors: number
  }>
  typePerformance: Array<{
    type: string
    sent: number
    delivered: number
    clicked: number
    deliveryRate: number
    clickRate: number
  }>
  hourlyDistribution: Array<{
    hour: number
    count: number
    deliveryRate: number
  }>
}

interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'frequency' | 'targeting'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  expectedImprovement: string
  actionRequired: string
}

export function useNotificationAnalytics(dateRange: { from: Date; to: Date }) {
  const queryClient = useQueryClient()
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([])

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['notification-analytics', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      // Get notification history for the date range
      const { data: notifications, error: notificationsError } = await supabase
        .from('notification_history')
        .select('*')
        .gte('sent_at', dateRange.from.toISOString())
        .lte('sent_at', dateRange.to.toISOString())
        .order('sent_at', { ascending: true })

      if (notificationsError) throw notificationsError

      // Get performance metrics for the same period
      const { data: metrics, error: metricsError } = await supabase
        .from('notification_performance_metrics')
        .select('*')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true })

      if (metricsError) throw metricsError

      return processAnalyticsData(notifications || [], metrics || [])
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // 30 seconds
  })

  // Generate optimization suggestions
  useEffect(() => {
    if (analyticsData) {
      generateOptimizationSuggestions(analyticsData)
    }
  }, [analyticsData])

  const processAnalyticsData = (notifications: any[], metrics: any[]): AnalyticsData => {
    const totalNotifications = notifications.length
    const deliveredNotifications = notifications.filter(n => n.status === 'delivered').length
    const clickedNotifications = notifications.filter(n => n.clicked_at).length
    const errorNotifications = notifications.filter(n => n.status === 'failed').length

    // Calculate overall rates
    const deliveryRate = totalNotifications > 0 ? deliveredNotifications / totalNotifications : 0
    const clickThroughRate = deliveredNotifications > 0 ? clickedNotifications / deliveredNotifications : 0
    const errorRate = totalNotifications > 0 ? errorNotifications / totalNotifications : 0

    // Calculate average delivery time from metrics
    const averageDeliveryTime = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.delivery_time_ms, 0) / metrics.length 
      : 0

    // Generate engagement trends (daily aggregation)
    const engagementTrends = generateEngagementTrends(notifications)

    // Generate type performance analysis
    const typePerformance = generateTypePerformance(notifications)

    // Generate hourly distribution
    const hourlyDistribution = generateHourlyDistribution(notifications)

    return {
      deliveryRate,
      clickThroughRate,
      errorRate,
      averageDeliveryTime,
      totalNotifications,
      engagementTrends,
      typePerformance,
      hourlyDistribution
    }
  }

  const generateEngagementTrends = (notifications: any[]) => {
    const dailyData = new Map<string, { sent: number; delivered: number; clicked: number; errors: number }>()

    notifications.forEach(notification => {
      const date = new Date(notification.sent_at).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { sent: 0, delivered: 0, clicked: 0, errors: 0 })
      }

      const dayData = dailyData.get(date)!
      dayData.sent++
      
      if (notification.status === 'delivered') dayData.delivered++
      if (notification.clicked_at) dayData.clicked++
      if (notification.status === 'failed') dayData.errors++
    })

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      ...data
    }))
  }

  const generateTypePerformance = (notifications: any[]) => {
    const typeData = new Map<string, { sent: number; delivered: number; clicked: number }>()

    notifications.forEach(notification => {
      const type = notification.type
      
      if (!typeData.has(type)) {
        typeData.set(type, { sent: 0, delivered: 0, clicked: 0 })
      }

      const data = typeData.get(type)!
      data.sent++
      
      if (notification.status === 'delivered') data.delivered++
      if (notification.clicked_at) data.clicked++
    })

    return Array.from(typeData.entries()).map(([type, data]) => ({
      type,
      ...data,
      deliveryRate: data.sent > 0 ? data.delivered / data.sent : 0,
      clickRate: data.delivered > 0 ? data.clicked / data.delivered : 0
    }))
  }

  const generateHourlyDistribution = (notifications: any[]) => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      delivered: 0
    }))

    notifications.forEach(notification => {
      const hour = new Date(notification.sent_at).getHours()
      hourlyData[hour].count++
      
      if (notification.status === 'delivered') {
        hourlyData[hour].delivered++
      }
    })

    return hourlyData.map(data => ({
      hour: data.hour,
      count: data.count,
      deliveryRate: data.count > 0 ? data.delivered / data.count : 0
    }))
  }

  const generateOptimizationSuggestions = (data: AnalyticsData) => {
    const suggestions: OptimizationSuggestion[] = []

    // Delivery rate optimization
    if (data.deliveryRate < 0.8) {
      suggestions.push({
        type: 'timing',
        priority: 'high',
        title: 'Melhorar Taxa de Entrega',
        description: `Taxa de entrega atual: ${(data.deliveryRate * 100).toFixed(1)}%. Considere ajustar horários de envio.`,
        expectedImprovement: 'Aumento de 15-25% na taxa de entrega',
        actionRequired: 'Analisar horários de maior engajamento e ajustar cronograma'
      })
    }

    // Click-through rate optimization
    if (data.clickThroughRate < 0.1) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        title: 'Otimizar Conteúdo das Notificações',
        description: `Taxa de clique atual: ${(data.clickThroughRate * 100).toFixed(1)}%. O conteúdo pode ser mais atrativo.`,
        expectedImprovement: 'Aumento de 20-40% na taxa de clique',
        actionRequired: 'Revisar templates e adicionar call-to-actions mais claros'
      })
    }

    // Error rate optimization
    if (data.errorRate > 0.05) {
      suggestions.push({
        type: 'targeting',
        priority: 'high',
        title: 'Reduzir Taxa de Erro',
        description: `Taxa de erro atual: ${(data.errorRate * 100).toFixed(1)}%. Muitas notificações estão falhando.`,
        expectedImprovement: 'Redução de 50-70% na taxa de erro',
        actionRequired: 'Verificar subscriptions inválidas e implementar limpeza automática'
      })
    }

    // Timing optimization based on hourly distribution
    const bestHours = data.hourlyDistribution
      .filter(h => h.count > 0)
      .sort((a, b) => b.deliveryRate - a.deliveryRate)
      .slice(0, 3)

    if (bestHours.length > 0 && bestHours[0].deliveryRate > data.deliveryRate + 0.1) {
      suggestions.push({
        type: 'timing',
        priority: 'medium',
        title: 'Otimizar Horários de Envio',
        description: `Melhores horários: ${bestHours.map(h => `${h.hour}h`).join(', ')} com ${(bestHours[0].deliveryRate * 100).toFixed(1)}% de entrega.`,
        expectedImprovement: 'Aumento de 10-20% na taxa de entrega',
        actionRequired: 'Concentrar envios nos horários de maior engajamento'
      })
    }

    // Frequency optimization based on type performance
    const underperformingTypes = data.typePerformance
      .filter(t => t.deliveryRate < data.deliveryRate - 0.1)

    if (underperformingTypes.length > 0) {
      suggestions.push({
        type: 'frequency',
        priority: 'low',
        title: 'Ajustar Frequência por Tipo',
        description: `Tipos com baixa performance: ${underperformingTypes.map(t => t.type).join(', ')}.`,
        expectedImprovement: 'Melhoria de 5-15% na performance geral',
        actionRequired: 'Reduzir frequência ou melhorar conteúdo dos tipos com baixa performance'
      })
    }

    setOptimizationSuggestions(suggestions)
  }

  // Export analytics data
  const exportAnalytics = useMutation({
    mutationFn: async (format: 'csv' | 'json') => {
      if (!analyticsData) throw new Error('No data to export')

      const data = {
        summary: {
          deliveryRate: analyticsData.deliveryRate,
          clickThroughRate: analyticsData.clickThroughRate,
          errorRate: analyticsData.errorRate,
          averageDeliveryTime: analyticsData.averageDeliveryTime,
          totalNotifications: analyticsData.totalNotifications
        },
        trends: analyticsData.engagementTrends,
        typePerformance: analyticsData.typePerformance,
        hourlyDistribution: analyticsData.hourlyDistribution,
        optimizationSuggestions
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notification-analytics-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Generate CSV
        const csvData = [
          'Date,Sent,Delivered,Clicked,Errors,Delivery Rate,Click Rate',
          ...analyticsData.engagementTrends.map(trend => 
            `${trend.date},${trend.sent},${trend.delivered},${trend.clicked},${trend.errors},${(trend.delivered/trend.sent*100).toFixed(2)}%,${(trend.clicked/trend.delivered*100).toFixed(2)}%`
          )
        ].join('\n')

        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notification-analytics-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  })

  // Apply optimization suggestion
  const applyOptimization = useMutation({
    mutationFn: async (suggestion: OptimizationSuggestion) => {
      // This would implement the actual optimization logic
      // For now, we'll just mark it as applied
      console.log('Applying optimization:', suggestion)
      
      // Remove the suggestion from the list
      setOptimizationSuggestions(prev => 
        prev.filter(s => s.title !== suggestion.title)
      )
    }
  })

  // Get real-time performance metrics
  const { data: realtimeMetrics } = useQuery({
    queryKey: ['realtime-performance'],
    queryFn: () => notificationPerformanceService.getSystemHealth(),
    refetchInterval: 10 * 1000, // 10 seconds
    staleTime: 5 * 1000 // 5 seconds
  })

  return {
    analyticsData,
    optimizationSuggestions,
    realtimeMetrics,
    isLoading,
    error,
    exportAnalytics,
    applyOptimization
  }
}