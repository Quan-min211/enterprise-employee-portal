import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  requestLogger,
  sanitizeUrl,
  getLogLevel,
  formatProductionLog,
  formatDevelopmentLog
} from '../middleware/requestLogger.js';

describe('Request Logger Helper Functions', () => {
  it('sanitizeUrl redacts sensitive query parameters', () => {
    const rawUrl = '/api/auth/callback?code=xyz&token=secret123&password=myPass&keep=true';
    const sanitized = sanitizeUrl(rawUrl);

    expect(sanitized).toContain('token=[REDACTED]');
    expect(sanitized).toContain('password=[REDACTED]');
    expect(sanitized).toContain('keep=true');
    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('myPass');
  });

  it('sanitizeUrl handles empty, non-string, or clean URLs gracefully', () => {
    expect(sanitizeUrl(null)).toBe('/');
    expect(sanitizeUrl('/api/employees?page=1&limit=10')).toBe('/api/employees?page=1&limit=10');
  });

  it('getLogLevel correctly maps status codes', () => {
    expect(getLogLevel(200)).toBe('info');
    expect(getLogLevel(304)).toBe('info');
    expect(getLogLevel(400)).toBe('warn');
    expect(getLogLevel(401)).toBe('warn');
    expect(getLogLevel(404)).toBe('warn');
    expect(getLogLevel(500)).toBe('error');
    expect(getLogLevel(503)).toBe('error');
  });

  it('formatProductionLog returns structured, parseable JSON', () => {
    const entry = {
      level: 'info',
      time: '2026-10-23T06:00:00.000Z',
      requestId: 'test-req-1234',
      method: 'GET',
      url: '/api/leaves',
      status: 200,
      durationMs: 12.34,
      ip: '127.0.0.1',
      userId: 5,
      contentLength: '512',
      userAgent: 'Vitest/2.1'
    };

    const formatted = formatProductionLog(entry);
    const parsed = JSON.parse(formatted);

    expect(parsed.level).toBe('info');
    expect(parsed.requestId).toBe('test-req-1234');
    expect(parsed.durationMs).toBe(12.34);
    expect(parsed.userId).toBe(5);
  });

  it('formatDevelopmentLog returns concise human-readable output', () => {
    const output = formatDevelopmentLog({
      method: 'POST',
      url: '/api/auth/login',
      status: 200,
      durationMs: 25.5,
      contentLength: '120',
      ip: '127.0.0.1',
      requestId: 'abcdef12-3456-7890',
      userId: 1
    });

    expect(output).toContain('[HTTP] POST /api/auth/login 200 25.5ms');
    expect(output).toContain('- 120b');
    expect(output).toContain('[user:1]');
    expect(output).toContain('[abcdef12]');
  });
});

describe('Request Logger Middleware Integration', () => {
  const originalEnv = { ...process.env };
  let logSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits structured JSON log in production mode for 200 responses', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUEST_LOG_ENABLED = 'true';

    const testApp = express();
    testApp.use((req, res, next) => {
      req.id = 'trace-prod-001';
      next();
    });
    testApp.use(requestLogger);
    testApp.get('/api/test-ok', (req, res) => res.status(200).json({ ok: true }));

    const res = await request(testApp).get('/api/test-ok');
    expect(res.status).toBe(200);

    expect(logSpy).toHaveBeenCalled();
    const loggedCall = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedCall);

    expect(parsed.level).toBe('info');
    expect(parsed.method).toBe('GET');
    expect(parsed.url).toBe('/api/test-ok');
    expect(parsed.status).toBe(200);
    expect(parsed.requestId).toBe('trace-prod-001');
    expect(typeof parsed.durationMs).toBe('number');
  });

  it('emits warn level log for 4xx client errors in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUEST_LOG_ENABLED = 'true';

    const testApp = express();
    testApp.use((req, res, next) => {
      req.id = 'trace-prod-404';
      next();
    });
    testApp.use(requestLogger);
    testApp.get('/api/test-not-found', (req, res) => res.status(404).json({ error: 'Not Found' }));

    const res = await request(testApp).get('/api/test-not-found');
    expect(res.status).toBe(404);

    expect(warnSpy).toHaveBeenCalled();
    const loggedCall = warnSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedCall);

    expect(parsed.level).toBe('warn');
    expect(parsed.status).toBe(404);
  });

  it('emits error level log for 5xx server errors in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUEST_LOG_ENABLED = 'true';

    const testApp = express();
    testApp.use(requestLogger);
    testApp.get('/api/test-error', (req, res) => res.status(500).json({ error: 'Server Crash' }));

    const res = await request(testApp).get('/api/test-error');
    expect(res.status).toBe(500);

    expect(errorSpy).toHaveBeenCalled();
    const loggedCall = errorSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedCall);

    expect(parsed.level).toBe('error');
    expect(parsed.status).toBe(500);
  });

  it('skips health check logging when REQUEST_LOG_SKIP_HEALTH=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUEST_LOG_ENABLED = 'true';
    process.env.REQUEST_LOG_SKIP_HEALTH = 'true';

    const testApp = express();
    testApp.use(requestLogger);
    testApp.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

    const res = await request(testApp).get('/api/health');
    expect(res.status).toBe(200);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
