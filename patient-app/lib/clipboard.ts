/**
 * Clipboard Utilities
 * Helper functions for clipboard operations
 */


/**
 * Copy text to clipboard
 */

import * as Clipboard from 'expo-clipboard';
import { log } from './logger';
import { asyncResult, Result } from './async';

export async function copyToClipboard(text: string): Promise<Result<void>> {
  return asyncResult(async () => {
    await Clipboard.setStringAsync(text);
    log.info('CLIPBOARD', 'Text copied', { length: text.length });
  }, 'copyToClipboard');
}

/**
 * Get text from clipboard
 */
export async function getFromClipboard(): Promise<Result<string>> {
  return asyncResult(async () => {
    const text = await Clipboard.getStringAsync();
    log.info('CLIPBOARD', 'Text retrieved', { length: text?.length || 0 });
    return text;
  }, 'getFromClipboard');
}

/**
 * Copy URL to clipboard
 */
export async function copyUrl(url: string): Promise<Result<void>> {
  return copyToClipboard(url);
}

/**
 * Copy code snippet to clipboard
 */
export async function copyCode(code: string, language?: string): Promise<Result<void>> {
  return copyToClipboard(code);
}
