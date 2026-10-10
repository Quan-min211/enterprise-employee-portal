import { Op } from 'sequelize';
import { Department, Holiday, LeaveApprovalLog, LeaveRequest, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const csvHeaders = [
  'Ma don', 'Nguoi nop', 'Ma nhan vien', 'Phong ban',
  'Nhom yeu cau', 'Loai', 'Tu ngay', 'Den ngay',
  'So ngay', 'So gio OT', 'Trang thai', 'Nguoi duyet', 'Ghi chu quan ly', 'Ly do'
];

const leaveInclude = [
  {
    model: User,
    as: 'applicant',
    attributes: ['id', 'full_name', 'employee_code', 'position', 'department_id'],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
  },
  { model: User, as: 'approver', attributes: ['id', 'full_name'] }
];

const escapeCsvValue = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

/**
 * Tính số ngày công thực tế giữa 2 ngày (loại trừ Chủ nhật, tính Thứ 7 = 0.5).
 * Nếu holidayDates được cung cấp, bỏ qua các ngày lễ.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 * @param {Set<string>} [holidayDates] - Set of 'YYYY-MM-DD' strings
 * @returns {number}
 */
export const calculateBusinessDays = (startDate, endDate, holidayDates = new Set()) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    const dateStr = cursor.toISOString().slice(0, 10);

    if (dayOfWeek !== 0 && !holidayDates.has(dateStr)) {
      // Thứ 7 = nửa ngày, các ngày còn lại = 1 ngày
      days += dayOfWeek === 6 ? 0.5 : 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return days || 0.5;
};

/**
 * Lấy Set ngày lễ trong khoảng [startDate, endDate] từ DB.
 */
const fetchHolidayDates = async (startDate, endDate) => {
  const holidays = await Holiday.findAll({
    where: {
      date: { [Op.between]: [startDate, endDate] }
    },
    attributes: ['date']
  });
  return new Set(holidays.map((h) => String(h.date)));
};

const getManagedDepartmentId = async (req) => {
  if (req.user.role !== 'manager') return null;
  const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
  return manager?.department_id || null;
};

const buildLeaveFilters = async (req) => {
  const where = {};
  const applicantWhere = {};

  if (req.user.role === 'employee') {
    where.user_id = req.user.id;
  }

  if (req.user.role === 'manager') {
    const managedDepartmentId = await getManagedDepartmentId(req);
    applicantWhere.department_id = managedDepartmentId || -1;
  }

  if (req.query.department_id && req.user.role === 'admin') {
    applicantWhere.department_id = Number(req.query.department_id);
  }

  if (req.query.user_id && req.user.role !== 'employee') {
    where.user_id = Number(req.query.user_id);
  }

  if (req.query.search && req.user.role !== 'employee') {
    const searchKeyword = `%${req.query.search.trim()}%`;
    applicantWhere[Op.or] = [
      { full_name: { [Op.like]: searchKeyword } },
      { employee_code: { [Op.like]: searchKeyword } }
    ];
  }

  if (req.query.status) {
    where.status = req.query.status;
  }

  if (req.query.request_type) {
    where.request_type = req.query.request_type;
  }

  if (req.query.leave_type) {
    where.leave_type = req.query.leave_type;
  }

  if (req.query.date_from || req.query.date_to) {
    where.start_date = {};
    if (req.query.date_from) where.start_date[Op.gte] = req.query.date_from;
    if (req.query.date_to) where.start_date[Op.lte] = req.query.date_to;
  }

  const include = leaveInclude.map((item) => ({ ...item }));
  if (Object.keys(applicantWhere).length > 0) {
    include[0] = { ...include[0], where: applicantWhere, required: true };
  }

  return { where, include };
};

export const createLeaveRequest = async (req, res, next) => {
  try {
    const { request_type = 'leave', leave_type, start_date, end_date, reason, ot_hours } = req.body;

    // Lấy ngày lễ để tính chính xác
    const holidayDates = await fetchHolidayDates(start_date, end_date);
    const dayCount = calculateBusinessDays(start_date, end_date, holidayDates);

    if (dayCount <= 0) {
      return res.status(400).json({ success: false, message: 'Khoang thoi gian dang ky khong hop le hoac trung ngay le.' });
    }

    const request = await LeaveRequest.create({
      user_id: req.user.id,
      request_type,
      leave_type: request_type === 'overtime' ? 'overtime' : (leave_type || 'annual'),
      start_date,
      end_date,
      reason,
      day_count: dayCount,
      ot_hours: request_type === 'overtime' ? (Number(ot_hours) || null) : null,
      status: 'pending'
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'leave.create',
      entityType: 'leave_request',
      entityId: request.id,
      details: {
        request_type: request.request_type,
        leave_type: request.leave_type,
        day_count: Number(request.day_count),
        ot_hours: request.ot_hours ? Number(request.ot_hours) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Gui don thanh cong.',
      request
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req, res, next) => {
  try {
    const { where, include } = await buildLeaveFilters(req);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const { count, rows: requests } = await LeaveRequest.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.status(200).json({ success: true, total: count, page, totalPages: Math.ceil(count / limit), requests });
  } catch (error) {
    next(error);
  }
};

export const exportLeaveRequests = async (req, res, next) => {
  try {
    const { where, include } = await buildLeaveFilters(req);
    const requests = await LeaveRequest.findAll({
      where,
      include,
      order: [['created_at', 'DESC']]
    });

    const rows = requests.map((request) => [
      request.id,
      request.applicant?.full_name,
      request.applicant?.employee_code,
      request.applicant?.department?.name,
      request.request_type,
      request.leave_type,
      request.start_date,
      request.end_date,
      Number(request.day_count || 0),
      request.ot_hours ? Number(request.ot_hours) : '',
      request.status,
      request.approver?.full_name,
      request.manager_comment,
      request.reason
    ]);

    const csv = [
      csvHeaders.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(','))
    ].join('\n');

    await writeAuditLog({
      userId: req.user.id,
      action: 'leave.export',
      entityType: 'leave_request',
      details: { total: requests.length, filters: req.query }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leave-requests-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, manager_comment } = req.body;

    const request = await LeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Khong tim thay don.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Don nay da duoc xu ly truoc do.' });
    }

    // Manager chỉ được duyệt đơn thuộc phòng ban mình phụ trách
    if (req.user.role === 'manager') {
      const managedDeptId = await getManagedDepartmentId(req);
      const applicant = await User.findByPk(request.user_id, { attributes: ['department_id'] });
      if (!managedDeptId || applicant?.department_id !== managedDeptId) {
        return res.status(403).json({ success: false, message: 'Ban khong co quyen duyet don cua phong ban khac.' });
      }
    }

    const fromStatus = request.status;
    request.status = status;
    request.approver_id = req.user.id;
    request.manager_comment = manager_comment || null;
    await request.save();

    // Ghi lịch sử duyệt
    await LeaveApprovalLog.create({
      leave_request_id: request.id,
      actor_id: req.user.id,
      from_status: fromStatus,
      to_status: status,
      comment: manager_comment || null
    });

    await writeAuditLog({
      userId: req.user.id,
      action: `leave.${status}`,
      entityType: 'leave_request',
      entityId: request.id,
      details: { manager_comment: request.manager_comment }
    });

    res.status(200).json({
      success: true,
      message: status === 'approved' ? 'Da duyet don thanh cong.' : 'Da tu choi don thanh cong.',
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Nhân viên hủy đơn của chính mình khi còn ở trạng thái pending.
 */
export const cancelLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await LeaveRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Khong tim thay don.' });
    }

    // Chỉ người tạo đơn mới được hủy
    if (request.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen huy don cua nguoi khac.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chi co the huy don dang cho duyet.' });
    }

    const fromStatus = request.status;
    request.status = 'cancelled';
    await request.save();

    await LeaveApprovalLog.create({
      leave_request_id: request.id,
      actor_id: req.user.id,
      from_status: fromStatus,
      to_status: 'cancelled',
      comment: 'Nguoi nop don tu huy.'
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'leave.cancelled',
      entityType: 'leave_request',
      entityId: request.id,
      details: {}
    });

    res.status(200).json({ success: true, message: 'Da huy don thanh cong.', request });
  } catch (error) {
    next(error);
  }
};

export const getLeaveStats = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const where = {
      start_date: {
        [Op.gte]: `${year}-01-01`,
        [Op.lte]: `${year}-12-31`
      }
    };

    if (req.user.role === 'employee') {
      where.user_id = req.user.id;
    }

    const include = [];
    if (req.user.role === 'manager') {
      const managedDepartmentId = await getManagedDepartmentId(req);
      include.push({
        model: User,
        as: 'applicant',
        attributes: ['id'],
        where: { department_id: managedDepartmentId || -1 },
        required: true
      });
    }

    const requests = await LeaveRequest.findAll({ where, include });
    const stats = requests.reduce((acc, request) => {
      acc.byStatus[request.status] = (acc.byStatus[request.status] || 0) + 1;
      acc.totalDays += Number(request.day_count || 0);
      if (request.ot_hours) acc.totalOtHours += Number(request.ot_hours);
      return acc;
    }, {
      year,
      totalRequests: requests.length,
      totalDays: 0,
      totalOtHours: 0,
      byStatus: { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    });

    res.status(200).json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};
