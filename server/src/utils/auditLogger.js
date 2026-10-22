import { AuditLog } from '../models/index.js';

/**
 * Extract client IP address safely from Express request, handling proxy headers
 * @param {import('express').Request|null} req
 * @returns {string|null}
 */
export const extractClientIp = (req) => {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
};

/**
 * Extract User-Agent safely from Express request (truncated to 500 characters)
 * @param {import('express').Request|null} req
 * @returns {string|null}
 */
export const extractUserAgent = (req) => {
  if (!req) return null;
  const ua = req.headers?.['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 500) : null;
};

/**
 * Extract Request / Correlation ID safely from Express request
 * @param {import('express').Request|null} req
 * @returns {string|null}
 */
export const extractRequestId = (req) => {
  if (!req) return null;
  return req.id || req.requestId || req.headers?.['x-request-id'] || null;
};

/**
 * Writes an immutable audit log entry.
 * Automatically resolves client IP, User-Agent, and Request ID if `req` is supplied.
 *
 * @param {Object} options
 * @param {import('express').Request} [options.req] - Express request object for automatic context
 * @param {number|null} [options.userId] - ID of actor (defaults to req.user.id if omitted)
 * @param {string} options.action - Action identifier (e.g. 'auth.login.success')
 * @param {string} options.entityType - Target entity type (e.g. 'user', 'leave_request')
 * @param {number|null} [options.entityId] - Target entity primary key
 * @param {Object|null} [options.details] - Arbitrary contextual metadata JSON
 * @param {string|null} [options.ipAddress] - Explicit IP override
 * @param {string|null} [options.userAgent] - Explicit User-Agent override
 * @param {string|null} [options.requestId] - Explicit Request ID override
 */
export const writeAuditLog = async ({
  req = null,
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null,
  requestId = null
}) => {
  try {
    const resolvedUserId = userId || req?.user?.id || null;
    const resolvedIp = ipAddress || extractClientIp(req);
    const resolvedUa = userAgent || extractUserAgent(req);
    const resolvedReqId = requestId || extractRequestId(req);

    await AuditLog.create({
      user_id: resolvedUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: resolvedIp,
      user_agent: resolvedUa,
      request_id: resolvedReqId
    });
  } catch (error) {
    console.error('Unable to write audit log:', error.message);
  }
};

export default writeAuditLog;
