/**
 * AppError - Standardized operational application error
 * Provides consistent error structure with HTTP status code and machine-readable error code.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
   * @param {string|null} code - Machine-readable error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
   * @param {Array|null} errors - Array of field-level errors or additional error details
   */
  constructor(message, statusCode = 500, code = null, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || AppError.getDefaultCode(statusCode);
    this.isOperational = true;
    this.errors = errors || null;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Resolve default machine-readable code from HTTP status code
   * @param {number} statusCode
   * @returns {string}
   */
  static getDefaultCode(statusCode) {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 423:
        return 'LOCKED';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR';
    }
  }

  static badRequest(message = 'Dữ liệu không hợp lệ.', code = 'BAD_REQUEST', errors = null) {
    return new AppError(message, 400, code, errors);
  }

  static unauthorized(message = 'Yêu cầu xác thực tài khoản.', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện hành động này.', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Không tìm thấy tài nguyên yêu cầu.', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột.', code = 'CONFLICT', errors = null) {
    return new AppError(message, 409, code, errors);
  }

  static internal(message = 'Đã xảy ra lỗi máy chủ nội bộ.', code = 'INTERNAL_SERVER_ERROR') {
    const error = new AppError(message, 500, code);
    error.isOperational = false;
    return error;
  }
}

export default AppError;
