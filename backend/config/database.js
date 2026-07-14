import pkg from 'pg';
const { Pool } = pkg;
import env from './env.js';
import { queryWithRetry } from '../helpers/dbRetry.js';
import logger from '../helpers/logger.js';

const rawPool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // RDS PostgreSQL requires SSL in production; skip SSL for local dev PostgreSQL
  ...(env.nodeEnv === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
});

rawPool.on('error', (err) => {
  logger.error(`Unexpected database pool error: ${err?.message || err}`, {
    stack: err?.stack,
  });
});

/**
 * Wrap pool.query() with automatic retry logic for transient DB errors.
 *
 * Uses exponential backoff with jitter so that connection flapping,
 * pool exhaustion, deadlocks, and other transient conditions are
 * handled gracefully instead of returning an immediate 500.
 *
 * Non-transient errors (syntax errors, constraint violations, etc.)
 * are passed through without retry.
 */
const pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    // Only wrap the 'query' method; pass everything else through
    if (prop !== 'query') {
      return Reflect.get(target, prop, receiver);
    }

    // Return a wrapped version of query with retry logic
    return async function wrappedQuery(text, params, callback) {
      // Callback style — bypass retry and pass through directly
      if (typeof callback === 'function') {
        return target.query.call(target, text, params, callback);
      }

      // Promise style — wrap with automatic retry
      const label = typeof text === 'string' ? text.substring(0, 60) : 'db query';
      return queryWithRetry(() => target.query.call(target, text, params), {
        maxRetries: env.dbRetry.maxRetries,
        baseDelayMs: env.dbRetry.baseDelayMs,
        maxDelayMs: env.dbRetry.maxDelayMs,
        label,
      });
    };
  },
});

export default pool;

