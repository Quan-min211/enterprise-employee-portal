import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AppError } from '../utils/AppError.js';
import { errorHandler, sanitizeErrorMessage } from '../middleware/errorHandler.js';
import app from '../../server.js';

describe('AppError Utility Class', () => {
  it('creates an AppError with default code when not specified', () => {
    const error400 = new AppError('Lỗi dữ liệu', 400);
    expect(error400.statusCode).toBe(400);
    expect(error400.code).toBe('BAD_REQUEST');
    expect(error400.isOperational).toBe(true);

    const error404 = new AppError('Không tìm thấy', 404);
    expect(error404.statusCode).toBe(404);
    expect(error404.code).toBe('NOT_FOUND');

    const error500 = new AppError('Lỗi server', 500);
    expect(error500.statusCode).toBe(500);
    expect(error500.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('supports custom error codes and structured validation errors', () => {
    const fieldErrors = [{ field: 'email', message: 'Email đã tồn tại' }];
    const error = new AppError('Trùng lặp dữ liệu', 409, 'CUSTOM_DUPLICATE', fieldErrors);

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CUSTOM_DUPLICATE');
    expect(error.errors).toEqual(fieldErrors);
  });

  it('provides static factory helper methods', () => {
    const badReq = AppError.badRequest('Sai định dạng', 'CUSTOM_BAD_REQ');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe('CUSTOM_BAD_REQ');

    const unauth = AppError.unauthorized();
    expect(unauth.statusCode).toBe(401);
    expect(unauth.code).toBe('UNAUTHORIZED');

    const forbid = AppError.forbidden();
    expect(forbid.statusCode).toBe(403);
    expect(forbid.code).toBe('FORBIDDEN');

    const notFound = AppError.notFound();
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');

    const conflict = AppError.conflict('Xung đột', 'CONFLICT_CODE');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.code).toBe('CONFLICT_CODE');

    const internal = AppError.internal('Lỗi nội bộ');
    expect(internal.statusCode).toBe(500);
    expect(internal.code).toBe('INTERNAL_SERVER_ERROR');
    expect(internal.isOperational).toBe(false);
  });
});

describe('Sensitive Information Sanitizer (sanitizeErrorMessage)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_SECRET = 'SuperSecretKey1234567890';
    process.env.DB_PASSWORD = 'TopSecretDbPassword2026';
    process.env.CSRF_SECRET = 'CsrfSecretKeyToken987654';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('masks database URI strings in error messages', () => {
    const msg = 'Failed connecting to mysql://admin:myPass123@10.0.0.5:3306/production_db';
    const sanitized = sanitizeErrorMessage(msg, false, 400, true);
    expect(sanitized).not.toContain('mysql://');
    expect(sanitized).toContain('[DATABASE_URI_REDACTED]');
  });

  it('masks sensitive environment secrets if leaked', () => {
    const msg = `Invalid token verification with key ${process.env.JWT_SECRET} and pass ${process.env.DB_PASSWORD}`;
    const sanitized = sanitizeErrorMessage(msg, false, 400, true);
    expect(sanitized).not.toContain('SuperSecretKey1234567890');
    expect(sanitized).not.toContain('TopSecretDbPassword2026');
    expect(sanitized).toContain('[SECRET_REDACTED]');
    expect(sanitized).toContain('[PASSWORD_REDACTED]');
  });

  it('masks absolute system file paths in production', () => {
    const winPathMsg = 'Error at C:\\HCMUTE\\nam4ki1\\intern\\server\\server.js line 42';
    const sanitizedWin = sanitizeErrorMessage(winPathMsg, true, 400, true);
    expect(sanitizedWin).not.toContain('C:\\HCMUTE');
    expect(sanitizedWin).toContain('[FILE_PATH]');

    const unixPathMsg = 'Error at /home/deployer/apps/intern/server/index.js';
    const sanitizedUnix = sanitizeErrorMessage(unixPathMsg, true, 400, true);
    expect(sanitizedUnix).not.toContain('/home/deployer');
    expect(sanitizedUnix).toContain('[FILE_PATH]');
  });

  it('replaces unhandled 500 or non-operational messages with a generic safe message in production', () => {
    const sensitiveDbQuery = "Syntax error in SQL query: SELECT * FROM `users` WHERE `password_hash` = 'xyz'";
    const sanitized = sanitizeErrorMessage(sensitiveDbQuery, true, 500, false);
    expect(sanitized).toBe('Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.');
    expect(sanitized).not.toContain('users');
    expect(sanitized).not.toContain('password_hash');
  });
});

describe('Centralized Error Handling Integration', () => {
  it('returns standardized 404 JSON for unmatched API endpoints', async () => {
    const res = await request(app).get('/api/unmatched-endpoint-path-xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toContain('không tồn tại');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toBe('/api/unmatched-endpoint-path-xyz');
  });

  it('returns standardized 400 JSON on malformed JSON payload', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test-body', (req, res) => res.json({ ok: true }));
    testApp.use(errorHandler);

    const res = await request(testApp)
      .post('/test-body')
      .set('Content-Type', 'application/json')
      .send('{"badJson: missing_quote');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_JSON');
    expect(res.body.message).toBe('Dữ liệu JSON gửi lên không đúng định dạng.');
    expect(res.body.timestamp).toBeDefined();
  });

  it('formats SequelizeUniqueConstraintError without exposing raw SQL or constraint names', async () => {
    const testApp = express();
    testApp.get('/test-unique', (req, res, next) => {
      const uniqueError = new Error('Validation error');
      uniqueError.name = 'SequelizeUniqueConstraintError';
      uniqueError.errors = [{ path: 'email', value: 'duplicate@fusheng.com.vn' }];
      next(uniqueError);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-unique');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DUPLICATE_ENTRY');
    expect(res.body.message).toContain('trùng lặp');
    expect(res.body.errors).toEqual([
      { field: 'email', message: 'email đã được sử dụng trong hệ thống.' }
    ]);
  });

  it('formats SequelizeValidationError cleanly into structured error list', async () => {
    const testApp = express();
    testApp.get('/test-validation', (req, res, next) => {
      const valError = new Error('Validation error');
      valError.name = 'SequelizeValidationError';
      valError.errors = [
        { path: 'hire_date', message: 'Ngày tuyển dụng không được để trống' }
      ];
      next(valError);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-validation');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toEqual([
      { field: 'hire_date', message: 'Ngày tuyển dụng không được để trống' }
    ]);
  });

  it('hides raw database error message and stack trace in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const testApp = express();
    testApp.get('/test-db-error', (req, res, next) => {
      const dbErr = new Error("SELECT * FROM confidential_table WHERE secret = '123'");
      dbErr.name = 'SequelizeDatabaseError';
      next(dbErr);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-db-error');

    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DATABASE_ERROR');
    expect(res.body.message).toBe('Hệ thống đang gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.');
    expect(res.body.message).not.toContain('confidential_table');
    expect(res.body.message).not.toContain('SELECT');
    expect(res.body.stack).toBeUndefined();
  });
});
