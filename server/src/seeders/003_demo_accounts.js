/**
 * 003 — demo_accounts
 * Seeds initial demo accounts and announcements for development & testing.
 */

import bcrypt from 'bcryptjs';

const DEMO_USERS = [
  { employee_code: 'FSV-ADM-001', full_name: 'Nguyễn Minh Quân', email: 'admin@fusheng.com.vn', password: 'Admin@123', role: 'admin', position: 'IT Administrator', phone: '0251 3999 001', department_code: 'IT', hire_date: '2021-03-15' },
  { employee_code: 'FSV-HR-011', full_name: 'Trần Thị Thu Hà', email: 'manager@fusheng.com.vn', password: 'Manager@123', role: 'manager', position: 'HR Manager', phone: '0251 3999 102', department_code: 'HR', hire_date: '2020-07-01' },
  { employee_code: 'FSV-PROD-128', full_name: 'Lê Hoàng Phúc', email: 'employee@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Nhân viên lắp ráp', phone: '0251 3999 228', department_code: 'PROD', hire_date: '2023-09-12' },
  { employee_code: 'FSV-ENG-045', full_name: 'Phạm Ngọc Anh', email: 'anh.pham@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Kỹ sư bảo trì', phone: '0251 3999 345', department_code: 'ENG', hire_date: '2022-05-20' },
  { employee_code: 'FSV-SAL-020', full_name: 'Võ Minh Châu', email: 'chau.vo@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Chuyên viên kinh doanh', phone: '0251 3999 420', department_code: 'SALES', hire_date: '2024-01-08' }
];

const ANNOUNCEMENTS = [
  { title: 'Bảo trì hệ thống điện xưởng sản xuất số 2', content: 'Phòng Kỹ thuật sẽ bảo trì từ 13:00 đến 15:00 ngày thứ Bảy. Các bộ phận liên quan vui lòng sắp xếp kế hoạch vận hành.', priority: 'urgent', author_email: 'manager@fusheng.com.vn' },
  { title: 'Cập nhật quy trình đăng ký nghỉ phép trực tuyến', content: 'Từ tháng này, nhân viên nộp đơn nghỉ phép trên cổng nội bộ để quản lý phê duyệt nhanh và có lịch sử rõ ràng.', priority: 'important', author_email: 'manager@fusheng.com.vn' },
  { title: 'Thông báo lịch đào tạo an toàn lao động', content: 'Khóa đào tạo định kỳ sẽ diễn ra tại hội trường tầng 2. Vui lòng tham dự đúng ca làm việc đã được thông báo.', priority: 'normal', author_email: 'admin@fusheng.com.vn' }
];

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(_qi, sequelize) {
  // Fetch department map
  const [depts] = await sequelize.query('SELECT id, code FROM `departments`');
  const deptMap = new Map(depts.map((d) => [d.code, d.id]));

  const [existingUsers] = await sequelize.query('SELECT id, email FROM `users`');
  const userMap = new Map(existingUsers.map((u) => [u.email, u.id]));

  const now = new Date();

  for (const u of DEMO_USERS) {
    if (!userMap.has(u.email)) {
      const hashed = await bcrypt.hash(u.password, 10);
      const deptId = deptMap.get(u.department_code) || null;

      await sequelize.query(`
        INSERT INTO \`users\` (employee_code, full_name, email, password, role, position, phone, hire_date, status, must_change_password, department_id, created_at, updated_at)
        VALUES (:employee_code, :full_name, :email, :password, :role, :position, :phone, :hire_date, 'active', 0, :department_id, :now, :now)
      `, {
        replacements: {
          employee_code: u.employee_code,
          full_name: u.full_name,
          email: u.email,
          password: hashed,
          role: u.role,
          position: u.position,
          phone: u.phone,
          hire_date: u.hire_date,
          department_id: deptId,
          now
        }
      });

      const [inserted] = await sequelize.query('SELECT id FROM `users` WHERE email = :email', {
        replacements: { email: u.email }
      });
      if (inserted.length > 0) {
        userMap.set(u.email, inserted[0].id);
      }
    }
  }

  // Insert announcements
  const [existingAnn] = await sequelize.query('SELECT title FROM `announcements`');
  const existingTitles = new Set(existingAnn.map((a) => a.title));

  for (const ann of ANNOUNCEMENTS) {
    if (!existingTitles.has(ann.title)) {
      const authorId = userMap.get(ann.author_email) || null;
      await sequelize.query(`
        INSERT INTO \`announcements\` (title, content, priority, author_id, created_at, updated_at)
        VALUES (:title, :content, :priority, :author_id, :now, :now)
      `, {
        replacements: {
          title: ann.title,
          content: ann.content,
          priority: ann.priority,
          author_id: authorId,
          now
        }
      });
    }
  }
}

/**
 * @param {import('sequelize').QueryInterface} _qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(_qi, sequelize) {
  const emails = DEMO_USERS.map((u) => u.email);
  const titles = ANNOUNCEMENTS.map((a) => a.title);

  await sequelize.query(
    'DELETE FROM `announcements` WHERE title IN (:titles)',
    { replacements: { titles } }
  );

  await sequelize.query(
    'DELETE FROM `users` WHERE email IN (:emails)',
    { replacements: { emails } }
  );
}
