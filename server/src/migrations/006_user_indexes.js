/**
 * 006 — Add explicit indexes on users(email) and users(employee_code)
 *       Optimizes frequent lookups during authentication, session verification, and employee search.
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} _sequelize
 */
export async function up(qi, _sequelize) {
  try {
    await qi.addIndex('users', ['email'], {
      name: 'idx_users_email'
    });
  } catch (err) {
    // Ignore if index already exists
    if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
      throw err;
    }
  }

  try {
    await qi.addIndex('users', ['employee_code'], {
      name: 'idx_users_employee_code'
    });
  } catch (err) {
    // Ignore if index already exists
    if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
      throw err;
    }
  }
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} _sequelize
 */
export async function down(qi, _sequelize) {
  try {
    await qi.removeIndex('users', 'idx_users_email');
  } catch (_err) {
    // Ignore if already dropped
  }

  try {
    await qi.removeIndex('users', 'idx_users_employee_code');
  } catch (_err) {
    // Ignore if already dropped
  }
}
