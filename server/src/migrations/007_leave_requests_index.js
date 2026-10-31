/**
 * 007 — Add composite index on leave_requests(user_id, status, start_date)
 *       Optimizes employee leave history queries, filtering by status and date range.
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} _sequelize
 */
export async function up(qi, _sequelize) {
  try {
    await qi.addIndex('leave_requests', ['user_id', 'status', 'start_date'], {
      name: 'idx_leaves_user_status_start_date'
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
    await qi.removeIndex('leave_requests', 'idx_leaves_user_status_start_date');
  } catch (_err) {
    // Ignore if already dropped
  }
}

