/**
 * 004 — Add account lockout columns to users table
 *       Enforces temporary lockout by user/email after consecutive failed login attempts
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  await qi.sequelize.query(`
    ALTER TABLE \`users\`
      ADD COLUMN IF NOT EXISTS \`failed_login_attempts\` INT NOT NULL DEFAULT 0
        COMMENT 'So lan dang nhap sai lien tiep'
        AFTER \`must_change_password\`,
      ADD COLUMN IF NOT EXISTS \`locked_until\` DATETIME DEFAULT NULL
        COMMENT 'Thoi gian tai khoan bi khoa tam thoi den'
        AFTER \`failed_login_attempts\`;
  `);
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  await qi.sequelize.query(`
    ALTER TABLE \`users\`
      DROP COLUMN IF EXISTS \`locked_until\`,
      DROP COLUMN IF EXISTS \`failed_login_attempts\`;
  `);
}
