import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { pathToFileURL } from 'url';
import { sequelize } from '../config/database.js';
import {
  ensureDataMetaTable,
  getSeederFiles,
  getSeederStatus,
  SEEDERS_DIR
} from '../seeders/run.js';

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Standard Seeders Architecture', () => {
  it('identifies all 3-digit numbered seeder files in sequential order', async () => {
    const files = await getSeederFiles();

    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(files[0]).toBe('001_core_departments.js');
    expect(files[1]).toBe('002_vietnam_holidays_2026.js');
    expect(files[2]).toBe('003_demo_accounts.js');
    expect(files[3]).toBe('004_bulk_factory_employees.js');

    // Ensure every file follows strict naming convention
    for (const file of files) {
      expect(file).toMatch(/^\d{3}_[a-z0-9_]+\.js$/);
    }
  });

  it('ensures every seeder file exports both up and down functions for reversibility', async () => {
    const files = await getSeederFiles();

    for (const file of files) {
      const filePath = path.join(SEEDERS_DIR, file);
      const mod = await import(pathToFileURL(filePath).href);

      expect(typeof mod.up).toBe('function');
      expect(typeof mod.down).toBe('function');
    }
  });

  it('ensures sequelize_data table creation is idempotent and returns seeder status array', async () => {
    await ensureDataMetaTable();

    const status = await getSeederStatus();
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThanOrEqual(4);

    for (const item of status) {
      expect(item.name).toBeDefined();
      expect(typeof item.applied).toBe('boolean');
    }
  });
});
