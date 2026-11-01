/**
 * 008 — Add composite index on announcements(priority, created_at)
 *       Optimizes announcement listing and filtering queries ordered by created_at DESC.
 */

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} _sequelize
 */
export async function up(qi, _sequelize) {
  try {
    await qi.addIndex('announcements', ['priority', 'created_at'], {
      name: 'idx_announcements_priority_created_at'
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
    await qi.removeIndex('announcements', 'idx_announcements_priority_created_at');
  } catch (_err) {
    // Ignore if already dropped
  }
}

