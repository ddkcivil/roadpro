import { useState, useCallback, useRef } from 'react';

interface RateLimitOptions {
  limit: number;      // Max attempts
  windowMs: number;   // Time window in milliseconds
}

/**
 * A hook to handle client-side rate limiting feedback.
 * Useful for preventing rapid repeated actions like login attempts or sync requests.
 */
export function useRateLimit(options: RateLimitOptions) {
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setAttempts(0);
    setIsLocked(false);
    setRemainingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const checkLimit = useCallback((): boolean => {
    if (isLocked) return false;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= options.limit) {
      setIsLocked(true);
      let timeLeft = options.windowMs / 1000;
      setRemainingTime(timeLeft);

      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setRemainingTime(timeLeft);
        if (timeLeft <= 0) {
          reset();
        }
      }, 1000);

      return false;
    }

    return true;
  }, [attempts, isLocked, options.limit, options.windowMs, reset]);

  return {
    isLocked,
    remainingTime,
    checkLimit,
    reset,
    attempts
  };
}
