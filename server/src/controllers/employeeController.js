import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { Department, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const userInclude = [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }];
const safeAttributes = { exclude: ['password'] };

export const getEmployees = async (req, res, next) => {
  try {
    const { search, department_id, page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const where = { status: 'active' };

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { employee_code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (department_id) {
      where.department_id = department_id;
    }

    const { count, rows: employees } = await User.findAndCountAll({
      where,
      attributes: safeAttributes,
      include: userInclude,
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      order: [['full_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      total: count,
      page: pageNumber,
      totalPages: Math.ceil(count / pageSize),
      employees
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findByPk(req.params.id, {
      attributes: safeAttributes,
      include: userInclude
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nhan vien.' });
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const allowedFields = ['full_name', 'phone', 'avatar_url'];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) {
        acc[field] = req.body[field];
      }
      return acc;
    }, {});

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    await user.update(payload);
    await writeAuditLog({
      userId: req.user.id,
      action: 'employee.profile.update',
      entityType: 'user',
      entityId: req.user.id,
      details: Object.keys(payload)
    });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: safeAttributes,
      include: userInclude
    });

    res.status(200).json({ success: true, message: 'Cap nhat ho so thanh cong.', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const changeMyPassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mat khau hien tai khong chinh xac.' });
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    await writeAuditLog({
      userId: req.user.id,
      action: 'employee.password.change',
      entityType: 'user',
      entityId: req.user.id
    });

    res.status(200).json({ success: true, message: 'Doi mat khau thanh cong.' });
  } catch (error) {
    next(error);
  }
};
