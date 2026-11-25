/**
 * 012 — Add token_version column to users for server-side JWT revocation (SEC-04)
 *
 * Enables immediate invalidation of active JWTs upon:
 * - User logout
 * - Account deactivation (status = 'inactive')
 * - Role change or admin password reset
 * - User password change
 */

async function safeQuery(sequelize, sql) {
  try {
    await sequelize.query(sql);
  } catch (err) {
    const msg = err.message || '';
    if (!msg.includes('Duplicate column') && !msg.includes("Can't DROP") && !msg.includes('check that column')) {
      throw err;
    }
  }
}

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  const { sequelize } = qi;

  await safeQuery(
    sequelize,
    `ALTER TABLE \`users\`
       ADD COLUMN \`token_version\` INT NOT NULL DEFAULT 0
         COMMENT 'Phien ban JWT hien tai cua nguoi dung, tang len de thu hoi token cu'
         AFTER \`locked_until\`;`
  );
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  const { sequelize } = qi;

  await safeQuery(
    sequelize,
    'ALTER TABLE `users` DROP COLUMN `token_version`;'
  );
}
