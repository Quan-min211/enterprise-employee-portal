import { Announcement, Department, LeaveRequest, User } from '../models/index.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const employeeWhere = { status: 'active' };
    const leaveWhere = {};

    if (req.user.role === 'employee') {
      leaveWhere.user_id = req.user.id;
    }

    const [
      totalEmployees,
      totalDepartments,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      recentAnnouncements
    ] = await Promise.all([
      User.count({ where: employeeWhere }),
      Department.count(),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'pending' } }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'approved' } }),
      LeaveRequest.count({ where: { ...leaveWhere, status: 'rejected' } }),
      Announcement.findAll({
        limit: 3,
        include: [{ model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }],
        order: [['created_at', 'DESC']]
      })
    ]);

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
        recentAnnouncements
      }
    });
  } catch (error) {
    next(error);
  }
};
