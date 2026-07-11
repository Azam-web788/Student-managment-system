import logger from './logger.js';
import env from '../config/env.js';

/**
 * PostgreSQL SQLSTATE codes that are transient/retryable.
 * Retrying these errors has a high probability of success.
 */
const TRANSIENT_CODES = new Set([
  '08006', // connection_failure — connection to server was lost
  '08003', // connection_does_not_exist — connection is no longer active
  '08001', // sqlclient_unable_to_establish_sqlconnection — could not connect
  '08004', // sqlserver_rejected_establishment_of_sqlconnection — server rejected connection
  '40001', // serialization_failure — concurrent transaction conflict
  '40P01', // deadlock_detected — transactions waiting on each other's locks
  '55P03', // lock_not_available — could not obtain a row-level lock (e.g., NOWAIT)
  '57P01', // admin_shutdown — server shutting down for maintenance
  '57P02', // crash_shutdown — server crashed unexpectedly
  '57P03', // cannot_connect_now — server not accepting connections (starting up)
  '53',   // insufficient_resources — class for resource exhaustion
  '53100', // disk_full
  '53200', // out_of_memory
  '53300', // too_many_connections
  '53400', // configuration_limit_exceeded
]);

/**
 * Connection-level error messages that indicate transient failures.
 * These cover cases where pg itself throws before getting a SQLSTATE code.
 */
const TRANSIENT_MESSAGE_PATTERNS = [
  /connection terminated/i,
  /terminating connection/i,
  /could not connect/i,
  /connect ETIMEDOUT/i,
  /connect ECONNREFUSED/i,
  /connect ECONNRESET/i,
  /read ECONNRESET/i,
  /socket hang up/i,
  /timeout/i,
  /no more connections/i,
  /pool is draining/i,
  /client has encountered a connection error/i,
  /cannot read properties of undefined/i,
];

/**
 * Determine whether a database error is transient and retryable.
 *
 * @param {Error} err - The error thrown by pg or the pool
 * @returns {boolean} true if the error is likely transient
 */
export function isTransientError(err) {
  if (!err) return false;

  // Check by PostgreSQL SQLSTATE code
  if (err.code && TRANSIENT_CODES.has(err.code)) {
    return true;
  }

  // Check by error message patterns
  const msg = err.message || String(err);
  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Sleep for a given number of milliseconds (promise-based).
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the delay for a given retry attempt using exponential backoff + jitter.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) * (0.5 + random * 0.5)
 * This gives a delay between 50% and 100% of the calculated backoff value.
 *
 * @param {number} attempt - The retry attempt number (0-indexed)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attempt, baseDelayMs = 100, maxDelayMs = 5000) {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const clampedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add jitter: between 50% and 100% of the clamped delay
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.min(clampedDelay * jitter, maxDelayMs);
}

/**
 * Wrap a database query function with automatic retry logic using
 * exponential backoff with jitter.
 *
 * Only transient errors trigger a retry. Permanent errors (syntax errors,
 * constraint violations, etc.) are thrown immediately.
 *
 * @param {Function} queryFn - An async function that executes the query.
 *        It receives no arguments — the caller should pre-bind any params.
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelayMs=100] - Base delay between retries (ms)
 * @param {number} [options.maxDelayMs=5000] - Maximum delay between retries (ms)
 * @param {string} [options.label='db query'] - A label for log messages
 * @returns {Promise<any>} The result of the successful query
 * @throws {Error} The last error if all retries are exhausted
 */
export async function queryWithRetry(queryFn, options = {}) {
  const maxRetries = options.maxRetries ?? env.dbRetry.maxRetries;
  const baseDelayMs = options.baseDelayMs ?? env.dbRetry.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? env.dbRetry.maxDelayMs;
  const label = options.label || 'db query';

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      lastError = err;

      if (!isTransientError(err)) {
        // Permanent error — don't retry, throw immediately
        throw err;
      }

      // If we've exhausted retries, log and throw the final error
      if (attempt >= maxRetries) {
        logger.error(`Query failed after ${maxRetries + 1} attempts [${label}]: ${err?.message || err}`, {
          errorCode: err?.code,
          attempts: attempt + 1,
          errorStack: err?.stack,
        });
        throw err;
      }

      // Calculate backoff delay and wait
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      logger.warn(`Transient DB error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries}) [${label}]: ${err?.message || err}`, {
        errorCode: err?.code,
        attempt: attempt + 1,
        maxRetries,
        nextRetryDelay: delay,
      });

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript/defensive fallback
  throw lastError || new Error('Query failed after all retries');
}

/**
 * Create a wrapped version of a pg Pool's query method with retry logic.
 * This is the main export you'll use to replace pool.query() calls.
 *
 * Usage:
 *   import pool from '../config/database.js';
 *   const result = await retryableQuery(pool, 'SELECT * FROM users WHERE id = $1', [id]);
 *
 * @param {import('pg').Pool} pool - The pg Pool instance
 * @param {string} text - SQL query text
 * @param {Array<any>} [params] - Query parameters
 * @param {Object} [options] - Additional retry options (see queryWithRetry)
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function retryableQuery(pool, text, params, options = {}) {
  const label = typeof text === 'string' ? text.substring(0, 60) : 'db query';
  return queryWithRetry(() => pool.query(text, params), { ...options, label });
}
