import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { pathToFileURL } from 'url';
import { sequelize } from '../config/database.js';
import {
  ensureMetaTable,
  getMigrationFiles,
  getMigrationStatus,
  MIGRATIONS_DIR
} from '../migrations/run.js';

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Standard Migrations Architecture', () => {
  it('identifies all 3-digit numbered migration files in sequential order', async () => {
    const files = await getMigrationFiles();

    expect(files.length).toBeGreaterThanOrEqual(7);
    expect(files[0]).toBe('001_initial_schema.js');
    expect(files[1]).toBe('002_hr_domain.js');
    expect(files[2]).toBe('003_first_time_password_change.js');
    expect(files[3]).toBe('004_account_lockout.js');
    expect(files[4]).toBe('005_audit_log_traceability.js');
    expect(files[5]).toBe('006_user_indexes.js');
    expect(files[6]).toBe('007_leave_requests_index.js');

    // Ensure every file follows strict naming convention
    for (const file of files) {
      expect(file).toMatch(/^\d{3}_[a-z0-9_]+\.js$/);
    }
  });

  it('ensures every migration file exports both up and down functions for reversibility', async () => {
    const files = await getMigrationFiles();

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const mod = await import(pathToFileURL(filePath).href);

      expect(typeof mod.up).toBe('function');
      expect(typeof mod.down).toBe('function');
    }
  });

  it('ensures meta table creation is idempotent and returns migration status array', async () => {
    await ensureMetaTable();

    const status = await getMigrationStatus();
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThanOrEqual(5);

    for (const item of status) {
      expect(item.name).toBeDefined();
      expect(typeof item.applied).toBe('boolean');
    }
  });
});
