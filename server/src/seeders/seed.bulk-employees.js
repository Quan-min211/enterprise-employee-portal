/**
 * Bulk Employee Seeder — Fu Sheng Vietnam
 * Tao 220 nhan vien thuc te cho he thong noi bo nha may.
 *
 * Usage: node src/seeders/seed.bulk-employees.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// ----------------------------------------------------------------
// PHONG BAN (8 phong)
// ----------------------------------------------------------------
const DEPARTMENTS = [
  { code: 'IT',    name: 'Phong Cong nghe Thong tin',  description: 'Van hanh ha tang, ung dung noi bo va bao mat thong tin.' },
  { code: 'HR',    name: 'Phong Hanh chinh Nhan su',   description: 'Quan ly nhan su, phuc loi, noi quy va truyen thong noi bo.' },
  { code: 'PROD',  name: 'Khoi San xuat',               description: 'Lap rap, kiem tra va van hanh day chuyen san xuat.' },
  { code: 'ENG',   name: 'Phong Ky thuat R&D',          description: 'Cai tien thiet bi, ho tro ky thuat va nghien cuu san pham.' },
  { code: 'SALES', name: 'Phong Kinh doanh',            description: 'Cham soc khach hang, don hang va phat trien thi truong.' },
  { code: 'QC',    name: 'Phong Kiem soat Chat luong',  description: 'Kiem tra san pham, kien toan quy trinh chat luong.' },
  { code: 'ACCT',  name: 'Phong Ke toan Tai chinh',     description: 'Quan ly ngan sach, thu chi, bao cao tai chinh.' },
  { code: 'LOG',   name: 'Phong Kho van Logistics',     description: 'Quan ly kho hang, van chuyen va tieu thu vat tu.' }
];

// ----------------------------------------------------------------
// CHUC DANH THEO PHONG BAN
// ----------------------------------------------------------------
const POSITIONS = {
  IT:    ['Ky su phan mem', 'Quan tri mang', 'Lap trinh vien', 'IT Support', 'Ky su he thong', 'BA phan tich', 'Quan tri CSDL'],
  HR:    ['Chuyen vien tuyen dung', 'Chuyen vien luong', 'Nhan vien hanh chinh', 'Truong phong HR', 'Chuyen vien phuc loi', 'Nhan vien dao tao'],
  PROD:  ['Nhan vien lap rap', 'To truong san xuat', 'Kiem soat day chuyen', 'Van hanh may', 'Nhan vien dong goi', 'To truong to lap', 'Nhan vien bao duong', 'Cong nhan ky thuat'],
  ENG:   ['Ky su co khi', 'Ky su dien', 'Ky su bao tri', 'Nhan vien R&D', 'Truong bo phan ky thuat', 'Ky su thiet ke', 'Ky su kiem tra'],
  SALES: ['Chuyen vien kinh doanh', 'Nhan vien CSKH', 'Quan ly kenh phan phoi', 'Truong phong kinh doanh', 'Chuyen vien phat trien thi truong'],
  QC:    ['Kiem tra vien chat luong', 'KTV QC', 'Giam sat chat luong', 'Nhan vien kiem nghiem', 'Chuyen vien hop chuan', 'Truong nhom QC'],
  ACCT:  ['Ke toan truong', 'Ke toan vien', 'Thu quy', 'Chuyen vien tai chinh', 'Nhan vien ke toan cong no'],
  LOG:   ['Thu kho', 'Nhan vien van chuyen', 'Giam sat kho', 'Truong kho', 'Nhan vien xuat nhap kho', 'Dieu phoi logistics']
};

// ----------------------------------------------------------------
// HO VA TEN VIET NAM
// ----------------------------------------------------------------
const HO = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly', 'Mai', 'Trinh', 'Dinh', 'Luu', 'Dao', 'Vu', 'Lam'];

const TEN_NAM = [
  'Minh Quan', 'Van Binh', 'Quoc Viet', 'Thanh Nam', 'Huu Duc', 'Xuan Truong',
  'Cong Thanh', 'Minh Tuan', 'Khanh Duy', 'Hoang Long', 'Van Hoa', 'Duc Anh',
  'Trong Nghia', 'Quang Khai', 'Chi Cuong', 'Phu Quy', 'Manh Hung', 'Tien Dat',
  'Viet Hoang', 'Thien Phu', 'Hai Duong', 'Tuan Kiet', 'Nhat Minh', 'Cong Dung',
  'Van Luc', 'Anh Kiet', 'Huy Hoang', 'Thanh Phong', 'Xuan Loc', 'Van Toan',
  'Ngoc Tuan', 'Huu Nghia', 'Quoc Hung', 'Duy Khoi', 'Tien Dung', 'Van Lam',
  'Minh Hieu', 'Tien Thinh', 'Cong Hoa', 'Duc Huy', 'Van An', 'Trong Tin',
  'Thanh Dat', 'Hai Long', 'Anh Tuan', 'Ngoc Son', 'Tuan Anh', 'Viet Dung',
  'Minh Khoa', 'Thanh Liem'
];

const TEN_NU = [
  'Thi Thu Ha', 'Ngoc Anh', 'Minh Chau', 'Thu Thao', 'Thanh Huyen', 'Bich Ngoc',
  'Kim Oanh', 'Hong Nhung', 'Phuong Mai', 'Thuy Van', 'Lan Phuong', 'Phuong Thao',
  'Minh Trang', 'Hoai Thu', 'My Linh', 'Thao Nguyen', 'Hong Hanh', 'Kieu Trinh',
  'Bich Phuong', 'Khanh Linh', 'Thuy Trang', 'Ngoc Ha', 'Kim Ngan', 'Ngoc Linh',
  'Thanh Tam', 'Xuan Mai', 'Hai Yen', 'Thuy Linh', 'Lan Anh', 'Ngoc Bich',
  'Thu Hien', 'Thao Vi', 'Diem Quynh', 'Ngoc Uyen', 'Phuong Linh', 'Huong Giang',
  'Hong Van', 'Thuy Nguyen', 'Nhu Quynh', 'Thu Thuy', 'Kim Chi', 'Ngoc Truc'
];

// ----------------------------------------------------------------
// HELPER
// ----------------------------------------------------------------
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomDate(y1, y2) {
  const y = y1 + Math.floor(Math.random() * (y2 - y1));
  const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makePhone(seed) {
  const prefixes = ['0908', '0916', '0978', '0939', '0343', '0702', '0855', '0937'];
  const base = String(seed + 100000);
  return `${pick(prefixes)} ${base.slice(1,4)} ${base.slice(4,7)}`;
}

// ----------------------------------------------------------------
// GENERATE DATA
// ----------------------------------------------------------------
function buildEmployees() {
  const list = [];
  let idx = 1;

  // Phan bo so luong
  const dist = {
    IT: 20, HR: 15, PROD: 60, ENG: 30,
    SALES: 25, QC: 30, ACCT: 15, LOG: 25
  }; // Tong = 220

  for (const [dept, count] of Object.entries(dist)) {
    for (let i = 0; i < count; i++) {
      const isFemale = Math.random() < 0.42;
      const firstName = isFemale ? pick(TEN_NU) : pick(TEN_NAM);
      const lastName  = pick(HO);
      const fullName  = `${lastName} ${firstName}`;

      // Email slug
      const slug = fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.');

      const email    = `${slug}.${idx}@fusheng.com.vn`;
      const empCode  = `FSV-${dept}-${String(idx).padStart(3, '0')}`;
      const position = pick(POSITIONS[dept]);
      const hireDate = randomDate(2018, 2025);
      const status   = Math.random() < 0.94 ? 'active' : 'inactive';

      let role = 'employee';
      if (position.toLowerCase().includes('truong') || position.toLowerCase().includes('giam sat')) {
        role = 'manager';
      }

      list.push({ employee_code: empCode, full_name: fullName, email, role, position, phone: makePhone(idx), hire_date: hireDate, department_code: dept, status });
      idx++;
    }
  }

  return list;
}

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------
async function run() {
  let created = 0;
  let skipped = 0;

  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    // Ensure departments
    const deptMap = new Map();
    for (const d of DEPARTMENTS) {
      const [rec] = await Department.findOrCreate({ where: { code: d.code }, defaults: d });
      deptMap.set(d.code, rec);
    }
    console.log(`${DEPARTMENTS.length} phong ban san sang.\n`);

    const employees = buildEmployees();
    console.log(`Dang insert ${employees.length} nhan vien...\n`);

    // Pre-hash password once
    const hashed = await bcrypt.hash('Employee@123', 10);

    for (const emp of employees) {
      const dept = deptMap.get(emp.department_code);
      const [, wasCreated] = await User.findOrCreate({
        where: { employee_code: emp.employee_code },
        defaults: {
          employee_code: emp.employee_code,
          full_name:     emp.full_name,
          email:         emp.email,
          password:      hashed,
          role:          emp.role,
          position:      emp.position,
          phone:         emp.phone,
          hire_date:     emp.hire_date,
          status:        emp.status,
          must_change_password: true,
          department_id: dept ? dept.id : null
        }
      });

      if (wasCreated) {
        created++;
        console.log(`  + [${emp.employee_code}] ${emp.full_name} (${emp.position}) — ${emp.department_code}`);
      } else {
        skipped++;
      }
    }

    console.log('\n========================================');
    console.log(`Tao moi   : ${created} nhan vien`);
    console.log(`Bo qua    : ${skipped} (da ton tai)`);
    console.log(`Tong cong : ${employees.length}`);
    console.log('========================================');
    console.log('Bulk seed hoan tat!');
    console.log('Mat khau mac dinh: Employee@123');
    console.log('Tat ca nhan vien phai doi mat khau lan dau (must_change_password=true)\n');
  } catch (err) {
    console.error('Seed that bai:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

export { buildEmployees };

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  run();
}
