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
