/**
 * 002 — vietnam_holidays_2026
 * Seeds statutory public holidays for Vietnam in 2026.
 */

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Tết Dương lịch', type: 'national' },
  { date: '2026-01-28', name: 'Tết Nguyên Đán - 28 Tháng Chạp', type: 'national' },
  { date: '2026-01-29', name: 'Tết Nguyên Đán - 29 Tháng Chạp', type: 'national' },
  { date: '2026-01-30', name: 'Tết Nguyên Đán - Mùng 1', type: 'national' },
  { date: '2026-01-31', name: 'Tết Nguyên Đán - Mùng 2', type: 'national' },
  { date: '2026-02-01', name: 'Tết Nguyên Đán - Mùng 3', type: 'national' },
  { date: '2026-02-02', name: 'Tết Nguyên Đán - Mùng 4', type: 'national' },
  { date: '2026-02-03', name: 'Tết Nguyên Đán - Mùng 5', type: 'national' },
  { date: '2026-04-16', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)', type: 'national' },
  { date: '2026-04-30', name: 'Ngày Giải phóng miền Nam', type: 'national' },
  { date: '2026-05-01', name: 'Quốc tế Lao động', type: 'national' },
  { date: '2026-09-02', name: 'Quốc khánh nước CHXHCN Việt Nam', type: 'national' }
];

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(qi, sequelize) {
  const [existing] = await sequelize.query('SELECT `date` FROM `holidays` WHERE YEAR(`date`) = 2026');
  const existingDates = new Set(existing.map((r) => r.date));

  const now = new Date();
  const toInsert = HOLIDAYS_2026
    .filter((h) => !existingDates.has(h.date))
    .map((h) => ({
      date: h.date,
      name: h.name,
      type: h.type,
      created_at: now,
      updated_at: now
    }));

  if (toInsert.length > 0) {
    await qi.bulkInsert('holidays', toInsert);
  }
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  const dates = HOLIDAYS_2026.map((h) => h.date);
  await sequelize.query(
    'DELETE FROM `holidays` WHERE `date` IN (:dates)',
    { replacements: { dates } }
  );
}
