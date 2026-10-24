/**
 * Migration Runner — Enterprise database version control for MySQL.
 * Deterministic, transactional, and auditable schema management.
 *
 * CLI Usage:
 *   npm run migrate          — Apply all pending migrations in order (up)
 *   npm run migrate:undo     — Revert the latest executed migration (down)
 *   npm run migrate:status   — Display status table of all migrations
 */

import path from 'path';
import { readdir } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const MIGRATIONS_DIR = __dirname;
export const META_TABLE = 'sequelize_meta';

/**
 * Ensure the sequelize_meta table exists for tracking executed migrations
 */
export async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`${META_TABLE}\` (
      \`name\` VARCHAR(255) NOT NULL,
      \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Get all executed migrations recorded in sequelize_meta
 * @returns {Promise<Array<{name: string, executed_at: Date}>>}
 */
export async function getExecutedMigrations() {
  await ensureMetaTable();
  const rows = await sequelize.query(
    `SELECT name, executed_at FROM \`${META_TABLE}\` ORDER BY name ASC`,
    { type: QueryTypes.SELECT }
  );
  return rows;
}

/**
 * List all valid migration filenames in MIGRATIONS_DIR
 * @returns {Promise<string[]>}
 */
export async function getMigrationFiles() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.match(/^\d{3}_.*\.js$/))
    .sort();
  return files;
}

/**
 * Get status of all migrations (applied or pending)
 * @returns {Promise<Array<{name: string, applied: boolean, executedAt: Date|null}>>}
 */
export async function getMigrationStatus() {
  await sequelize.authenticate();
  const executedRows = await getExecutedMigrations();
  const executedMap = new Map(executedRows.map((r) => [r.name, r.executed_at]));
  const allFiles = await getMigrationFiles();

  return allFiles.map((file) => ({
    name: file,
    applied: executedMap.has(file),
    executedAt: executedMap.get(file) || null
  }));
}

/**
 * Execute all pending migrations in sequential order inside transactions
 * @returns {Promise<number>} Number of newly applied migrations
 */
export async function migrateUp() {
  await sequelize.authenticate();
  console.log('MySQL database connected.');

  await ensureMetaTable();
  const executedRows = await getExecutedMigrations();
  const executedSet = new Set(executedRows.map((r) => r.name));
  const files = await getMigrationFiles();

  let ranCount = 0;

  for (const file of files) {
    if (executedSet.has(file)) {
      continue;
    }

    console.log(`  ▶  Applying migration: ${file}`);
    const mod = await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href);

    if (typeof mod.up !== 'function') {
      throw new Error(`Migration ${file} does not export an up() function.`);
    }

    const transaction = await sequelize.transaction();
    try {
      await mod.up(sequelize.getQueryInterface(), sequelize);
      await sequelize.query(
        `INSERT INTO \`${META_TABLE}\` (name) VALUES (:name)`,
        { replacements: { name: file }, transaction }
      );
      await transaction.commit();
      console.log(`  ✅ Done: ${file}`);
      ranCount++;
    } catch (err) {
      await transaction.rollback();
      console.error(`  ❌ Failed: ${file}`, err.message);
      throw err;
    }
  }

  if (ranCount === 0) {
    console.log('Database schema is already up to date. No pending migrations.');
  } else {
    console.log(`\nMigrations complete. ${ranCount} new migration(s) successfully applied.`);
  }

  return ranCount;
}

/**
 * Rollback the latest executed migration inside a transaction
 * @returns {Promise<string|null>} Name of rolled back migration, or null if none
 */
export async function migrateDown() {
  await sequelize.authenticate();
  console.log('MySQL database connected.');

  await ensureMetaTable();
  const executedRows = await getExecutedMigrations();

  if (executedRows.length === 0) {
    console.log('No executed migrations found in database to revert.');
    return null;
  }

  const latest = executedRows[executedRows.length - 1];
  console.log(`  ⏪ Reverting migration: ${latest.name}`);

  const filePath = path.join(MIGRATIONS_DIR, latest.name);
  const mod = await import(pathToFileURL(filePath).href);

  if (typeof mod.down !== 'function') {
    throw new Error(`Migration ${latest.name} does not export a down() function for rollback.`);
  }

  const transaction = await sequelize.transaction();
  try {
    await mod.down(sequelize.getQueryInterface(), sequelize);
    await sequelize.query(
      `DELETE FROM \`${META_TABLE}\` WHERE name = :name`,
      { replacements: { name: latest.name }, transaction }
    );
    await transaction.commit();
    console.log(`  ✅ Successfully rolled back: ${latest.name}`);
    return latest.name;
  } catch (err) {
    await transaction.rollback();
    console.error(`  ❌ Failed to rollback ${latest.name}:`, err.message);
    throw err;
  }
}

/**
 * Print a formatted console table showing status of all migrations
 */
export async function printStatus() {
  const statusList = await getMigrationStatus();
  console.log('\n================ DATABASE MIGRATIONS STATUS ================');
  console.log('| Status   | Migration File                     | Executed At         |');
  console.log('|----------|------------------------------------|---------------------|');
  for (const item of statusList) {
    const statusText = item.applied ? 'APPLIED ' : 'PENDING ';
    const dateText = item.executedAt
      ? new Date(item.executedAt).toISOString().replace('T', ' ').slice(0, 19)
      : '                   ';
    console.log(`| ${statusText} | ${item.name.padEnd(34)} | ${dateText} |`);
  }
  console.log('============================================================\n');
}

// CLI execution handler
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const args = process.argv.slice(2);
  const isUndo = args.includes('--undo');
  const isStatus = args.includes('--status');

  (async () => {
    try {
      if (isStatus) {
        await printStatus();
      } else if (isUndo) {
        await migrateDown();
      } else {
        await migrateUp();
      }
      await sequelize.close();
      process.exit(0);
    } catch (err) {
      console.error('\nMigration command failed:', err.message);
      try {
        await sequelize.close();
      } catch (_) {}
      process.exit(1);
    }
  })();
}
