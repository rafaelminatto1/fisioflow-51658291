export class NotificationErrorHandler {
  static handleError(error: Error, context: string) {
    console.error('Notification error:', error, context);
  }
}