import {
  ConsecutiveBreaker,
  ExponentialBackoff,
  circuitBreaker,
  handleAll,
  retry,
} from 'cockatiel';
import { logger } from '../../config/logger.js';

// Shared Gemini circuit breaker: opens after 5 consecutive post-retry failures, resets after 30s
const geminiBreaker = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(5),
});

geminiBreaker.onBreak(() => logger.error('Gemini circuit breaker opened — failing fast'));
geminiBreaker.onReset(() => logger.info('Gemini circuit breaker closed — resuming requests'));
geminiBreaker.onHalfOpen(() => logger.info('Gemini circuit breaker half-open — probing'));

// 3 attempts for the main chat response (user-facing)
const chatRetryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 5_000 }),
});

chatRetryPolicy.onRetry(({ attempt }) =>
  logger.warn({ attempt }, 'Gemini main call failed, retrying')
);

// 2 attempts for metadata inference (already has a silent fallback)
const inferRetryPolicy = retry(handleAll, {
  maxAttempts: 2,
  backoff: new ExponentialBackoff({ initialDelay: 300, maxDelay: 2_000 }),
});

inferRetryPolicy.onRetry(({ attempt }) =>
  logger.warn({ attempt }, 'Gemini infer call failed, retrying')
);

// Circuit breaker is outermost: if open, fail fast without retrying.
// Retry is innermost: exhaust attempts before the breaker records a failure.
export const executeMainGeminiCall = <T>(fn: () => Promise<T>): Promise<T> =>
  geminiBreaker.execute(() => chatRetryPolicy.execute(fn));

export const executeInferGeminiCall = <T>(fn: () => Promise<T>): Promise<T> =>
  geminiBreaker.execute(() => inferRetryPolicy.execute(fn));
