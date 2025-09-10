// Error logger
export const errorLogger = {
  logWarning: (message: string, context: any) => console.warn(message, context),
  logError: (message: string, context: any) => console.error(message, context)
};