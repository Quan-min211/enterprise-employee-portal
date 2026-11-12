import { Op } from 'sequelize';
import {
  Announcement,
  Department,
  Holiday,
  LeaveRequest,
  LeaveBalance,
  User,
  AuditLog
} from '../models/index.js';

const buildScopedLeaveInclude = async (req) => {
  if (req.user.role !== 'manager') return [];

  const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
  return [
    {
      model: User,
      as: 'applicant',
      attributes: ['id', 'full_name', 'employee_code', 'department_id'],
      where: { department_id: manager?.department_id || -1 },
      required: true,
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    }
  ];
};

const recentLeaveInclude = [
  {
    model: User,
    as: 'applicant',
    attributes: ['id', 'full_name', 'employee_code', 'department_id'],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
  },
  { model: User, as: 'approver', attributes: ['id', 'full_name'] }
];

export const getDashboardSummary = async (req, res, next) => {
  try {
    const role = req.user.role;
    const employeeWhere = { status: 'active' };
    const leaveWhere = {};
    const scopedInclude = await buildScopedLeaveInclude(req);

    // Employee: chỉ xem đơn của chính mình
    if (role === 'employee') {
      leaveWhere.user_id = req.user.id;
    }

    // Manager: lấy department_id để dùng cho các query phòng ban
    let managerDeptId = null;
    if (role === 'manager') {
      const mgr = await User.findByPk(req.user.id, { attributes: ['department_id'] });
      managerDeptId = mgr?.department_id || null;
    }

    const [
      totalEmployees,
      totalDepartments,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      cancelledLeaves,
      recentAnnouncements,
      recentLeaves,
      pendingActionItems
    ] = await Promise.all([
      User.count({ where: employeeWhere }),
      Department.count(),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'pending' }, include: scopedInclude }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'approved' }, include: scopedInclude }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'rejected' }, include: scopedInclude }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'cancelled' }, include: scopedInclude }),
      Announcement.findAll({
        limit: 3,
        include: [{ model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }],
        order: [['created_at', 'DESC']]
      }),
      LeaveRequest.findAll({
        where: leaveWhere,
        limit: 5,
        include:
          scopedInclude.length > 0
            ? [scopedInclude[0], { model: User, as: 'approver', attributes: ['id', 'full_name'] }]
            : recentLeaveInclude,
        order: [['created_at', 'DESC']]
      }),
      LeaveRequest.findAll({
        where: { ...leaveWhere, status: 'pending' },
        limit: 5,
        include:
          scopedInclude.length > 0
            ? [scopedInclude[0], { model: User, as: 'approver', attributes: ['id', 'full_name'] }]
            : recentLeaveInclude,
        order: [['created_at', 'ASC']]
      })
    ]);

    // ── Manager-specific extras ──────────────────────────────────────────
    let deptEmployeeCount = null;
    let deptInfo = null;
    let urgentAnnouncements = [];

    if (role === 'manager' && managerDeptId) {
      const [deptCount, dept, urgentAnns] = await Promise.all([
        // Số nhân sự trong phòng ban
        User.count({ where: { status: 'active', department_id: managerDeptId } }),
        // Thông tin phòng ban
        Department.findByPk(managerDeptId, { attributes: ['id', 'name', 'code', 'description'] }),
        // Thông báo khẩn cấp + quan trọng (tối đa 5)
        Announcement.findAll({
          where: { priority: { [Op.in]: ['urgent', 'important'] } },
          limit: 5,
          include: [{ model: User, as: 'author', attributes: ['id', 'full_name'] }],
          order: [
            ['priority', 'ASC'], // urgent < important theo alphabet
            ['created_at', 'DESC']
          ]
        })
      ]);
      deptEmployeeCount = deptCount;
      deptInfo = dept;
      urgentAnnouncements = urgentAnns;
    }

    // ── Admin-specific extras ────────────────────────────────────────────
    let adminData = null;
    if (role === 'admin') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const currentYear = new Date().getFullYear();

      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminCount,
        managerCount,
        employeeCount,
        recentAuditLogs,
        todayAuditCount,
        totalAuditCount,
        totalHolidays,
        upcomingHolidays,
        recentUsers
      ] = await Promise.all([
        User.count(),
        User.count({ where: { status: 'active' } }),
        User.count({ where: { status: 'inactive' } }),
        User.count({ where: { role: 'admin' } }),
        User.count({ where: { role: 'manager' } }),
        User.count({ where: { role: 'employee' } }),
        AuditLog.findAll({
          limit: 6,
          include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'employee_code', 'role'] }],
          order: [['created_at', 'DESC']]
        }),
        AuditLog.count({ where: { created_at: { [Op.gte]: todayStart } } }),
        AuditLog.count(),
        Holiday.count({
          where: {
            date: {
              [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
            }
          }
        }),
        Holiday.findAll({
          where: { date: { [Op.gte]: new Date().toISOString().split('T')[0] } },
          order: [['date', 'ASC']],
          limit: 3
        }),
        User.findAll({
          limit: 5,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'employee_code', 'full_name', 'email', 'role', 'status', 'created_at'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        })
      ]);

      adminData = {
        accounts: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          roles: {
            admin: adminCount,
            manager: managerCount,
            employee: employeeCount
          },
          recentUsers
        },
        audit: {
          recentLogs: recentAuditLogs,
          todayCount: todayAuditCount,
          totalCount: totalAuditCount
        },
        systemConfig: {
          totalDepartments,
          totalHolidays,
          upcomingHolidays,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          dbStatus: 'connected',
          serverTime: new Date().toISOString(),
          uptime: Math.floor(process.uptime())
        }
      };
    }
    // ────────────────────────────────────────────────────────────────────

    const [monthlyRequests, topOtDepartments, approvalStats, leaveBalanceStats] = await Promise.all([
      calculateMonthlyRequests(req, new Date().getFullYear()),
      calculateTopOtDepartments(req, new Date().getFullYear(), 5),
      calculateApprovalStats(req, new Date().getFullYear()),
      calculateLeaveBalanceStats(req, new Date().getFullYear())
    ]);

    const departmentLoad = recentLeaves.reduce((acc, request) => {
      const departmentName = request.applicant?.department?.name || 'Chưa phân bổ';
      acc[departmentName] = (acc[departmentName] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      summary: {
        totalEmployees,
        totalDepartments,
        leaveStatus: {
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves,
          cancelled: cancelledLeaves
        },
        recentAnnouncements,
        recentLeaves,
        pendingActionItems,
        monthlyRequests,
        topOtDepartments,
        approvalStats,
        leaveBalanceStats,
        departmentLoad: Object.entries(departmentLoad).map(([department, total]) => ({
          department,
          total
        })),
        // Manager extras
        deptEmployeeCount,
        deptInfo,
        urgentAnnouncements,
        // Admin extras
        adminData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tính toán thống kê số đơn nghỉ phép & tăng ca (OT) qua 12 tháng trong năm
 */
export const calculateMonthlyRequests = async (req, targetYear) => {
  const role = req.user.role;
  const year = parseInt(targetYear, 10) || new Date().getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const leaveWhere = {
    start_date: {
      [Op.between]: [startDate, endDate]
    }
  };

  const include = [];

  if (role === 'employee') {
    leaveWhere.user_id = req.user.id;
  } else if (role === 'manager') {
    const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
    include.push({
      model: User,
      as: 'applicant',
      attributes: ['id', 'department_id'],
      where: { department_id: manager?.department_id || -1 },
      required: true
    });
  } else if (role === 'admin' && req.query?.department_id) {
    include.push({
      model: User,
      as: 'applicant',
      attributes: ['id', 'department_id'],
      where: { department_id: parseInt(req.query.department_id, 10) },
      required: true
    });
  }

  const requests = await LeaveRequest.findAll({
    where: leaveWhere,
    include,
    attributes: [
      'id',
      'request_type',
      'leave_type',
      'status',
      'start_date',
      'day_count',
      'ot_hours'
    ]
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const padded = String(monthNum).padStart(2, '0');
    return {
      month: monthNum,
      label: `T${monthNum}`,
      fullLabel: `Tháng ${monthNum}`,
      yearMonth: `${year}-${padded}`,
      total: 0,
      leaveCount: 0,
      otCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      approvedLeaveDays: 0,
      approvedOtHours: 0
    };
  });

  for (const r of requests) {
    const rawDate = r.start_date;
    if (!rawDate) continue;
    const dateStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString().slice(0, 10);
    const parts = dateStr.split('-');
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12) {
      const bucket = months[m - 1];
      bucket.total += 1;
      if (r.request_type === 'overtime') {
        bucket.otCount += 1;
      } else {
        bucket.leaveCount += 1;
      }
      if (r.status === 'approved') {
        bucket.approvedCount += 1;
        if (r.request_type === 'leave') {
          bucket.approvedLeaveDays += Number(r.day_count || 0);
        } else if (r.request_type === 'overtime') {
          bucket.approvedOtHours += Number(r.ot_hours || 0);
        }
      } else if (r.status === 'rejected') {
        bucket.rejectedCount += 1;
      } else if (r.status === 'pending') {
        bucket.pendingCount += 1;
      } else if (r.status === 'cancelled') {
        bucket.cancelledCount += 1;
      }
    }
  }

  months.forEach((m) => {
    m.approvedLeaveDays = Number(m.approvedLeaveDays.toFixed(1));
    m.approvedOtHours = Number(m.approvedOtHours.toFixed(1));
  });

  const yearTotal = requests.length;
  const maxMonthTotal = Math.max(...months.map((m) => m.total), 0);
  const peakMonth = months.reduce((max, curr) => (curr.total > max.total ? curr : max), months[0]);

  return {
    year,
    yearTotal,
    maxMonthTotal,
    peakMonth:
      peakMonth && peakMonth.total > 0
        ? { month: peakMonth.month, label: peakMonth.fullLabel, total: peakMonth.total }
        : null,
    months
  };
};

/**
 * GET /api/dashboard/monthly-requests
 * Trả về thống kê số đơn theo 12 tháng cho năm được chọn
 */
export const getMonthlyRequests = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const data = await calculateMonthlyRequests(req, year);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tính toán xếp hạng các phòng ban có khối lượng làm thêm giờ (OT) nhiều nhất
 */
export const calculateTopOtDepartments = async (req, targetYear, limitCount = 5) => {
  const year = parseInt(targetYear, 10) || new Date().getFullYear();
  const limit = Math.min(Math.max(parseInt(limitCount, 10) || 5, 1), 50);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const departments = await Department.findAll({
    order: [['code', 'ASC']],
    attributes: ['id', 'code', 'name', 'description']
  });

  let managerDeptId = null;
  if (req.user?.role === 'manager') {
    const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
    managerDeptId = manager?.department_id || null;
  }

  const deptStats = [];

  for (const dept of departments) {
    const totalStaff = await User.count({
      where: {
        department_id: dept.id,
        status: 'active'
      }
    });

    const otRequests = await LeaveRequest.findAll({
      where: {
        request_type: 'overtime',
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
      ],
      attributes: ['id', 'status', 'ot_hours', 'day_count', 'start_date']
    });

    const totalRequests = otRequests.length;
    const approvedRequests = otRequests.filter((r) => r.status === 'approved');
    const approvedCount = approvedRequests.length;
    const pendingCount = otRequests.filter((r) => r.status === 'pending').length;
    const rejectedCount = otRequests.filter((r) => r.status === 'rejected').length;
    const cancelledCount = otRequests.filter((r) => r.status === 'cancelled').length;

    const totalOtHours = Number(
      approvedRequests
        .reduce((sum, r) => sum + Number(r.ot_hours || 0), 0)
        .toFixed(1)
    );

    const avgOtHoursPerStaff =
      totalStaff > 0 ? Number((totalOtHours / totalStaff).toFixed(1)) : 0;

    deptStats.push({
      id: dept.id,
      code: dept.code,
      name: dept.name,
      totalStaff,
      totalRequests,
      approvedCount,
      pendingCount,
      rejectedCount,
      cancelledCount,
      totalOtHours,
      avgOtHoursPerStaff,
      isMyDepartment: managerDeptId === dept.id
    });
  }

  // Sắp xếp: Ưu tiên nhiều giờ OT nhất -> số đơn nhiều nhất -> tên mã phòng ban
  deptStats.sort((a, b) => {
    if (b.totalOtHours !== a.totalOtHours) {
      return b.totalOtHours - a.totalOtHours;
    }
    if (b.totalRequests !== a.totalRequests) {
      return b.totalRequests - a.totalRequests;
    }
    return a.code.localeCompare(b.code);
  });

  deptStats.forEach((d, idx) => {
    d.rank = idx + 1;
  });

  const factoryTotalOtHours = Number(
    deptStats.reduce((sum, d) => sum + d.totalOtHours, 0).toFixed(1)
  );
  const factoryTotalOtRequests = deptStats.reduce((sum, d) => sum + d.totalRequests, 0);
  const factoryApprovedOtRequests = deptStats.reduce((sum, d) => sum + d.approvedCount, 0);
  const factoryPendingOtRequests = deptStats.reduce((sum, d) => sum + d.pendingCount, 0);
  const factoryTotalStaff = deptStats.reduce((sum, d) => sum + d.totalStaff, 0);
  const maxOtHours = Math.max(...deptStats.map((d) => d.totalOtHours), 1);

  const topDepartments = deptStats.slice(0, limit);
  const topDepartment = deptStats[0]?.totalOtHours > 0 ? deptStats[0] : null;

  return {
    year,
    limit,
    maxOtHours,
    factoryTotalOtHours,
    factoryTotalOtRequests,
    factoryApprovedOtRequests,
    factoryPendingOtRequests,
    factoryTotalStaff,
    topDepartment,
    departments: topDepartments,
    allDepartmentsCount: deptStats.length
  };
};

/**
 * GET /api/dashboard/top-ot-departments
 * Trả về xếp hạng top phòng ban có nhiều OT
 */
export const getTopOtDepartments = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await calculateTopOtDepartments(req, year, limit);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tính toán thống kê tỷ lệ duyệt / từ chối đơn nghỉ phép và tăng ca (OT)
 * Hỗ trợ lọc theo năm, loại đơn (all, leave, overtime), và phòng ban (dành cho Admin)
 * Phân quyền:
 * - Admin: Thống kê toàn nhà máy hoặc theo phòng ban được chỉ định, kèm bảng so sánh tất cả phòng ban.
 * - Manager: Thống kê trong phạm vi phòng ban phụ trách, kèm thông tin so sánh.
 * - Employee: Thống kê tỷ lệ duyệt/từ chối đơn của chính cá nhân mình.
 */
export const calculateApprovalStats = async (req, targetYear, options = {}) => {
  const role = req.user?.role || 'employee';
  const year = parseInt(targetYear, 10) || new Date().getFullYear();
  const requestType = options.request_type || req.query?.request_type || 'all';
  const filterDeptId = options.department_id || req.query?.department_id;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const leaveWhere = {
    start_date: {
      [Op.between]: [startDate, endDate]
    }
  };

  if (requestType === 'leave' || requestType === 'overtime') {
    leaveWhere.request_type = requestType;
  }

  const include = [];
  let managerDeptId = null;

  if (role === 'employee') {
    leaveWhere.user_id = req.user.id;
  } else if (role === 'manager') {
    const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
    managerDeptId = manager?.department_id || null;
    include.push({
      model: User,
      as: 'applicant',
      attributes: ['id', 'department_id'],
      where: { department_id: managerDeptId || -1 },
      required: true
    });
  } else if (role === 'admin' && filterDeptId) {
    include.push({
      model: User,
      as: 'applicant',
      attributes: ['id', 'department_id'],
      where: { department_id: parseInt(filterDeptId, 10) },
      required: true
    });
  }

  const requests = await LeaveRequest.findAll({
    where: leaveWhere,
    include,
    attributes: [
      'id',
      'request_type',
      'leave_type',
      'status',
      'start_date',
      'end_date',
      'day_count',
      'ot_hours',
      'created_at',
      'updated_at'
    ]
  });

  let approvedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let totalDecisionHours = 0;
  let decidedWithTimeCount = 0;

  const byType = {
    leave: {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      decided: 0,
      approvalRate: 0,
      rejectionRate: 0,
      totalApprovedDays: 0
    },
    overtime: {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      decided: 0,
      approvalRate: 0,
      rejectionRate: 0,
      totalApprovedHours: 0
    }
  };

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const padded = String(monthNum).padStart(2, '0');
    return {
      month: monthNum,
      label: `T${monthNum}`,
      fullLabel: `Tháng ${monthNum}`,
      yearMonth: `${year}-${padded}`,
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      decided: 0,
      approvalRate: 0,
      rejectionRate: 0
    };
  });

  for (const r of requests) {
    const isApproved = r.status === 'approved';
    const isRejected = r.status === 'rejected';
    const isPending = r.status === 'pending';
    const isCancelled = r.status === 'cancelled';
    const isDecided = isApproved || isRejected;

    if (isApproved) approvedCount += 1;
    else if (isRejected) rejectedCount += 1;
    else if (isPending) pendingCount += 1;
    else if (isCancelled) cancelledCount += 1;

    // Đo lường tốc độ xử lý đơn (giờ)
    if (isDecided && r.created_at && r.updated_at) {
      const diffMs = new Date(r.updated_at) - new Date(r.created_at);
      if (diffMs >= 0) {
        totalDecisionHours += diffMs / (1000 * 60 * 60);
        decidedWithTimeCount += 1;
      }
    }

    // Tích lũy theo loại đơn
    const typeKey = r.request_type === 'overtime' ? 'overtime' : 'leave';
    const tObj = byType[typeKey];
    tObj.total += 1;
    if (isApproved) {
      tObj.approved += 1;
      if (typeKey === 'leave') {
        tObj.totalApprovedDays += Number(r.day_count || 0);
      } else {
        tObj.totalApprovedHours += Number(r.ot_hours || 0);
      }
    } else if (isRejected) {
      tObj.rejected += 1;
    } else if (isPending) {
      tObj.pending += 1;
    } else if (isCancelled) {
      tObj.cancelled += 1;
    }

    // Tích lũy theo tháng
    const rawDate = r.start_date;
    if (rawDate) {
      const dateStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString().slice(0, 10);
      const m = parseInt(dateStr.split('-')[1], 10);
      if (m >= 1 && m <= 12) {
        const bucket = monthlyTrend[m - 1];
        bucket.total += 1;
        if (isApproved) bucket.approved += 1;
        else if (isRejected) bucket.rejected += 1;
        else if (isPending) bucket.pending += 1;
        else if (isCancelled) bucket.cancelled += 1;
      }
    }
  }

  // Hoàn thiện tỷ lệ theo loại đơn
  ['leave', 'overtime'].forEach((key) => {
    const t = byType[key];
    t.decided = t.approved + t.rejected;
    t.approvalRate = t.decided > 0 ? Number(((t.approved / t.decided) * 100).toFixed(1)) : 0;
    t.rejectionRate = t.decided > 0 ? Number(((t.rejected / t.decided) * 100).toFixed(1)) : 0;
    if (key === 'leave') t.totalApprovedDays = Number(t.totalApprovedDays.toFixed(1));
    if (key === 'overtime') t.totalApprovedHours = Number(t.totalApprovedHours.toFixed(1));
  });

  // Hoàn thiện tỷ lệ theo tháng
  monthlyTrend.forEach((b) => {
    b.decided = b.approved + b.rejected;
    b.approvalRate = b.decided > 0 ? Number(((b.approved / b.decided) * 100).toFixed(1)) : 0;
    b.rejectionRate = b.decided > 0 ? Number(((b.rejected / b.decided) * 100).toFixed(1)) : 0;
  });

  const totalRequests = requests.length;
  const decidedCount = approvedCount + rejectedCount;
  const approvalRate = decidedCount > 0 ? Number(((approvedCount / decidedCount) * 100).toFixed(1)) : 0;
  const rejectionRate = decidedCount > 0 ? Number(((rejectedCount / decidedCount) * 100).toFixed(1)) : 0;
  const pendingRate = totalRequests > 0 ? Number(((pendingCount / totalRequests) * 100).toFixed(1)) : 0;
  const decidedRate = totalRequests > 0 ? Number(((decidedCount / totalRequests) * 100).toFixed(1)) : 0;
  const avgProcessingHours = decidedWithTimeCount > 0 ? Number((totalDecisionHours / decidedWithTimeCount).toFixed(1)) : 0;

  // Bảng so sánh giữa các phòng ban (Admin và Manager)
  const departmentComparison = [];
  if (role === 'admin' || role === 'manager') {
    const departments = await Department.findAll({
      order: [['code', 'ASC']],
      attributes: ['id', 'code', 'name']
    });

    for (const d of departments) {
      const deptWhere = {
        start_date: { [Op.between]: [startDate, endDate] }
      };
      if (requestType === 'leave' || requestType === 'overtime') {
        deptWhere.request_type = requestType;
      }

      const deptRequests = await LeaveRequest.findAll({
        where: deptWhere,
        include: [
          {
            model: User,
            as: 'applicant',
            attributes: ['id', 'department_id'],
            where: { department_id: d.id },
            required: true
          }
        ],
        attributes: ['id', 'status']
      });

      const dTotal = deptRequests.length;
      const dApproved = deptRequests.filter((r) => r.status === 'approved').length;
      const dRejected = deptRequests.filter((r) => r.status === 'rejected').length;
      const dPending = deptRequests.filter((r) => r.status === 'pending').length;
      const dCancelled = deptRequests.filter((r) => r.status === 'cancelled').length;
      const dDecided = dApproved + dRejected;
      const dApprovalRate = dDecided > 0 ? Number(((dApproved / dDecided) * 100).toFixed(1)) : 0;
      const dRejectionRate = dDecided > 0 ? Number(((dRejected / dDecided) * 100).toFixed(1)) : 0;

      departmentComparison.push({
        id: d.id,
        code: d.code,
        name: d.name,
        totalRequests: dTotal,
        approvedCount: dApproved,
        rejectedCount: dRejected,
        pendingCount: dPending,
        cancelledCount: dCancelled,
        decidedCount: dDecided,
        approvalRate: dApprovalRate,
        rejectionRate: dRejectionRate,
        isMyDepartment: managerDeptId === d.id
      });
    }

    departmentComparison.sort((a, b) => {
      if (b.decidedCount !== a.decidedCount) {
        return b.decidedCount - a.decidedCount;
      }
      return b.approvalRate - a.approvalRate;
    });
  }

  return {
    year,
    requestType,
    totalRequests,
    approvedCount,
    rejectedCount,
    pendingCount,
    cancelledCount,
    decidedCount,
    approvalRate,
    rejectionRate,
    pendingRate,
    decidedRate,
    avgProcessingHours,
    byType,
    monthlyTrend,
    departmentComparison
  };
};

/**
 * GET /api/dashboard/approval-rate
 * Trả về thống kê tỷ lệ duyệt / từ chối đơn theo năm và các bộ lọc
 */
export const getApprovalRate = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const data = await calculateApprovalStats(req, year, {
      request_type: req.query.request_type,
      department_id: req.query.department_id
    });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tính toán thống kê số ngày phép đã dùng / còn lại của người lao động
 * Hỗ trợ lọc theo năm, phòng ban và phân nhóm tiến độ sử dụng (tiers)
 * Phân quyền:
 * - Admin: Thống kê toàn nhà máy hoặc theo phòng ban, danh sách nhân viên và bảng so sánh các phòng ban.
 * - Manager: Thống kê trong phạm vi phòng ban phụ trách, danh sách nhân viên trong bộ phận.
 * - Employee: Thống kê số dư phép cá nhân (định mức, chuyển tiếp, đã dùng, còn lại, tiến độ).
 */
export const calculateLeaveBalanceStats = async (req, targetYear, options = {}) => {
  const role = req.user?.role || 'employee';
  const year = parseInt(targetYear, 10) || new Date().getFullYear();
  const filterDeptId = options.department_id || req.query?.department_id;
  const filterTier = options.tier || req.query?.tier || 'all';

  let managerDeptId = null;
  const userWhere = { status: 'active' };

  if (role === 'employee') {
    userWhere.id = req.user.id;
  } else if (role === 'manager') {
    const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
    managerDeptId = manager?.department_id || null;
    userWhere.department_id = managerDeptId || -1;
  } else if (role === 'admin' && filterDeptId) {
    userWhere.department_id = parseInt(filterDeptId, 10);
  }

  const users = await User.findAll({
    where: userWhere,
    attributes: ['id', 'full_name', 'employee_code', 'department_id', 'position', 'hire_date'],
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      {
        model: LeaveBalance,
        as: 'leave_balances',
        where: { year },
        required: false
      }
    ],
    order: [['full_name', 'ASC']]
  });

  let totalEntitledDays = 0;
  let totalUsedDays = 0;
  let totalRemainingDays = 0;
  let totalCarriedOverDays = 0;

  const tiers = {
    low: { key: 'low', label: 'Dưới 25% (Ít nghỉ phép)', count: 0, percentage: 0 },
    medium: { key: 'medium', label: '25% - 50% (Tiến độ bình thường)', count: 0, percentage: 0 },
    high: { key: 'high', label: '50% - 75% (Tiêu thụ khá)', count: 0, percentage: 0 },
    exhausted: { key: 'exhausted', label: 'Trên 75% (Gần hết phép)', count: 0, percentage: 0 }
  };

  const processedEmployees = [];

  for (const u of users) {
    const balRecord = u.leave_balances && u.leave_balances.length > 0 ? u.leave_balances[0] : null;
    const annualEntitlement = Number(balRecord?.annual_entitlement || 12);
    const carriedOver = Number(balRecord?.carried_over_days || 0);
    const totalEntitled = Number((annualEntitlement + carriedOver).toFixed(1));
    const usedDays = Number(balRecord?.used_days || 0);
    const remainingDays = Math.max(
      0,
      Number(balRecord?.remaining_days ?? totalEntitled - usedDays)
    );
    const utilizationRate =
      totalEntitled > 0 ? Number(((usedDays / totalEntitled) * 100).toFixed(1)) : 0;

    let tierKey = 'low';
    if (utilizationRate >= 75) {
      tierKey = 'exhausted';
    } else if (utilizationRate >= 50) {
      tierKey = 'high';
    } else if (utilizationRate >= 25) {
      tierKey = 'medium';
    }

    tiers[tierKey].count += 1;

    totalEntitledDays += totalEntitled;
    totalUsedDays += usedDays;
    totalRemainingDays += remainingDays;
    totalCarriedOverDays += carriedOver;

    processedEmployees.push({
      userId: u.id,
      fullName: u.full_name,
      employeeCode: u.employee_code,
      position: u.position || 'Nhân viên',
      department: u.department
        ? { id: u.department.id, code: u.department.code, name: u.department.name }
        : null,
      annualEntitlement,
      carriedOverDays: carriedOver,
      totalEntitledDays: totalEntitled,
      usedDays,
      remainingDays,
      utilizationRate,
      tier: tierKey,
      isNearExhaustion: remainingDays <= 2,
      isUntouched: usedDays === 0
    });
  }

  const totalEmployees = users.length;
  totalEntitledDays = Number(totalEntitledDays.toFixed(1));
  totalUsedDays = Number(totalUsedDays.toFixed(1));
  totalRemainingDays = Number(totalRemainingDays.toFixed(1));
  totalCarriedOverDays = Number(totalCarriedOverDays.toFixed(1));

  const averageUtilizationRate =
    totalEntitledDays > 0 ? Number(((totalUsedDays / totalEntitledDays) * 100).toFixed(1)) : 0;
  const avgRemainingPerWorker =
    totalEmployees > 0 ? Number((totalRemainingDays / totalEmployees).toFixed(1)) : 0;
  const avgUsedPerWorker =
    totalEmployees > 0 ? Number((totalUsedDays / totalEmployees).toFixed(1)) : 0;

  // Cập nhật percentage cho từng tier
  Object.keys(tiers).forEach((k) => {
    tiers[k].percentage =
      totalEmployees > 0 ? Number(((tiers[k].count / totalEmployees) * 100).toFixed(1)) : 0;
  });

  // Lọc theo tier nếu có
  const filteredEmployees =
    filterTier && filterTier !== 'all'
      ? processedEmployees.filter((e) => e.tier === filterTier)
      : processedEmployees;

  // Thống kê tổng hợp theo từng phòng ban (cho Admin và Manager)
  const departmentSummary = [];
  if (role === 'admin' || role === 'manager') {
    const departments = await Department.findAll({
      order: [['code', 'ASC']],
      attributes: ['id', 'code', 'name']
    });

    for (const d of departments) {
      const deptStaff = await User.findAll({
        where: { department_id: d.id, status: 'active' },
        attributes: ['id'],
        include: [
          {
            model: LeaveBalance,
            as: 'leave_balances',
            where: { year },
            required: false
          }
        ]
      });

      let dEntitled = 0;
      let dUsed = 0;
      let dRemaining = 0;
      let dCarried = 0;

      for (const s of deptStaff) {
        const b = s.leave_balances && s.leave_balances.length > 0 ? s.leave_balances[0] : null;
        const ent = Number(b?.annual_entitlement || 12);
        const car = Number(b?.carried_over_days || 0);
        const tot = ent + car;
        const u = Number(b?.used_days || 0);
        const rem = Math.max(0, Number(b?.remaining_days ?? tot - u));

        dEntitled += tot;
        dUsed += u;
        dRemaining += rem;
        dCarried += car;
      }

      dEntitled = Number(dEntitled.toFixed(1));
      dUsed = Number(dUsed.toFixed(1));
      dRemaining = Number(dRemaining.toFixed(1));
      dCarried = Number(dCarried.toFixed(1));

      const dStaffCount = deptStaff.length;
      const dRate = dEntitled > 0 ? Number(((dUsed / dEntitled) * 100).toFixed(1)) : 0;
      const dAvgRem = dStaffCount > 0 ? Number((dRemaining / dStaffCount).toFixed(1)) : 0;

      departmentSummary.push({
        id: d.id,
        code: d.code,
        name: d.name,
        staffCount: dStaffCount,
        entitledDays: dEntitled,
        usedDays: dUsed,
        remainingDays: dRemaining,
        carriedOverDays: dCarried,
        utilizationRate: dRate,
        avgRemainingPerWorker: dAvgRem,
        isMyDepartment: managerDeptId === d.id
      });
    }

    departmentSummary.sort((a, b) => b.utilizationRate - a.utilizationRate);
  }

  const topUsedDepartment = departmentSummary.length > 0 ? departmentSummary[0] : null;
  const topRemainingDepartment =
    departmentSummary.length > 0
      ? [...departmentSummary].sort((a, b) => b.remainingDays - a.remainingDays)[0]
      : null;

  return {
    year,
    filterTier,
    totalEmployees,
    totalEntitledDays,
    totalUsedDays,
    totalRemainingDays,
    totalCarriedOverDays,
    averageUtilizationRate,
    avgRemainingPerWorker,
    avgUsedPerWorker,
    tiers,
    departmentSummary,
    employees: filteredEmployees,
    insights: {
      topUsedDepartment: topUsedDepartment
        ? {
            code: topUsedDepartment.code,
            name: topUsedDepartment.name,
            rate: topUsedDepartment.utilizationRate
          }
        : null,
      topRemainingDepartment: topRemainingDepartment
        ? {
            code: topRemainingDepartment.code,
            name: topRemainingDepartment.name,
            remainingDays: topRemainingDepartment.remainingDays
          }
        : null,
      exhaustedCount: tiers.exhausted.count,
      untouchedCount: processedEmployees.filter((e) => e.isUntouched).length
    }
  };
};

/**
 * GET /api/dashboard/leave-balances
 * Trả về thống kê số ngày phép đã dùng / còn lại theo năm và các bộ lọc
 */
export const getLeaveBalanceStats = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const data = await calculateLeaveBalanceStats(req, year, {
      department_id: req.query.department_id,
      tier: req.query.tier
    });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
