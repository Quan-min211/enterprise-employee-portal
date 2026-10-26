/**
 * Seeder Runner — Standard Enterprise Data Seeding System for MySQL.
 * Deterministic, transactional, auditable, and reversible seed data management.
 *
 * CLI Usage:
 *   npm run seed           — Apply all pending seeders in sequential order (up)
 *   npm run seed:undo      — Revert the latest executed seeder (down)
 *   npm run seed:status    — Display status table of all seeders (APPLIED / PENDING)
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

export const SEEDERS_DIR = __dirname;
export const DATA_META_TABLE = 'sequelize_data';

/**
 * Ensure the sequelize_data table exists for tracking executed seeders
 */
export async function ensureDataMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`${DATA_META_TABLE}\` (
      \`name\` VARCHAR(255) NOT NULL,
      \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Get all executed seeders recorded in sequelize_data
 * @returns {Promise<Array<{name: string, executed_at: Date}>>}
 */
export async function getExecutedSeeders() {
  await ensureDataMetaTable();
  const rows = await sequelize.query(
    `SELECT name, executed_at FROM \`${DATA_META_TABLE}\` ORDER BY name ASC`,
    { type: QueryTypes.SELECT }
  );
  return rows;
}

/**
 * List all valid seeder filenames in SEEDERS_DIR matching \d{3}_*.js
 * @returns {Promise<string[]>}
 */
export async function getSeederFiles() {
  const files = (await readdir(SEEDERS_DIR))
    .filter((f) => f.match(/^\d{3}_.*\.js$/))
    .sort();
  return files;
}

/**
 * Get status of all seeders (applied or pending)
 * @returns {Promise<Array<{name: string, applied: boolean, executedAt: Date|null}>>}
 */
export async function getSeederStatus() {
  await sequelize.authenticate();
  const executedRows = await getExecutedSeeders();
  const executedMap = new Map(executedRows.map((r) => [r.name, r.executed_at]));
  const allFiles = await getSeederFiles();

  return allFiles.map((file) => ({
    name: file,
    applied: executedMap.has(file),
    executedAt: executedMap.get(file) || null
  }));
}

/**
 * Execute all pending seeders in sequential order inside transactions
 * @returns {Promise<number>} Number of newly applied seeders
 */
export async function seedUp() {
  await sequelize.authenticate();
  console.log('MySQL database connected.');

  await ensureDataMetaTable();
  const executedRows = await getExecutedSeeders();
  const executedSet = new Set(executedRows.map((r) => r.name));
  const files = await getSeederFiles();

  let ranCount = 0;

  for (const file of files) {
    if (executedSet.has(file)) {
      continue;
    }

    console.log(`  ▶  Applying seeder: ${file}`);
    const mod = await import(pathToFileURL(path.join(SEEDERS_DIR, file)).href);

    if (typeof mod.up !== 'function') {
      throw new Error(`Seeder ${file} does not export an up() function.`);
    }

    const transaction = await sequelize.transaction();
    try {
      await mod.up(sequelize.getQueryInterface(), sequelize);
      await sequelize.query(
        `INSERT INTO \`${DATA_META_TABLE}\` (name) VALUES (:name)`,
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
    console.log('Database seeds are already up to date. No pending seeders.');
  } else {
    console.log(`\nSeeders complete. ${ranCount} new seeder(s) successfully applied.`);
  }

  return ranCount;
}

/**
 * Rollback the latest executed seeder inside a transaction
 * @returns {Promise<string|null>} Name of rolled back seeder, or null if none
 */
export async function seedDown() {
  await sequelize.authenticate();
  console.log('MySQL database connected.');

  await ensureDataMetaTable();
  const executedRows = await getExecutedSeeders();

  if (executedRows.length === 0) {
    console.log('No executed seeders found in database to revert.');
    return null;
  }

  const latest = executedRows[executedRows.length - 1];
  console.log(`  ⏪ Reverting seeder: ${latest.name}`);

  const filePath = path.join(SEEDERS_DIR, latest.name);
  const mod = await import(pathToFileURL(filePath).href);

  if (typeof mod.down !== 'function') {
    throw new Error(`Seeder ${latest.name} does not export a down() function for rollback.`);
  }

  const transaction = await sequelize.transaction();
  try {
    await mod.down(sequelize.getQueryInterface(), sequelize);
    await sequelize.query(
      `DELETE FROM \`${DATA_META_TABLE}\` WHERE name = :name`,
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
 * Print a formatted console table showing status of all seeders
 */
export async function printStatus() {
  const statusList = await getSeederStatus();
  console.log('\n================ DATABASE SEEDERS STATUS ================');
  console.log('| Status   | Seeder File                        | Executed At         |');
  console.log('|----------|------------------------------------|---------------------|');
  for (const item of statusList) {
    const statusText = item.applied ? 'APPLIED ' : 'PENDING ';
    const dateText = item.executedAt
      ? new Date(item.executedAt).toISOString().replace('T', ' ').slice(0, 19)
      : '                   ';
    console.log(`| ${statusText} | ${item.name.padEnd(34)} | ${dateText} |`);
  }
  console.log('=========================================================\n');
}

// CLI execution handler
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const args = process.argv.slice(2);
  const isUndo = args.includes('--undo') || args.includes('down');
  const isStatus = args.includes('--status') || args.includes('status');

  (async () => {
    try {
      if (isStatus) {
        await printStatus();
      } else if (isUndo) {
        await seedDown();
      } else {
        await seedUp();
      }
      await sequelize.close();
      process.exit(0);
    } catch (err) {
      console.error('\nSeeder command failed:', err.message);
      try {
        await sequelize.close();
      } catch (_) {}
      process.exit(1);
    }
  })();
}
