/**
 * 004 — bulk_factory_employees
 * Seeds 220 factory employees for Fu Sheng Vietnam across 8 departments.
 */

import bcrypt from 'bcryptjs';
import { buildEmployees } from './seed.bulk-employees.js';

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(_qi, sequelize) {
  const [departments] = await sequelize.query('SELECT id, code FROM `departments`');
  const deptMap = new Map(departments.map((d) => [d.code, d.id]));

  const [existing] = await sequelize.query('SELECT employee_code FROM `users`');
  const existingCodes = new Set(existing.map((u) => u.employee_code));

  const employees = buildEmployees();
  const hashed = await bcrypt.hash('Employee@123', 10);
  const now = new Date();

  for (const emp of employees) {
    if (!existingCodes.has(emp.employee_code)) {
      const deptId = deptMap.get(emp.department_code) || null;
      await sequelize.query(`
        INSERT INTO \`users\` (
          employee_code, full_name, email, password, role, position,
          phone, hire_date, status, must_change_password, department_id,
          created_at, updated_at
        ) VALUES (
          :employee_code, :full_name, :email, :password, :role, :position,
          :phone, :hire_date, :status, 1, :department_id,
          :now, :now
        )
      `, {
        replacements: {
          employee_code: emp.employee_code,
          full_name: emp.full_name,
          email: emp.email,
          password: hashed,
          role: emp.role,
          position: emp.position,
          phone: emp.phone,
          hire_date: emp.hire_date,
          status: emp.status,
          department_id: deptId,
          now
        }
      });
      existingCodes.add(emp.employee_code);
    }
  }
}

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(_qi, sequelize) {
  // Revert bulk employees while preserving core test/demo accounts
  await sequelize.query(`
    DELETE FROM \`users\`
    WHERE \`employee_code\` LIKE 'FSV-%'
      AND \`email\` NOT IN (
        'admin@fusheng.com.vn',
        'manager@fusheng.com.vn',
        'employee@fusheng.com.vn',
        'anh.pham@fusheng.com.vn',
        'chau.vo@fusheng.com.vn'
      )
  `);
}
