/**
 * Inngest Workflows Registry
 *
 * Central export point for all Inngest workflows
 */

export { cleanupWorkflow } from './cleanup';
export { birthdayMessagesWorkflow } from './birthdays';
export { dailyReportsWorkflow } from './daily-reports';
export { weeklySummaryWorkflow } from './weekly-summary';
export { expiringVouchersWorkflow } from './expiring-vouchers';
export { dataIntegrityWorkflow } from './data-integrity';
export {
  sendNotificationWorkflow,
  sendNotificationBatchWorkflow,
} from './notifications';
export {
  sendEmailWorkflow,
  sendEmailBatchWorkflow,
} from './email';
export {
  sendWhatsAppWorkflow,
  sendWhatsAppBatchWorkflow,
} from './whatsapp';
export {
  appointmentReminderWorkflow,
  appointmentCreatedWorkflow,
} from './appointments';
export {
  aiPatientInsightsWorkflow,
  aiBatchInsightsWorkflow,
} from './ai-insights';
