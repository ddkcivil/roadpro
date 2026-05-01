/**
 * Retry utility with exponential backoff for handling transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('Failed to fetch')) return true;
  if (error.message?.includes('ERR_INTERNET_DISCONNECTED')) return true;
  if (error.message?.includes('net::ERR')) return true;
  
  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') return true;
  
  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) return true;
  
  // Rate limiting
  if (error.status === 429) return true;
  
  // Connection refused
  if (error.message?.includes('ECONNREFUSED')) return true;
  
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: any;
  let delayMs = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!shouldRetry(error, attempt)) {
        console.warn(`[Retry] Non-retryable error on attempt ${attempt + 1}:`, error.message);
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        console.error(`[Retry] All ${maxRetries + 1} attempts failed:`, error.message);
        throw error;
      }

      // Calculate delay with jitter
      const jitter = Math.random() * 0.1 * delayMs; // ±10% jitter
      const actualDelay = Math.min(delayMs + jitter, maxDelayMs);

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${actualDelay.toFixed(0)}ms...`,
        error.message
      );

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Wraps a function to add retry logic
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): T {
  return (async (...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
