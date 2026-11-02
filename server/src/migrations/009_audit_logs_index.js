/**
 * 009 — Add composite index on audit_logs(user_id, action, created_at)
 *       Optimizes forensic querying, user activity tracing, and security audits
 *       filtered by user and action, sorted by created_at DESC.
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} _sequelize
 */
export async function up(qi, _sequelize) {
  try {
    await qi.addIndex('audit_logs', ['user_id', 'action', 'created_at'], {
      name: 'idx_audit_logs_user_action_created_at'
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
    await qi.removeIndex('audit_logs', 'idx_audit_logs_user_action_created_at');
  } catch (_err) {
    // Ignore if already dropped
  }
}

