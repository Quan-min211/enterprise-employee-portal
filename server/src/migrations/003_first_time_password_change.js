/**
 * 003 — Add must_change_password column to users table
 *       Enforces first-time password change for admin-created accounts
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  await qi.sequelize.query(`
    ALTER TABLE \`users\`
      ADD COLUMN IF NOT EXISTS \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Bat buoc doi mat khau lan dau cho tai khoan do admin tao'
        AFTER \`status\`;
  `);
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  await qi.sequelize.query(`
    ALTER TABLE \`users\`
      DROP COLUMN IF EXISTS \`must_change_password\`;
  `);
}
