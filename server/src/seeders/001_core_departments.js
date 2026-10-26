/**
 * 001 — core_departments
 * Seeds the standard 8 departments for Fu Sheng Vietnam.
 */

const DEPARTMENTS = [
  { code: 'IT',    name: 'Phòng Công nghệ Thông tin',  description: 'Vận hành hạ tầng, ứng dụng nội bộ và bảo mật thông tin.' },
  { code: 'HR',    name: 'Phòng Hành chính Nhân sự',   description: 'Quản lý nhân sự, phúc lợi, nội quy và truyền thông nội bộ.' },
  { code: 'PROD',  name: 'Khối Sản xuất',               description: 'Lắp ráp, kiểm tra và vận hành dây chuyền sản xuất.' },
  { code: 'ENG',   name: 'Phòng Kỹ thuật R&D',          description: 'Cải tiến thiết bị, hỗ trợ kỹ thuật và nghiên cứu sản phẩm.' },
  { code: 'SALES', name: 'Phòng Kinh doanh',            description: 'Chăm sóc khách hàng, đơn hàng và phát triển thị trường.' },
  { code: 'QC',    name: 'Phòng Kiểm soát Chất lượng',  description: 'Kiểm tra sản phẩm, kiện toàn quy trình chất lượng.' },
  { code: 'ACCT',  name: 'Phòng Kế toán Tài chính',     description: 'Quản lý ngân sách, thu chi, báo cáo tài chính.' },
  { code: 'LOG',   name: 'Phòng Kho vận Logistics',     description: 'Quản lý kho hàng, vận chuyển và tiêu thụ vật tư.' }
];

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function up(qi, sequelize) {
  const [existing] = await sequelize.query('SELECT code FROM `departments`');
  const existingCodes = new Set(existing.map((r) => r.code));

  const now = new Date();
  const toInsert = DEPARTMENTS
    .filter((d) => !existingCodes.has(d.code))
    .map((d) => ({
      code: d.code,
      name: d.name,
      description: d.description,
      created_at: now,
      updated_at: now
    }));

  if (toInsert.length > 0) {
    await qi.bulkInsert('departments', toInsert);
  }
}

/**
 * @param {import('sequelize').QueryInterface} qi
 * @param {import('sequelize').Sequelize} sequelize
 */
export async function down(qi, sequelize) {
  // Only remove departments that have no assigned employees
  const codes = DEPARTMENTS.map((d) => d.code);
  await sequelize.query(`
    DELETE d FROM \`departments\` d
    LEFT JOIN \`users\` u ON d.id = u.department_id
    WHERE d.code IN (:codes) AND u.id IS NULL
  `, { replacements: { codes } });
}
