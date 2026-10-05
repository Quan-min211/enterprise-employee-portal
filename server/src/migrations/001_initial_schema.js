/**
 * 001 — Initial schema: departments, users, leave_requests, announcements, audit_logs
 *
 * Replaces the old sequelize.sync({ alter: true }) approach.
 * Idempotent: uses CREATE TABLE IF NOT EXISTS.
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`departments\` (
      \`id\`           INT           NOT NULL AUTO_INCREMENT,
      \`code\`         VARCHAR(20)   NOT NULL,
      \`name\`         VARCHAR(100)  NOT NULL,
      \`description\`  TEXT,
      \`manager_name\` VARCHAR(100),
      \`created_at\`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_departments_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\`              INT           NOT NULL AUTO_INCREMENT,
      \`employee_code\`   VARCHAR(20)   NOT NULL,
      \`full_name\`       VARCHAR(100)  NOT NULL,
      \`email\`           VARCHAR(100)  NOT NULL,
      \`password\`        VARCHAR(255)  NOT NULL,
      \`role\`            ENUM('admin','manager','employee') NOT NULL DEFAULT 'employee',
      \`position\`        VARCHAR(100),
      \`phone\`           VARCHAR(20),
      \`avatar_url\`      VARCHAR(255),
      \`hire_date\`       DATE,
      \`status\`          ENUM('active','inactive') NOT NULL DEFAULT 'active',
      \`department_id\`   INT,
      \`created_at\`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_users_email\` (\`email\`),
      UNIQUE KEY \`uq_users_employee_code\` (\`employee_code\`),
      KEY \`idx_users_dept_status\` (\`department_id\`, \`status\`),
      KEY \`idx_users_role\` (\`role\`),
      KEY \`idx_users_status\` (\`status\`),
      CONSTRAINT \`fk_users_department\`
        FOREIGN KEY (\`department_id\`) REFERENCES \`departments\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`leave_requests\` (
      \`id\`               INT            NOT NULL AUTO_INCREMENT,
      \`user_id\`          INT            NOT NULL,
      \`approver_id\`      INT,
      \`request_type\`     ENUM('leave','overtime') NOT NULL DEFAULT 'leave',
      \`leave_type\`       ENUM('annual','sick','unpaid','overtime','other') NOT NULL DEFAULT 'annual',
      \`start_date\`       DATE           NOT NULL,
      \`end_date\`         DATE           NOT NULL,
      \`reason\`           TEXT           NOT NULL,
      \`day_count\`        DECIMAL(5,2)   NOT NULL DEFAULT 1,
      \`status\`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      \`manager_comment\`  TEXT,
      \`created_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_leaves_user_status\` (\`user_id\`, \`status\`),
      KEY \`idx_leaves_start_date\` (\`start_date\`),
      KEY \`idx_leaves_status\` (\`status\`),
      CONSTRAINT \`fk_leaves_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_leaves_approver\`
        FOREIGN KEY (\`approver_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`announcements\` (
      \`id\`          INT          NOT NULL AUTO_INCREMENT,
      \`title\`       VARCHAR(255) NOT NULL,
      \`content\`     TEXT         NOT NULL,
      \`priority\`    ENUM('normal','important','urgent') NOT NULL DEFAULT 'normal',
      \`author_id\`   INT,
      \`expires_at\`  DATETIME,
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_announcements_priority\` (\`priority\`),
      CONSTRAINT \`fk_announcements_author\`
        FOREIGN KEY (\`author_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await qi.sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`audit_logs\` (
      \`id\`           INT         NOT NULL AUTO_INCREMENT,
      \`user_id\`      INT,
      \`action\`       VARCHAR(80) NOT NULL,
      \`entity_type\`  VARCHAR(80) NOT NULL,
      \`entity_id\`    INT,
      \`details\`      JSON,
      \`created_at\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_auditlog_action\` (\`action\`),
      KEY \`idx_auditlog_created_at\` (\`created_at\`),
      KEY \`idx_auditlog_user_id\` (\`user_id\`),
      CONSTRAINT \`fk_auditlog_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function down(qi) {
  await qi.sequelize.query('DROP TABLE IF EXISTS `audit_logs`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `announcements`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `leave_requests`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `users`;');
  await qi.sequelize.query('DROP TABLE IF EXISTS `departments`;');
}
