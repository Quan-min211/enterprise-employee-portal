import crypto from 'crypto';

/**
 * Request ID Middleware
 * Assigns or propagates a unique correlation ID for every incoming request.
 * Attaches `req.id` / `req.requestId` and sends `X-Request-Id` in the response headers.
 */
export const requestId = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];

  // Accept valid correlation ID from client/proxy (8-64 chars, alphanumeric, hyphens, underscores)
  // or generate a new RFC 4122 UUID v4
  const reqId =
    typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId.trim())
      ? incomingId.trim()
      : crypto.randomUUID();

  req.id = reqId;
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);

  next();
};

export default requestId;
