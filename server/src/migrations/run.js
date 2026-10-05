/**
 * Migration runner — replaces sequelize.sync({ alter: true }).
 *
 * Usage:
 *   npm run migrate          — run all pending migrations in order
 *   npm run migrate -- --undo  — NOT implemented; use SQL restore / manual rollback
 *
 * Migration files live in server/src/migrations/ and are executed in filename order
 * (001_, 002_, ...). A `sequelize_meta` table tracks which have run.
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

const MIGRATIONS_DIR = __dirname;
const META_TABLE = 'sequelize_meta';

async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`${META_TABLE}\` (
      \`name\` VARCHAR(255) NOT NULL,
      \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getExecutedMigrations() {
  const rows = await sequelize.query(
    `SELECT name FROM \`${META_TABLE}\` ORDER BY executed_at ASC`,
    { type: QueryTypes.SELECT }
  );
  return new Set(rows.map((r) => r.name));
}

async function run() {
  await sequelize.authenticate();
  console.log('Connected to database.');

  await ensureMetaTable();
  const executed = await getExecutedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.match(/^\d{3}_.*\.js$/) && !f.startsWith('run'))
    .sort();

  let ranCount = 0;

  for (const file of files) {
    if (executed.has(file)) {
      console.log(`  ⏭  Skip (already ran): ${file}`);
      continue;
    }

    console.log(`  ▶  Running migration: ${file}`);
    const mod = await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href);

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
      process.exit(1);
    }
  }

  console.log(`\nMigrations complete. ${ranCount} new migration(s) applied.`);
  await sequelize.close();
}

run().catch((err) => {
  console.error('Migration runner crashed:', err);
  process.exit(1);
});
