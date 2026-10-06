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
    const employeeWhere = { status: 'active' };
    const leaveWhere = {};
    const scopedInclude = await buildScopedLeaveInclude(req);

    if (req.user.role === 'employee') {
      leaveWhere.user_id = req.user.id;
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
        include: scopedInclude.length > 0 ? [
          scopedInclude[0],
          { model: User, as: 'approver', attributes: ['id', 'full_name'] }
        ] : recentLeaveInclude,
        order: [['created_at', 'DESC']]
      }),
      LeaveRequest.findAll({
        where: { ...leaveWhere, status: 'pending' },
        limit: 5,
        include: scopedInclude.length > 0 ? [
          scopedInclude[0],
          { model: User, as: 'approver', attributes: ['id', 'full_name'] }
        ] : recentLeaveInclude,
        order: [['created_at', 'ASC']]
      })
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
          rejected: rejectedLeaves
        },
        recentAnnouncements,
        recentLeaves,
        pendingActionItems,
        departmentLoad: Object.entries(departmentLoad).map(([department, total]) => ({ department, total }))
      }
    });
  } catch (error) {
    next(error);
  }
};
