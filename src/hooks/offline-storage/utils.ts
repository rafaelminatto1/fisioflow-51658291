export function isCacheExpired(timestamp: number, expiryMs: number): boolean {
  return Date.now() - timestamp > expiryMs;
}

export function generateActionId(actionType: string): string {
  return `${actionType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function canRetryAction(retryCount: number, maxRetries: number): boolean {
  return retryCount < maxRetries;
}
