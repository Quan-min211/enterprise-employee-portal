/**
 * Production seed — chỉ tạo các phòng ban cốt lõi nếu chưa có.
 * KHÔNG tạo tài khoản mặc định (admin/manager/employee) để tránh rủi ro bảo mật.
 *
 * Admin đầu tiên phải được tạo thủ công bằng script riêng hoặc qua CLI.
 * Xem runbook: docs/deploy/RUNBOOK.md#tao-admin-dau-tien
 *
 * Usage: npm run seed:prod
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../config/database.js';
import { Department } from '../models/index.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const productionDepartments = [
  { code: 'IT',   name: 'Phong Cong nghe Thong tin',  description: 'Van hanh ha tang, ung dung noi bo va bao mat thong tin.' },
  { code: 'HR',   name: 'Phong Hanh chinh Nhan su',   description: 'Quan ly nhan su, phuc loi, noi quy va truyen thong noi bo.' },
  { code: 'PROD', name: 'Khoi San xuat',              description: 'Lap rap, kiem tra va van hanh day chuyen san xuat.' },
  { code: 'ENG',  name: 'Phong Ky thuat R&D',         description: 'Cai tien thiet bi, ho tro ky thuat va nghien cuu san pham.' },
  { code: 'SALES',name: 'Phong Kinh doanh',           description: 'Cham soc khach hang, don hang va phat trien thi truong.' }
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB. Running production seed (departments only)...');

    for (const dept of productionDepartments) {
      const [, created] = await Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept
      });
      console.log(`  ${created ? '✅ Created' : '⏭  Exists'}: ${dept.code} — ${dept.name}`);
    }

    console.log('\nProduction seed complete. No user accounts created.');
    console.log('To create the first admin, run: node scripts/create-admin.js');
  } catch (err) {
    console.error('Production seed failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
