import { Op } from 'sequelize';
import { Department, LeaveRequest, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const escapeCsvValue = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const reportCsvHeaders = [
  'Năm',
  'Kỳ báo cáo',
  'Mã phòng ban',
  'Tên phòng ban',
  'Tổng nhân sự',
  'Tổng số đơn',
  'Đơn đã duyệt',
  'Đơn từ chối',
  'Đơn chờ duyệt',
  'Đơn đã hủy',
  'Tổng ngày phép đã duyệt',
  'Tổng giờ OT đã duyệt',
  'Tỷ lệ duyệt (%)'
];

/**
 * Trích xuất và tổng hợp số liệu báo cáo định kỳ theo tháng/năm
 * phục vụ quản lý nhân sự, giám sát nghỉ phép và tăng ca toàn nhà máy.
 */
export const calculateMonthlySummaryData = async (req) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const rawMonth = req.query.month ? parseInt(req.query.month, 10) : null;
  const month = rawMonth && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;

  let startDate;
  let endDate;
  let periodLabel;
  let periodSlug;

  if (month) {
    const paddedMonth = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    startDate = `${year}-${paddedMonth}-01`;
    endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;
    periodLabel = `Tháng ${paddedMonth}/${year}`;
    periodSlug = `${year}-${paddedMonth}`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
    periodLabel = `Cả năm ${year}`;
    periodSlug = `${year}`;
  }

  // Phân quyền phạm vi phòng ban (RBAC)
  const deptWhere = {};
  let managerDeptId = null;

  if (req.user.role === 'manager') {
    const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
    managerDeptId = manager?.department_id || -1;
    deptWhere.id = managerDeptId;
  } else if (req.query.department_id) {
    deptWhere.id = parseInt(req.query.department_id, 10);
  }

  const departments = await Department.findAll({
    where: deptWhere,
    order: [['code', 'ASC']]
  });

  const departmentsData = [];

  for (const dept of departments) {
    const totalStaff = await User.count({
      where: {
        department_id: dept.id,
        status: 'active'
      }
    });

    const requests = await LeaveRequest.findAll({
      where: {
        start_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'department_id'],
          where: { department_id: dept.id },
          required: true
        }
      ]
    });

    const totalRequests = requests.length;
    const approvedRequests = requests.filter((r) => r.status === 'approved');
    const approvedCount = approvedRequests.length;
    const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;

    const approvedLeaveDays = approvedRequests
      .filter((r) => r.request_type === 'leave')
      .reduce((sum, r) => sum + Number(r.day_count || 0), 0);

    const approvedOtHours = approvedRequests
      .filter((r) => r.request_type === 'overtime')
      .reduce((sum, r) => sum + Number(r.ot_hours || 0), 0);

    const processed = approvedCount + rejectedCount;
    const approvalRate =
      processed > 0
        ? `${((approvedCount / processed) * 100).toFixed(1)}%`
        : totalRequests === 0
          ? '100.0%'
          : '0.0%';

    departmentsData.push({
      id: dept.id,
      code: dept.code,
      name: dept.name,
      totalStaff,
      totalRequests,
      approvedCount,
      rejectedCount,
      pendingCount,
      cancelledCount,
      approvedLeaveDays,
      approvedOtHours,
      approvalRate
    });
  }

  // Tổng cộng toàn nhà máy (Grand Total)
  const grandTotalStaff = departmentsData.reduce((sum, d) => sum + d.totalStaff, 0);
  const grandTotalRequests = departmentsData.reduce((sum, d) => sum + d.totalRequests, 0);
  const grandApprovedCount = departmentsData.reduce((sum, d) => sum + d.approvedCount, 0);
  const grandRejectedCount = departmentsData.reduce((sum, d) => sum + d.rejectedCount, 0);
  const grandPendingCount = departmentsData.reduce((sum, d) => sum + d.pendingCount, 0);
  const grandCancelledCount = departmentsData.reduce((sum, d) => sum + d.cancelledCount, 0);
  const grandApprovedLeaveDays = departmentsData.reduce((sum, d) => sum + d.approvedLeaveDays, 0);
  const grandApprovedOtHours = departmentsData.reduce((sum, d) => sum + d.approvedOtHours, 0);

  const grandProcessed = grandApprovedCount + grandRejectedCount;
  const grandApprovalRate =
    grandProcessed > 0
      ? `${((grandApprovedCount / grandProcessed) * 100).toFixed(1)}%`
      : grandTotalRequests === 0
        ? '100.0%'
        : '0.0%';

  const grandTotal = {
    totalStaff: grandTotalStaff,
    totalRequests: grandTotalRequests,
    approvedCount: grandApprovedCount,
    rejectedCount: grandRejectedCount,
    pendingCount: grandPendingCount,
    cancelledCount: grandCancelledCount,
    approvedLeaveDays: grandApprovedLeaveDays,
    approvedOtHours: grandApprovedOtHours,
    approvalRate: grandApprovalRate
  };

  return {
    year,
    month,
    periodLabel,
    periodSlug,
    startDate,
    endDate,
    managerDeptId,
    departmentsData,
    grandTotal
  };
};

/**
 * GET /api/reports/monthly-summary
 * Trả về dữ liệu JSON báo cáo định kỳ phục vụ hiển thị biểu đồ/bảng điều khiển
 */
export const getMonthlySummary = async (req, res, next) => {
  try {
    const data = await calculateMonthlySummaryData(req);
    res.status(200).json({
      success: true,
      period: {
        year: data.year,
        month: data.month,
        label: data.periodLabel,
        slug: data.periodSlug,
        startDate: data.startDate,
        endDate: data.endDate
      },
      summary: data.departmentsData,
      grandTotal: data.grandTotal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/monthly-summary/export
 * Xuất file CSV báo cáo định kỳ với UTF-8 BOM và ghi nhận Audit Log
 */
export const exportMonthlySummary = async (req, res, next) => {
  try {
    const data = await calculateMonthlySummaryData(req);

    const rows = data.departmentsData.map((d) => [
      data.year,
      data.periodLabel,
      d.code,
      d.name,
      d.totalStaff,
      d.totalRequests,
      d.approvedCount,
      d.rejectedCount,
      d.pendingCount,
      d.cancelledCount,
      d.approvedLeaveDays.toFixed(1),
      d.approvedOtHours.toFixed(1),
      d.approvalRate
    ]);

    // Dòng tổng kết toàn bộ nhà máy
    const totalRow = [
      data.year,
      data.periodLabel,
      'TOÀN NHÀ MÁY',
      'Tổng hợp tất cả bộ phận',
      data.grandTotal.totalStaff,
      data.grandTotal.totalRequests,
      data.grandTotal.approvedCount,
      data.grandTotal.rejectedCount,
      data.grandTotal.pendingCount,
      data.grandTotal.cancelledCount,
      data.grandTotal.approvedLeaveDays.toFixed(1),
      data.grandTotal.approvedOtHours.toFixed(1),
      data.grandTotal.approvalRate
    ];

    const csvContent = [
      reportCsvHeaders.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
      totalRow.map(escapeCsvValue).join(',')
    ].join('\n');

    await writeAuditLog({
      req,
      userId: req.user.id,
      action: 'report.export',
      entityType: 'report',
      details: {
        report: 'monthly_summary',
        year: data.year,
        month: data.month || 'all',
        period: data.periodLabel,
        department_id: req.query.department_id || (req.user.role === 'manager' ? data.managerDeptId : 'all'),
        departments_count: data.departmentsData.length,
        total_requests: data.grandTotal.totalRequests
      }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bao-cao-dinh-ky-${data.periodSlug}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(`\uFEFF${csvContent}`);
  } catch (error) {
    next(error);
  }
};

