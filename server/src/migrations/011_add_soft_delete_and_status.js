/**
 * 011 — Add Soft Delete (deleted_at) and Status columns for business history retention
 *
 * Implements enterprise data retention and audit compliance for core business entities:
 * 1. departments:
 *    - ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_departments_status
 *    - ADD INDEX idx_departments_deleted_at
 * 2. announcements:
 *    - ADD COLUMN status ENUM('published', 'archived') NOT NULL DEFAULT 'published'
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_announcements_status
 *    - ADD INDEX idx_announcements_deleted_at
 * 3. users:
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_users_deleted_at
 * 4. leave_requests:
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_leaves_deleted_at
 * 5. holidays:
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_holidays_deleted_at
 * 6. leave_balances:
 *    - ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
 *    - ADD INDEX idx_leave_balances_deleted_at
 */

/**
 * Safely execute a raw query, ignoring duplicate column or index errors
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string} sql
 */
async function safeQuery(sequelize, sql) {
  try {
    await sequelize.query(sql);
  } catch (err) {
    const msg = err.message || '';
    if (
      !msg.includes('Duplicate column') &&
      !msg.includes('Duplicate key name') &&
      !msg.includes('already exists') &&
      !msg.includes("Can't DROP") &&
      !msg.includes("check that column/key exists")
    ) {
      throw err;
    }
  }
}

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  const { sequelize } = qi;

  // 1. departments: status & deleted_at
  await safeQuery(
    sequelize,
    `ALTER TABLE \`departments\`
       ADD COLUMN \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
         COMMENT 'Trang thai phong ban: active (hoat dong), inactive (ngung hoat dong)'
         AFTER \`manager_name\`;`
  );
  await safeQuery(
    sequelize,
    `ALTER TABLE \`departments\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem phong ban (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_departments_status\` ON \`departments\` (\`status\`);`);
  await safeQuery(sequelize, `CREATE INDEX \`idx_departments_deleted_at\` ON \`departments\` (\`deleted_at\`);`);

  // 2. announcements: status & deleted_at
  await safeQuery(
    sequelize,
    `ALTER TABLE \`announcements\`
       ADD COLUMN \`status\` ENUM('published', 'archived') NOT NULL DEFAULT 'published'
         COMMENT 'Trang thai thong bao: published (hien thi), archived (luu tru)'
         AFTER \`priority\`;`
  );
  await safeQuery(
    sequelize,
    `ALTER TABLE \`announcements\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem thong bao (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_announcements_status\` ON \`announcements\` (\`status\`);`);
  await safeQuery(sequelize, `CREATE INDEX \`idx_announcements_deleted_at\` ON \`announcements\` (\`deleted_at\`);`);

  // 3. users: deleted_at (status already exists: 'active' | 'inactive')
  await safeQuery(
    sequelize,
    `ALTER TABLE \`users\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem ho so nguoi dung (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_users_deleted_at\` ON \`users\` (\`deleted_at\`);`);

  // 4. leave_requests: deleted_at (status already exists: 'pending' | 'approved' | 'rejected' | 'cancelled')
  await safeQuery(
    sequelize,
    `ALTER TABLE \`leave_requests\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem don nghi phep/OT (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_leaves_deleted_at\` ON \`leave_requests\` (\`deleted_at\`);`);

  // 5. holidays: deleted_at
  await safeQuery(
    sequelize,
    `ALTER TABLE \`holidays\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem ngay le (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_holidays_deleted_at\` ON \`holidays\` (\`deleted_at\`);`);

  // 6. leave_balances: deleted_at
  await safeQuery(
    sequelize,
    `ALTER TABLE \`leave_balances\`
       ADD COLUMN \`deleted_at\` DATETIME DEFAULT NULL
         COMMENT 'Thoi diem xoa mem han muc phep (NULL neu con ton tai)'
         AFTER \`updated_at\`;`
  );
  await safeQuery(sequelize, `CREATE INDEX \`idx_leave_balances_deleted_at\` ON \`leave_balances\` (\`deleted_at\`);`);
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  const { sequelize } = qi;

  // 6. leave_balances
  await safeQuery(sequelize, `DROP INDEX \`idx_leave_balances_deleted_at\` ON \`leave_balances\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`leave_balances\` DROP COLUMN \`deleted_at\`;`);

  // 5. holidays
  await safeQuery(sequelize, `DROP INDEX \`idx_holidays_deleted_at\` ON \`holidays\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`holidays\` DROP COLUMN \`deleted_at\`;`);

  // 4. leave_requests
  await safeQuery(sequelize, `DROP INDEX \`idx_leaves_deleted_at\` ON \`leave_requests\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`leave_requests\` DROP COLUMN \`deleted_at\`;`);

  // 3. users
  await safeQuery(sequelize, `DROP INDEX \`idx_users_deleted_at\` ON \`users\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`users\` DROP COLUMN \`deleted_at\`;`);

  // 2. announcements
  await safeQuery(sequelize, `DROP INDEX \`idx_announcements_deleted_at\` ON \`announcements\`;`);
  await safeQuery(sequelize, `DROP INDEX \`idx_announcements_status\` ON \`announcements\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`announcements\` DROP COLUMN \`deleted_at\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`announcements\` DROP COLUMN \`status\`;`);

  // 1. departments
  await safeQuery(sequelize, `DROP INDEX \`idx_departments_deleted_at\` ON \`departments\`;`);
  await safeQuery(sequelize, `DROP INDEX \`idx_departments_status\` ON \`departments\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`departments\` DROP COLUMN \`deleted_at\`;`);
  await safeQuery(sequelize, `ALTER TABLE \`departments\` DROP COLUMN \`status\`;`);
}

