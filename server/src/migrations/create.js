/**
 * Migration Generator CLI
 * Scaffolds a new migration file with sequential 3-digit prefix and standard up/down signatures.
 *
 * Usage:
 *   npm run migrate:create <migration_name>
 *   node src/migrations/create.js <migration_name>
 *
 * Example:
 *   npm run migrate:create add_indexes_to_tables
 */

import path from 'path';
import { readdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createMigration() {
  const rawName = process.argv[2];

  if (!rawName) {
    console.error('\n❌ Error: Please provide a migration name.');
    console.error('Usage:   npm run migrate:create <migration_name>');
    console.error('Example: npm run migrate:create add_indexes_to_tables\n');
    process.exit(1);
  }

  // Format name to lowercase snake_case
  const sanitizedName = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!sanitizedName) {
    console.error('\n❌ Error: Migration name contains no valid alphanumeric characters.\n');
    process.exit(1);
  }

  const files = await readdir(__dirname);
  const migrationFiles = files.filter((f) => f.match(/^\d{3}_.*\.js$/)).sort();

  let nextNumber = 1;
  if (migrationFiles.length > 0) {
    const lastFile = migrationFiles[migrationFiles.length - 1];
    const match = lastFile.match(/^(\d{3})_/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const prefix = String(nextNumber).padStart(3, '0');
  const fileName = `${prefix}_${sanitizedName}.js`;
  const filePath = path.join(__dirname, fileName);

  const content = `/**
 * ${prefix} — ${sanitizedName}
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(qi, sequelize) {
  // TODO: Add schema changes
  // Example:
  // await qi.addColumn('users', 'new_column', {
  //   type: sequelize.Sequelize.STRING(100),
  //   allowNull: true
  // });
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  // TODO: Revert schema changes
  // Example:
  // await qi.removeColumn('users', 'new_column');
}
`;

  await writeFile(filePath, content, 'utf8');
  console.log(`\n✅ Migration created successfully:`);
  console.log(`   File: ${fileName}`);
  console.log(`   Path: ${filePath}\n`);
}

createMigration().catch((err) => {
  console.error('\n❌ Failed to create migration:', err.message);
  process.exit(1);
});
