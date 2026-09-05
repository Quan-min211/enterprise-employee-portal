import bcrypt from 'bcryptjs';
import { Announcement, Department, User } from '../models/index.js';

const departments = [
  { code: 'IT', name: 'Phong Cong nghe Thong tin', manager_name: 'Nguyen Minh Quan', description: 'Van hanh ha tang, ung dung noi bo va bao mat thong tin.' },
  { code: 'HR', name: 'Phong Hanh chinh Nhan su', manager_name: 'Tran Thi Thu Ha', description: 'Quan ly nhan su, phuc loi, noi quy va truyen thong noi bo.' },
  { code: 'PROD', name: 'Khoi San xuat', manager_name: 'Le Van Binh', description: 'Lap rap, kiem tra va van hanh day chuyen san xuat.' },
  { code: 'ENG', name: 'Phong Ky thuat R&D', manager_name: 'Pham Quoc Viet', description: 'Cai tien thiet bi, ho tro ky thuat va nghien cuu san pham.' },
  { code: 'SALES', name: 'Phong Kinh doanh', manager_name: 'Vo Thanh Nam', description: 'Cham soc khach hang, don hang va phat trien thi truong.' }
];

const users = [
  { employee_code: 'FSV-ADM-001', full_name: 'Nguyen Minh Quan', email: 'admin@fusheng.com.vn', password: 'Admin@123', role: 'admin', position: 'IT Administrator', phone: '0251 3999 001', department_code: 'IT', hire_date: '2021-03-15' },
  { employee_code: 'FSV-HR-011', full_name: 'Tran Thi Thu Ha', email: 'manager@fusheng.com.vn', password: 'Manager@123', role: 'manager', position: 'HR Manager', phone: '0251 3999 102', department_code: 'HR', hire_date: '2020-07-01' },
  { employee_code: 'FSV-PROD-128', full_name: 'Le Hoang Phuc', email: 'employee@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Nhan vien lap rap', phone: '0251 3999 228', department_code: 'PROD', hire_date: '2023-09-12' },
  { employee_code: 'FSV-ENG-045', full_name: 'Pham Ngoc Anh', email: 'anh.pham@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Ky su bao tri', phone: '0251 3999 345', department_code: 'ENG', hire_date: '2022-05-20' },
  { employee_code: 'FSV-SAL-020', full_name: 'Vo Minh Chau', email: 'chau.vo@fusheng.com.vn', password: 'Employee@123', role: 'employee', position: 'Chuyen vien kinh doanh', phone: '0251 3999 420', department_code: 'SALES', hire_date: '2024-01-08' }
];

const announcements = [
  { title: 'Bao tri he thong dien xuong san xuat so 2', content: 'Phong Ky thuat se bao tri tu 13:00 den 15:00 ngay thu Bay. Cac bo phan lien quan vui long sap xep ke hoach van hanh.', priority: 'urgent', author_email: 'manager@fusheng.com.vn' },
  { title: 'Cap nhat quy trinh dang ky nghi phep truc tuyen', content: 'Tu thang nay, nhan vien nop don nghi phep tren cong noi bo de quan ly phe duyet nhanh va co lich su ro rang.', priority: 'important', author_email: 'manager@fusheng.com.vn' },
  { title: 'Thong bao lich dao tao an toan lao dong', content: 'Khoa dao tao dinh ky se dien ra tai hoi truong tang 2. Vui long tham du dung ca lam viec da duoc thong bao.', priority: 'normal', author_email: 'admin@fusheng.com.vn' }
];

export const seedDatabase = async () => {
  const departmentMap = new Map();

  for (const departmentData of departments) {
    const [department] = await Department.findOrCreate({
      where: { code: departmentData.code },
      defaults: departmentData
    });
    departmentMap.set(department.code, department);
  }

  for (const userData of users) {
    const department = departmentMap.get(userData.department_code);
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    await User.findOrCreate({
      where: { email: userData.email },
      defaults: {
        employee_code: userData.employee_code,
        full_name: userData.full_name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        position: userData.position,
        phone: userData.phone,
        hire_date: userData.hire_date,
        department_id: department?.id,
        status: 'active'
      }
    });
  }

  for (const announcementData of announcements) {
    const author = await User.findOne({ where: { email: announcementData.author_email } });

    await Announcement.findOrCreate({
      where: { title: announcementData.title },
      defaults: {
        title: announcementData.title,
        content: announcementData.content,
        priority: announcementData.priority,
        author_id: author?.id
      }
    });
  }
};
