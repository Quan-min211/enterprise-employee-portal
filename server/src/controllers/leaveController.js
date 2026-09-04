import { LeaveRequest, User, Department } from '../models/index.js';

export const createLeaveRequest = async (req, res, next) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;

    if (!start_date || !end_date || !reason) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin ngày bắt đầu, kết thúc và lý do.' });
    }

    const request = await LeaveRequest.create({
      user_id: req.user.id,
      leave_type: leave_type || 'annual',
      start_date,
      end_date,
      reason,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Gửi đơn nghỉ phép thành công.',
      request
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req, res, next) => {
  try {
    const where = {};

    // If regular employee, only show their own requests
    if (req.user.role === 'employee') {
      where.user_id = req.user.id;
    }

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        { model: User, as: 'applicant', attributes: ['id', 'full_name', 'employee_code', 'position'], include: [{ model: Department, as: 'department', attributes: ['name'] }] },
        { model: User, as: 'approver', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, manager_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái chỉ có thể là approved hoặc rejected.' });
    }

    const request = await LeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy đơn xin nghỉ phép.' });
    }

    request.status = status;
    request.approver_id = req.user.id;
    request.manager_comment = manager_comment || null;
    await request.save();

    res.status(200).json({
      success: true,
      message: `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} đơn nghỉ phép thành công.`,
      request
    });
  } catch (error) {
    next(error);
  }
};
