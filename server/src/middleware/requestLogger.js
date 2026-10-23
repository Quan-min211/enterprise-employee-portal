import { extractClientIp, extractUserAgent, extractRequestId } from '../utils/auditLogger.js';

/**
 * Sanitize URL to prevent leaking sensitive parameters (token, password, secret) in logs
 * @param {string} url
 * @returns {string}
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '/';
  return url.replace(/([?&](?:token|password|secret|access_token|authorization)=)[^&]+/gi, '$1[REDACTED]');
};

/**
 * Resolve log level based on HTTP response status code
 * @param {number} status
 * @returns {'info'|'warn'|'error'}
 */
export const getLogLevel = (status) => {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
};

/**
 * Format structured JSON log entry for production log aggregators (Pino-compatible)
 * @param {Object} entry
 * @returns {string} JSON string
 */
export const formatProductionLog = (entry) => {
  return JSON.stringify(entry);
};

/**
 * Format human-readable string for development mode (Morgan-compatible)
 * @param {Object} data
 * @returns {string}
 */
export const formatDevelopmentLog = ({
  method,
  url,
  status,
  durationMs,
  contentLength,
  ip,
  requestId,
  userId
}) => {
  const userTag = userId ? ` [user:${userId}]` : '';
  const traceTag = requestId ? ` [${requestId.slice(0, 8)}]` : '';
  const sizeTag = contentLength ? ` - ${contentLength}b` : '';
  return `[HTTP] ${method} ${url} ${status} ${durationMs}ms${sizeTag}${userTag}${traceTag}`;
};

/**
 * Request Logger Middleware
 * Provides structured JSON logging in production (Pino-compatible) and concise output in development (Morgan-compatible).
 */
export const requestLogger = (req, res, next) => {
  const isTest = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';
  const skipHealth = process.env.REQUEST_LOG_SKIP_HEALTH === 'true';

  // In test environment, skip logging by default unless explicitly enabled
  if (isTest && process.env.REQUEST_LOG_ENABLED !== 'true') {
    return next();
  }

  const startTime = process.hrtime.bigint();

  const onResponseComplete = () => {
    res.removeListener('finish', onResponseComplete);
    res.removeListener('close', onResponseComplete);

    // Skip health check logging if explicitly configured to reduce noisy log traffic
    if (skipHealth && req.path === '/api/health' && res.statusCode === 200) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1000000n) + Number((endTime - startTime) % 1000000n) / 1000000;
    const roundedDuration = Math.round(durationMs * 100) / 100;

    const status = res.statusCode;
    const method = req.method;
    const url = sanitizeUrl(req.originalUrl || req.url);
    const requestId = extractRequestId(req);
    const ip = extractClientIp(req);
    const userAgent = extractUserAgent(req);
    const contentLength = res.getHeader('content-length') || null;
    const userId = req.user?.id || null;

    if (isProduction) {
      const logEntry = {
        level: getLogLevel(status),
        time: new Date().toISOString(),
        requestId,
        method,
        url,
        status,
        durationMs: roundedDuration,
        ip,
        userId,
        contentLength,
        userAgent
      };
      const formatted = formatProductionLog(logEntry);
      if (status >= 500) {
        console.error(formatted);
      } else if (status >= 400) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    } else {
      const formatted = formatDevelopmentLog({
        method,
        url,
        status,
        durationMs: roundedDuration,
        contentLength,
        ip,
        requestId,
        userId
      });
      if (status >= 500) {
        console.error(formatted);
      } else if (status >= 400) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
  };

  res.on('finish', onResponseComplete);
  res.on('close', onResponseComplete);

  next();
};

export default requestLogger;
