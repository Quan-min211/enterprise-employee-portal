import { Op } from 'sequelize';
import { Announcement, Department, LeaveRequest, User } from '../models/index.js';

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
      recentAnnouncements,
      recentLeaves,
      pendingActionItems
    ] = await Promise.all([
      User.count({ where: employeeWhere }),
      Department.count(),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'pending' }, include: scopedInclude }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'approved' }, include: scopedInclude }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'rejected' }, include: scopedInclude }),
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
            ['priority', 'ASC'], // urgent < important theo alphabet — đảo ở FE
            ['created_at', 'DESC']
          ]
        })
      ]);
      deptEmployeeCount = deptCount;
      deptInfo = dept;
      urgentAnnouncements = urgentAnns;
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
          rejected: rejectedLeaves
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
        urgentAnnouncements
      }
    });
  } catch (error) {
    next(error);
  }
};
