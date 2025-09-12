import { useState, useEffect, useCallback } from 'react'
import { 
  notificationAnalyticsService, 
  NotificationPerformanceReport,
  NotificationMetrics,
  NotificationTrends,
  UserEngagementMetrics
} from '@/lib/services/NotificationAnalyticsService'
import { NotificationAnalytics } from '@/types/notifications'
import { toast } from 'sonner'
import { logger } from '@/lib/errors/logger'

export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  userId?: string
  notificationType?: string
}

export const useNotificationAnalytics = (initialFilters?: AnalyticsFilters) => {
  const [analytics, setAnalytics] = useState<NotificationAnalytics[]>([])
  const [performanceReport, setPerformanceReport] = useState<NotificationPerformanceReport | null>(null)
  const [trends, setTrends] = useState<NotificationTrends[]>([])
  const [userMetrics, setUserMetrics] = useState<{
    topEngaged: UserEngagementMetrics[]
    lowEngagement: UserEngagementMetrics[]
  }>({ topEngaged: [], lowEngagement: [] })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters || {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  })

  /**
   * Load basic analytics data
   */
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await notificationAnalyticsService.getNotificationAnalytics(
        filters.startDate,
        filters.endDate,
        filters.userId
      )
      
      setAnalytics(data)
      logger.info('Analytics data loaded', { 
        recordCount: data.length,
        filters 
      }, 'useNotificationAnalytics')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar analytics'
      setError(errorMessage)
      logger.error('Failed to load analytics', err, 'useNotificationAnalytics')
      toast.error('Erro ao carregar dados de analytics')
    } finally {
      setLoading(false)
    }
  }, [filters])

  /**
   * Load comprehensive performance report
   */
  const loadPerformanceReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const report = await notificationAnalyticsService.getPerformanceReport(
        filters.startDate,
        filters.endDate
      )
      
      setPerformanceReport(report)
      setTrends(report.trends)
      setUserMetrics({
        topEngaged: report.topEngagedUsers,
        lowEngagement: report.lowEngagementUsers
      })
      
      logger.info('Performance report loaded', { 
        totalSent: report.overview.totalSent,
        engagementRate: report.overview.engagementRate
      }, 'useNotificationAnalytics')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar relatório'
      setError(errorMessage)
      logger.error('Failed to load performance report', err, 'useNotificationAnalytics')
      toast.error('Erro ao carregar relatório de performance')
    } finally {
      setLoading(false)
    }
  }, [filters])

  /**
   * Update filters and reload data
   */
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  /**
   * Set date range filter
   */
  const setDateRange = useCallback((days: number) => {
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    updateFilters({ startDate, endDate })
  }, [updateFilters])

  /**
   * Track notification interaction
   */
  const trackInteraction = useCallback(async (
    notificationId: string,
    action: 'delivered' | 'clicked' | 'dismissed',
    metadata?: Record<string, any>
  ) => {
    try {
      await notificationAnalyticsService.trackNotificationInteraction(
        notificationId,
        action,
        metadata
      )
      
      logger.info('Interaction tracked', { notificationId, action }, 'useNotificationAnalytics')
      
      // Optionally reload data to reflect changes
      // loadAnalytics()
    } catch (error) {
      logger.error('Failed to track interaction', error, 'useNotificationAnalytics')
    }
  }, [])

  /**
   * Export analytics data
   */
  const exportData = useCallback(async (includeUserData: boolean = false) => {
    try {
      const csvData = await notificationAnalyticsService.exportAnalyticsToCSV(
        filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        filters.endDate || new Date(),
        includeUserData
      )
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notification-analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Dados exportados com sucesso!')
      logger.info('Analytics data exported', { includeUserData }, 'useNotificationAnalytics')
    } catch (error) {
      logger.error('Failed to export data', error, 'useNotificationAnalytics')
      toast.error('Erro ao exportar dados')
    }
  }, [filters])

  /**
   * Get metrics summary
   */
  const getMetricsSummary = useCallback((): NotificationMetrics | null => {
    if (!performanceReport) return null
    return performanceReport.overview
  }, [performanceReport])

  /**
   * Get top performing notification types
   */
  const getTopPerformingTypes = useCallback((limit: number = 3) => {
    if (!performanceReport) return []
    
    return Object.entries(performanceReport.byType)
      .sort(([, a], [, b]) => b.engagementRate - a.engagementRate)
      .slice(0, limit)
      .map(([type, metrics]) => ({ type, metrics }))
  }, [performanceReport])

  /**
   * Get low performing notification types
   */
  const getLowPerformingTypes = useCallback((limit: number = 3) => {
    if (!performanceReport) return []
    
    return Object.entries(performanceReport.byType)
      .filter(([, metrics]) => metrics.totalSent > 10) // Only consider types with significant volume
      .sort(([, a], [, b]) => a.engagementRate - b.engagementRate)
      .slice(0, limit)
      .map(([type, metrics]) => ({ type, metrics }))
  }, [performanceReport])

  /**
   * Calculate period comparison
   */
  const getPeriodComparison = useCallback(async () => {
    if (!filters.startDate || !filters.endDate) return null
    
    try {
      const currentPeriodDays = Math.ceil(
        (filters.endDate.getTime() - filters.startDate.getTime()) / (24 * 60 * 60 * 1000)
      )
      
      const previousStartDate = new Date(
        filters.startDate.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000
      )
      const previousEndDate = new Date(filters.startDate.getTime())
      
      const [currentData, previousData] = await Promise.all([
        notificationAnalyticsService.getNotificationAnalytics(
          filters.startDate,
          filters.endDate,
          filters.userId
        ),
        notificationAnalyticsService.getNotificationAnalytics(
          previousStartDate,
          previousEndDate,
          filters.userId
        )
      ])
      
      const currentMetrics = currentData.reduce(
        (acc, item) => ({
          totalSent: acc.totalSent + item.totalSent,
          totalClicked: acc.totalClicked + item.totalClicked,
          totalDelivered: acc.totalDelivered + item.totalDelivered
        }),
        { totalSent: 0, totalClicked: 0, totalDelivered: 0 }
      )
      
      const previousMetrics = previousData.reduce(
        (acc, item) => ({
          totalSent: acc.totalSent + item.totalSent,
          totalClicked: acc.totalClicked + item.totalClicked,
          totalDelivered: acc.totalDelivered + item.totalDelivered
        }),
        { totalSent: 0, totalClicked: 0, totalDelivered: 0 }
      )
      
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }
      
      return {
        sentChange: calculateChange(currentMetrics.totalSent, previousMetrics.totalSent),
        deliveredChange: calculateChange(currentMetrics.totalDelivered, previousMetrics.totalDelivered),
        clickedChange: calculateChange(currentMetrics.totalClicked, previousMetrics.totalClicked)
      }
    } catch (error) {
      logger.error('Failed to calculate period comparison', error, 'useNotificationAnalytics')
      return null
    }
  }, [filters])

  // Load data when filters change
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadPerformanceReport()
    }
  }, [filters, loadPerformanceReport])

  // Load basic analytics separately if needed
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadAnalytics()
    }
  }, [filters, loadAnalytics])

  return {
    // State
    analytics,
    performanceReport,
    trends,
    userMetrics,
    loading,
    error,
    filters,
    
    // Actions
    loadAnalytics,
    loadPerformanceReport,
    updateFilters,
    setDateRange,
    trackInteraction,
    exportData,
    
    // Computed values
    getMetricsSummary,
    getTopPerformingTypes,
    getLowPerformingTypes,
    getPeriodComparison
  }
}

export default useNotificationAnalytics