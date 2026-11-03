/**
 * 010 — Standardize Foreign Key Constraints with explicit ON DELETE / ON UPDATE
 *
 * Enforces standardized naming and explicit referential integrity rules across all tables:
 * 1. fk_users_department:       users(department_id)                  -> departments(id)       [ON DELETE SET NULL ON UPDATE CASCADE]
 * 2. fk_departments_manager:   departments(manager_id)               -> users(id)             [ON DELETE SET NULL ON UPDATE CASCADE]
 * 3. fk_leaves_user:            leave_requests(user_id)               -> users(id)             [ON DELETE CASCADE  ON UPDATE CASCADE]
 * 4. fk_leaves_approver:        leave_requests(approver_id)           -> users(id)             [ON DELETE SET NULL ON UPDATE CASCADE]
 * 5. fk_leave_balances_user:    leave_balances(user_id)               -> users(id)             [ON DELETE CASCADE  ON UPDATE CASCADE]
 * 6. fk_approval_log_leave:     leave_approval_logs(leave_request_id) -> leave_requests(id)   [ON DELETE CASCADE  ON UPDATE CASCADE]
 * 7. fk_approval_log_actor:     leave_approval_logs(actor_id)         -> users(id)             [ON DELETE SET NULL ON UPDATE CASCADE]
 * 8. fk_announcements_author:   announcements(author_id)              -> users(id)             [ON DELETE SET NULL ON UPDATE CASCADE]
 * 9. fk_auditlog_user:          audit_logs(user_id)                   -> users(id)             [ON DELETE SET NULL ON UPDATE CASCADE]
 */

export const STANDARDIZED_FOREIGN_KEYS = [
  {
    table: 'users',
    name: 'fk_users_department',
    column: 'department_id',
    refTable: 'departments',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `users` SET `department_id` = NULL WHERE `department_id` IS NOT NULL AND `department_id` NOT IN (SELECT `id` FROM `departments`);'
  },
  {
    table: 'departments',
    name: 'fk_departments_manager',
    column: 'manager_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `departments` SET `manager_id` = NULL WHERE `manager_id` IS NOT NULL AND `manager_id` NOT IN (SELECT `id` FROM `users`);'
  },
  {
    table: 'leave_requests',
    name: 'fk_leaves_user',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: null
  },
  {
    table: 'leave_requests',
    name: 'fk_leaves_approver',
    column: 'approver_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `leave_requests` SET `approver_id` = NULL WHERE `approver_id` IS NOT NULL AND `approver_id` NOT IN (SELECT `id` FROM `users`);'
  },
  {
    table: 'leave_balances',
    name: 'fk_leave_balances_user',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: null
  },
  {
    table: 'leave_approval_logs',
    name: 'fk_approval_log_leave',
    column: 'leave_request_id',
    refTable: 'leave_requests',
    refColumn: 'id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: null
  },
  {
    table: 'leave_approval_logs',
    name: 'fk_approval_log_actor',
    column: 'actor_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `leave_approval_logs` SET `actor_id` = NULL WHERE `actor_id` IS NOT NULL AND `actor_id` NOT IN (SELECT `id` FROM `users`);'
  },
  {
    table: 'announcements',
    name: 'fk_announcements_author',
    column: 'author_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `announcements` SET `author_id` = NULL WHERE `author_id` IS NOT NULL AND `author_id` NOT IN (SELECT `id` FROM `users`);'
  },
  {
    table: 'audit_logs',
    name: 'fk_auditlog_user',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    cleanOrphansQuery: 'UPDATE `audit_logs` SET `user_id` = NULL WHERE `user_id` IS NOT NULL AND `user_id` NOT IN (SELECT `id` FROM `users`);'
  }
];

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(_qi, sequelize) {
  for (const fk of STANDARDIZED_FOREIGN_KEYS) {
    // 1. Sanitize any orphan records to prevent constraint violation errors
    if (fk.cleanOrphansQuery) {
      try {
        await sequelize.query(fk.cleanOrphansQuery);
      } catch (_err) {
        // Ignored if table or column does not exist
      }
    }

    // 2. Drop existing constraint if present so we can apply the standardized rules
    try {
      await sequelize.query(`ALTER TABLE \`${fk.table}\` DROP FOREIGN KEY \`${fk.name}\`;`);
    } catch (_err) {
      // Ignored if constraint does not exist
    }

    // 3. Add explicit standardized constraint
    try {
      await sequelize.query(`
        ALTER TABLE \`${fk.table}\`
          ADD CONSTRAINT \`${fk.name}\`
          FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.refTable}\` (\`${fk.refColumn}\`)
          ON DELETE ${fk.onDelete}
          ON UPDATE ${fk.onUpdate};
      `);
    } catch (err) {
      // Ignore if duplicate constraint already exists
      if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
        throw err;
      }
    }
  }
}

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(_qi, sequelize) {
  for (const fk of STANDARDIZED_FOREIGN_KEYS) {
    try {
      await sequelize.query(`ALTER TABLE \`${fk.table}\` DROP FOREIGN KEY \`${fk.name}\`;`);
    } catch (_err) {
      // Ignored if constraint does not exist
    }
  }
}

