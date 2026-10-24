/**
 * 004 — Add account lockout columns to users table
 *       Enforces temporary lockout by user/email after consecutive failed login attempts
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  try {
    await qi.sequelize.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`failed_login_attempts\` INT NOT NULL DEFAULT 0
          COMMENT 'So lan dang nhap sai lien tiep'
          AFTER \`must_change_password\`;
    `);
  } catch (err) {
    if (!err.message.includes('Duplicate column')) throw err;
  }

  try {
    await qi.sequelize.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`locked_until\` DATETIME DEFAULT NULL
          COMMENT 'Thoi gian tai khoan bi khoa tam thoi den'
          AFTER \`failed_login_attempts\`;
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
        DROP COLUMN \`locked_until\`,
        DROP COLUMN \`failed_login_attempts\`;
    `);
  } catch (_err) {
    // Ignore if columns were already dropped
  }
}
