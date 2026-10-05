/**
 * 002 — HR domain: leave_balances, holidays, leave_approval_logs
 *       + alter leave_requests: add 'cancelled' status, add ot_hours
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  // 1. Add `cancelled` to leave_requests.status ENUM
  await qi.sequelize.query(`
    ALTER TABLE \`leave_requests\`
      MODIFY COLUMN \`status\`
        ENUM('pending','approved','rejected','cancelled')
        NOT NULL DEFAULT 'pending';
  `);

  // 2. Add ot_hours for overtime precision (nullable, only relevant for OT requests)
  await qi.sequelize.query(`
    ALTER TABLE \`leave_requests\`
      ADD COLUMN IF NOT EXISTS \`ot_hours\` DECIMAL(5,2) DEFAULT NULL
        COMMENT 'So gio lam them, chi dung cho don OT (request_type=overtime)'
        AFTER \`day_count\`;
  `);

  // 3. leave_balances — so ngay phep theo nam
  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`leave_balances\` (
      \`id\`                  INT           NOT NULL AUTO_INCREMENT,
      \`user_id\`             INT           NOT NULL,
      \`year\`                YEAR          NOT NULL,
      \`annual_entitlement\`  DECIMAL(5,2)  NOT NULL DEFAULT 12,
      \`used_days\`           DECIMAL(5,2)  NOT NULL DEFAULT 0,
      \`remaining_days\`      DECIMAL(5,2)  NOT NULL DEFAULT 12,
      \`carried_over_days\`   DECIMAL(5,2)  NOT NULL DEFAULT 0,
      \`created_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_leave_balance_user_year\` (\`user_id\`, \`year\`),
      CONSTRAINT \`fk_leave_balances_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. holidays — ngay le / nghi cong ty
  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`holidays\` (
      \`id\`          INT         NOT NULL AUTO_INCREMENT,
      \`date\`        DATE        NOT NULL,
      \`name\`        VARCHAR(100) NOT NULL,
      \`type\`        ENUM('national','company','maintenance') NOT NULL DEFAULT 'national',
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_holiday_date\` (\`date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. leave_approval_logs — lich su duyet don
  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`leave_approval_logs\` (
      \`id\`                INT         NOT NULL AUTO_INCREMENT,
      \`leave_request_id\`  INT         NOT NULL,
      \`actor_id\`          INT,
      \`from_status\`       ENUM('pending','approved','rejected','cancelled') NOT NULL,
      \`to_status\`         ENUM('pending','approved','rejected','cancelled') NOT NULL,
      \`comment\`           TEXT,
      \`created_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_approval_log_leave_id\` (\`leave_request_id\`),
      CONSTRAINT \`fk_approval_log_leave\`
        FOREIGN KEY (\`leave_request_id\`) REFERENCES \`leave_requests\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_approval_log_actor\`
        FOREIGN KEY (\`actor_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. departments: add manager_id FK
  await qi.sequelize.query(`
    ALTER TABLE \`departments\`
      ADD COLUMN IF NOT EXISTS \`manager_id\` INT DEFAULT NULL
        COMMENT 'User ID cua quan ly phong ban'
        AFTER \`manager_name\`,
      ADD CONSTRAINT \`fk_departments_manager\`
        FOREIGN KEY (\`manager_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE;
  `).catch(() => {
    // FK may already exist if re-running; ignore
  });
}

export async function down(qi) {
  await qi.sequelize.query('ALTER TABLE `departments` DROP FOREIGN KEY IF EXISTS `fk_departments_manager`;');
  await qi.sequelize.query('ALTER TABLE `departments` DROP COLUMN IF EXISTS `manager_id`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `leave_approval_logs`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `holidays`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `leave_balances`;');
  await qi.sequelize.query('ALTER TABLE `leave_requests` DROP COLUMN IF EXISTS `ot_hours`;');
  await qi.sequelize.query(`
    ALTER TABLE \`leave_requests\`
      MODIFY COLUMN \`status\`
        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';
  `);
}
