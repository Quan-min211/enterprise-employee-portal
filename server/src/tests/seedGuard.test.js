/**
 * Production Seed Guard Security Tests (SEC-02)
 *
 * Verifies that:
 * 1. seedDatabase() refuses to create default demo accounts (Admin@123, Manager@123, Employee@123)
 *    when NODE_ENV === 'production'.
 * 2. seedDatabase() still works normally in non-production environments (development).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { sequelize } from '../config/database.js';
import { User, Department, Announcement } from '../models/index.js';
import { seedDatabase } from '../config/seed.js';

const originalNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('Production Demo Seed Guard (SEC-02)', () => {
  it('blocks seeding default users, departments, and announcements when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';

    const result = await seedDatabase();

    expect(result).toEqual({ skipped: true, reason: 'production_guard' });
    expect(await User.count()).toBe(0);
    expect(await Department.count()).toBe(0);
    expect(await Announcement.count()).toBe(0);
  });

  it('allows seeding demo data when NODE_ENV=development', async () => {
    process.env.NODE_ENV = 'development';

    await seedDatabase();

    expect(await Department.count()).toBeGreaterThan(0);
    expect(await User.count()).toBeGreaterThan(0);
    const admin = await User.findOne({ where: { email: 'admin@fusheng.com.vn' } });
    expect(admin).not.toBeNull();
  });
});
