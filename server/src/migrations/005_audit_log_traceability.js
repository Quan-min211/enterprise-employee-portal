/**
 * 005 — Add traceability columns to audit_logs table
 *       Stores client IP address, User-Agent, and correlation Request ID
 */

/** @param {import('sequelize').QueryInterface} qi */
export async function up(qi) {
  await qi.sequelize.query(`
    ALTER TABLE \`audit_logs\`
      ADD COLUMN IF NOT EXISTS \`ip_address\` VARCHAR(45) DEFAULT NULL
        COMMENT 'Dia chi IP cua client (IPv4/IPv6)'
        AFTER \`details\`,
      ADD COLUMN IF NOT EXISTS \`user_agent\` VARCHAR(500) DEFAULT NULL
        COMMENT 'Chuoi User-Agent trinh duyet/client'
        AFTER \`ip_address\`,
      ADD COLUMN IF NOT EXISTS \`request_id\` VARCHAR(64) DEFAULT NULL
        COMMENT 'UUID / Correlation ID cua request'
        AFTER \`user_agent\`;
  `);

  try {
    await qi.addIndex('audit_logs', ['request_id'], { name: 'idx_auditlog_request_id' });
  } catch (err) {
    // Index may already exist if sync created it
  }

  try {
    await qi.addIndex('audit_logs', ['ip_address'], { name: 'idx_auditlog_ip' });
  } catch (err) {
    // Index may already exist if sync created it
  }
}

/** @param {import('sequelize').QueryInterface} qi */
export async function down(qi) {
  try {
    await qi.removeIndex('audit_logs', 'idx_auditlog_ip');
  } catch (err) {}

  try {
    await qi.removeIndex('audit_logs', 'idx_auditlog_request_id');
  } catch (err) {}

  await qi.sequelize.query(`
    ALTER TABLE \`audit_logs\`
      DROP COLUMN IF EXISTS \`request_id\`,
      DROP COLUMN IF EXISTS \`user_agent\`,
      DROP COLUMN IF EXISTS \`ip_address\`;
  `);
}
