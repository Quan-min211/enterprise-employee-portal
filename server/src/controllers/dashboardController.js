import { Op } from 'sequelize';
import { Announcement, Department, Holiday, LeaveRequest, User, AuditLog } from '../models/index.js';

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

    const [monthlyRequests, topOtDepartments] = await Promise.all([
      calculateMonthlyRequests(req, new Date().getFullYear()),
      calculateTopOtDepartments(req, new Date().getFullYear(), 5)
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
