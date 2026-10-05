import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../config/database.js';
import { seedDatabase } from '../config/seed.js';
import { Holiday } from '../models/index.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

// Ngày lễ Việt Nam 2026 (theo luật)
const defaultHolidays = [
  { date: '2026-01-01', name: 'Tet Duong lich', type: 'national' },
  { date: '2026-01-28', name: 'Tet Nguyen Dan - 28 Thang Chap', type: 'national' },
  { date: '2026-01-29', name: 'Tet Nguyen Dan - 29 Thang Chap', type: 'national' },
  { date: '2026-01-30', name: 'Tet Nguyen Dan - Mung 1', type: 'national' },
  { date: '2026-01-31', name: 'Tet Nguyen Dan - Mung 2', type: 'national' },
  { date: '2026-02-01', name: 'Tet Nguyen Dan - Mung 3', type: 'national' },
  { date: '2026-02-02', name: 'Tet Nguyen Dan - Mung 4', type: 'national' },
  { date: '2026-02-03', name: 'Tet Nguyen Dan - Mung 5', type: 'national' },
  { date: '2026-04-16', name: 'Gio To Hung Vuong (10/3 AL)', type: 'national' },
  { date: '2026-04-30', name: 'Ngay Giai phong mien Nam', type: 'national' },
  { date: '2026-05-01', name: 'Quoc te Lao dong', type: 'national' },
  { date: '2026-09-02', name: 'Quoc khanh nuoc CHXHCN Viet Nam', type: 'national' }
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB. Running development seed...');
    await seedDatabase();

    // Seed ngày lễ mặc định
    let created = 0;
    for (const h of defaultHolidays) {
      const [, wasCreated] = await Holiday.findOrCreate({ where: { date: h.date }, defaults: h });
      if (wasCreated) created++;
    }
    console.log(`Seeded ${created} holiday(s).`);

    console.log('Development seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

