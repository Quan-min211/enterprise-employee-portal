import { AppError } from '../utils/AppError.js';

/**
 * Sanitize error messages to prevent leaking sensitive information
 * (database connection strings, secrets, passwords, tokens, absolute system paths).
 * In production mode, non-operational / 500 errors are completely replaced with a safe generic message.
 *
 * @param {string} message - Original error message
 * @param {boolean} isProduction - Flag indicating production environment
 * @param {number} statusCode - HTTP status code
 * @param {boolean} isOperational - Whether the error is trusted/operational
 * @returns {string} Sanitized message
 */
export const sanitizeErrorMessage = (message, isProduction = false, statusCode = 500, isOperational = false) => {
  if (typeof message !== 'string') {
    return isProduction ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.' : String(message);
  }

  // In production, unhandled non-operational errors must NEVER expose raw error details
  if (isProduction && !isOperational) {
    return 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.';
  }

  let sanitized = message;

  // Mask database connection strings (e.g. mysql://user:pass@host:port/db)
  sanitized = sanitized.replace(/(mysql|postgres|mongodb|redis):\/\/[^\s]+/gi, '[DATABASE_URI_REDACTED]');

  // Mask known sensitive environment secrets if inadvertently leaked in text
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length > 5 && sanitized.includes(process.env.JWT_SECRET)) {
    sanitized = sanitized.split(process.env.JWT_SECRET).join('[SECRET_REDACTED]');
  }
  if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 3 && sanitized.includes(process.env.DB_PASSWORD)) {
    sanitized = sanitized.split(process.env.DB_PASSWORD).join('[PASSWORD_REDACTED]');
  }
  if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length > 5 && sanitized.includes(process.env.CSRF_SECRET)) {
    sanitized = sanitized.split(process.env.CSRF_SECRET).join('[SECRET_REDACTED]');
  }

  // Mask absolute system file paths in production to avoid leaking server filesystem structure
  if (isProduction) {
    // Windows paths (e.g. C:\path\to\file)
    sanitized = sanitized.replace(/[a-zA-Z]:\\[^:\s\n\r"']+/g, '[FILE_PATH]');
    // Unix-style paths (e.g. /home/user/project/file)
    sanitized = sanitized.replace(/\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+/g, '[FILE_PATH]');
  }

  return sanitized;
};

/**
 * Centralized Error Handler Middleware
 * Standardizes error responses, assigns machine-readable codes,
 * and strictly prevents sensitive internal details from leaking to clients.
 */
export const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || AppError.getDefaultCode(statusCode);
  let message = err.message || 'Da xay ra loi may chu noi bo.';
  let errors = err.errors || null;
  let isOperational = err.isOperational ?? (statusCode < 500);

  // 1. Malformed JSON payload from express.json() / body-parser
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Dữ liệu JSON gửi lên không đúng định dạng.';
    isOperational = true;
    errors = null;
  }

  // 2. Sequelize Unique Constraint Error (e.g. duplicate email, employee_code)
  else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Dữ liệu đã tồn tại trong hệ thống (trùng lặp giá trị).';
    isOperational = true;
    errors = Array.isArray(err.errors)
      ? err.errors.map((e) => ({
          field: e.path,
          message: `${e.path} đã được sử dụng trong hệ thống.`
        }))
      : null;
  }

  // 3. Sequelize Validation Error
  else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Dữ liệu gửi lên không đáp ứng quy chuẩn hợp lệ.';
    isOperational = true;
    errors = Array.isArray(err.errors)
      ? err.errors.map((e) => ({
          field: e.path,
          message: e.message
        }))
      : null;
  }

  // 4. Sequelize Foreign Key Constraint Error
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Dữ liệu liên kết không hợp lệ hoặc bản ghi liên quan không tồn tại.';
    isOperational = true;
    errors = null;
  }

  // 5. Sequelize Database / Connection / Query / Timeout Errors
  else if (
    err.name === 'SequelizeDatabaseError' ||
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeConnectionRefusedError' ||
    err.name === 'SequelizeAccessDeniedError' ||
    err.name === 'SequelizeTimeoutError'
  ) {
    statusCode = err.name.includes('Connection') ? 503 : 500;
    code = 'DATABASE_ERROR';
    // Raw SQL queries and database internals must NEVER be leaked in production
    message = isProduction
      ? 'Hệ thống đang gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.'
      : err.message;
    isOperational = isProduction;
    errors = null;
  }

  // 6. JWT Authentication Errors
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    isOperational = true;
    errors = null;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Token xác thực không hợp lệ.';
    isOperational = true;
    errors = null;
  }

  // 7. CSRF Errors (if passed to next)
  else if (err.code === 'EBADCSRFTOKEN' || err.code === 'CSRF_INVALID') {
    statusCode = 403;
    code = 'CSRF_INVALID';
    message = 'Yêu cầu bị từ chối do thiếu hoặc sai CSRF token.';
    isOperational = true;
    errors = null;
  }

  // Internal server-side logging (always logs complete debug info securely on server)
  const clientIp = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  console.error(
    `[API Error] ${req.method || 'UNKNOWN'} ${req.originalUrl || req.url || '/'} | Status: ${statusCode} | Code: ${code} | IP: ${clientIp} | Msg: ${err.message}`
  );
  if (statusCode >= 500 && err.stack) {
    console.error(err.stack);
  }

  // Sanitize message before sending to client
  const clientMessage = sanitizeErrorMessage(message, isProduction, statusCode, isOperational);

  // Send standardized JSON error response
  res.status(statusCode).json({
    success: false,
    code,
    message: clientMessage,
    errors,
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.url || '/',
    ...(req.id && { requestId: req.id }),
    ...(isDevelopment && {
      stack: err.stack,
      ...(err.original?.message && { rawDbError: err.original.message })
    })
  });
};

export default errorHandler;
