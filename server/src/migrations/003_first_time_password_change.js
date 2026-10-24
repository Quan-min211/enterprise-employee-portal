/**
 * 003 — Add must_change_password column to users table
 *       Enforces first-time password change for admin-created accounts
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  try {
    await qi.sequelize.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 0
          COMMENT 'Bat buoc doi mat khau lan dau cho tai khoan do admin tao'
          AFTER \`status\`;
    `);
  } catch (err) {
    if (!err.message.includes('Duplicate column')) throw err;
  }
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  try {
    await qi.sequelize.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`must_change_password\`;
    `);
  } catch (_err) {
    // Ignore if column was already dropped
  }
}
