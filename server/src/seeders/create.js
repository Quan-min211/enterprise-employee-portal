/**
 * Seeder Generator CLI
 * Scaffolds a new seeder file with sequential 3-digit prefix and standard up/down signatures.
 *
 * Usage:
 *   npm run seed:create <seeder_name>
 *   node src/seeders/create.js <seeder_name>
 *
 * Example:
 *   npm run seed:create custom_permissions
 */

import path from 'path';
import { readdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createSeeder() {
  const rawName = process.argv[2];

  if (!rawName) {
    console.error('\n❌ Error: Please provide a seeder name.');
    console.error('Usage:   npm run seed:create <seeder_name>');
    console.error('Example: npm run seed:create custom_permissions\n');
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
    console.error('\n❌ Error: Seeder name contains no valid alphanumeric characters.\n');
    process.exit(1);
  }

  const files = await readdir(__dirname);
  const seederFiles = files.filter((f) => f.match(/^\d{3}_.*\.js$/)).sort();

  let nextNumber = 1;
  if (seederFiles.length > 0) {
    const lastFile = seederFiles[seederFiles.length - 1];
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
  // TODO: Add seed data insertion
  // Example:
  // await qi.bulkInsert('table_name', [
  //   { field: 'value', created_at: new Date(), updated_at: new Date() }
  // ], {});
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  // TODO: Revert seed data insertion
  // Example:
  // await qi.bulkDelete('table_name', { field: 'value' }, {});
}
`;

  await writeFile(filePath, content, 'utf8');
  console.log(`\n✅ Seeder created successfully:`);
  console.log(`   File: ${fileName}`);
  console.log(`   Path: ${filePath}\n`);
}

createSeeder().catch((err) => {
  console.error('\n❌ Failed to create seeder:', err.message);
  process.exit(1);
});
