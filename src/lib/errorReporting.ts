import { toast } from "sonner";
import * as Sentry from "@sentry/react";

interface ErrorReportOptions {
    /**
     * User-friendly message to show in the UI.
     * If not provided, a generic message is used.
     */
    userMessage?: string;
    /**
     * Whether to show a toast notification. Default: true.
     */
    showToast?: boolean;
    /**
     * Additional context to log with the error.
     */
    context?: Record<string, any>;
}

/**
 * Centralized error reporting function.
 * Logs to console in development, and Sentry in production (if configured).
 * Optionally shows a user-friendly toast.
 */
export const reportError = (error: unknown, options: ErrorReportOptions = {}) => {
    const {
        userMessage = "Ocorreu um erro inesperado. Tente novamente.",
        showToast = true,
        context = {}
    } = options;

    // 1. Log to Console (always useful for debugging)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ErrorReport] ${errorMessage}`, { error, context });

    // 2. Log to Sentry
    // We check if capturing exceptions is safe/configured implicitly by the Sentry SDK presence
    try {
        Sentry.captureException(error, {
            extra: context,
        });
    } catch (sentryError) {
        console.error("Failed to report error to Sentry:", sentryError);
    }

    // 3. Show Toast
    if (showToast) {
        toast.error(userMessage, {
            description: errorMessage !== userMessage ? errorMessage : undefined,
        });
    }
};
