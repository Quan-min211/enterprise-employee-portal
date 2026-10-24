import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, AuditLog } from '../models/index.js';
import {
  extractClientIp,
  extractUserAgent,
  extractRequestId
} from '../utils/auditLogger.js';

let testDept = null;
let testAdmin = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'TRACE_DEPT',
    name: 'Traceability Dept',
    description: 'Testing Audit Traceability'
  });

  testAdmin = await User.create({
    employee_code: 'ADM-TRACE-01',
    full_name: 'Audit Traceability Admin',
    email: 'admin.trace@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'IT Compliance',
    department_id: testDept.id,
    status: 'active'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Audit Logger Extraction Helpers', () => {
  it('extractClientIp correctly extracts from x-forwarded-for chain', () => {
    const reqWithProxy = {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' }
    };
    expect(extractClientIp(reqWithProxy)).toBe('203.0.113.195');

    const reqDirect = {
      headers: {},
      socket: { remoteAddress: '192.168.1.50' }
    };
    expect(extractClientIp(reqDirect)).toBe('192.168.1.50');

    expect(extractClientIp(null)).toBeNull();
  });

  it('extractUserAgent extracts and truncates long User-Agent strings', () => {
    const normalUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
    expect(extractUserAgent({ headers: { 'user-agent': normalUa } })).toBe(normalUa);

    const longUa = 'A'.repeat(600);
    const extracted = extractUserAgent({ headers: { 'user-agent': longUa } });
    expect(extracted.length).toBe(500);

    expect(extractUserAgent(null)).toBeNull();
  });

  it('extractRequestId extracts from req.id or header', () => {
    expect(extractRequestId({ id: 'uuid-1234-abcd' })).toBe('uuid-1234-abcd');
    expect(extractRequestId({ requestId: 'uuid-5678-efgh' })).toBe('uuid-5678-efgh');
    expect(extractRequestId({ headers: { 'x-request-id': 'custom-req-id-999' } })).toBe('custom-req-id-999');
    expect(extractRequestId(null)).toBeNull();
  });
});

describe('X-Request-Id Middleware & End-to-End Traceability', () => {
  it('assigns X-Request-Id header to incoming requests automatically', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('preserves valid custom X-Request-Id sent by client or gateway', async () => {
    const customId = 'client-trace-id-abc12345';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.requestId).toBe(customId);
  });

  it('records IP, User-Agent, and Request ID upon login', async () => {
    const clientTraceId = 'login-test-trace-id-9999';
    const testUserAgent = 'FuShengMobileApp/2.4.1 (iOS 17.2)';
    const testIp = '113.161.45.88';

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Request-Id', clientTraceId)
      .set('User-Agent', testUserAgent)
      .set('X-Forwarded-For', testIp)
      .send({
        email: 'admin.trace@fusheng.com.vn',
        password: 'Admin@123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['x-request-id']).toBe(clientTraceId);

    // Verify database audit log record
    const auditRecord = await AuditLog.findOne({
      where: {
        action: 'auth.login',
        user_id: testAdmin.id,
        request_id: clientTraceId
      }
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord.ip_address).toBe(testIp);
    expect(auditRecord.user_agent).toBe(testUserAgent);
    expect(auditRecord.request_id).toBe(clientTraceId);
  });

  it('records IP, User-Agent, and Request ID on failed login attempts', async () => {
    const clientTraceId = 'failed-login-trace-8888';
    const testIp = '14.161.22.11';
    const testUa = 'PostmanRuntime/7.36.0';

    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Request-Id', clientTraceId)
      .set('User-Agent', testUa)
      .set('X-Forwarded-For', testIp)
      .send({
        email: 'admin.trace@fusheng.com.vn',
        password: 'WrongPassword@999'
      });

    expect(res.status).toBe(401);

    const auditRecord = await AuditLog.findOne({
      where: {
        action: 'auth.login.failed',
        user_id: testAdmin.id,
        request_id: clientTraceId
      }
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord.ip_address).toBe(testIp);
    expect(auditRecord.user_agent).toBe(testUa);
  });

  it('filters audit logs by ip_address and request_id via API', async () => {
    // Perform admin login to obtain cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.trace@fusheng.com.vn',
        password: 'Admin@123'
      });

    const adminCookie = loginRes.headers['set-cookie'];

    const searchIp = '113.161.45.88';
    const filterRes = await request(app)
      .get(`/api/audit-logs?ip_address=${searchIp}`)
      .set('Cookie', adminCookie);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.success).toBe(true);
    expect(filterRes.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(filterRes.body.logs.every((log) => log.ip_address === searchIp)).toBe(true);
  });
});
