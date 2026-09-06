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

export const createEmployee = async (req, res, next) => {
  try {
    const {
      employee_code,
      full_name,
      email,
      password,
      role = 'employee',
      position,
      phone,
      department_id,
      hire_date,
      status = 'active'
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await User.create({
      employee_code,
      full_name,
      email,
      password: hashedPassword,
      role,
      position,
      phone,
      department_id: department_id || null,
      hire_date: hire_date || null,
      status
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'employee.create',
      entityType: 'user',
      entityId: employee.id,
      details: { employee_code, email, role }
    });

    const safeEmployee = await User.findByPk(employee.id, {
      attributes: safeAttributes,
      include: userInclude
    });

    res.status(201).json({
      success: true,
      message: 'Tao nhan vien thanh cong.',
      employee: safeEmployee
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const employee = await User.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nhan vien.' });
    }

    const allowedFields = [
      'employee_code',
      'full_name',
      'email',
      'role',
      'position',
      'phone',
      'avatar_url',
      'department_id',
      'hire_date',
      'status'
    ];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) {
        acc[field] = req.body[field] || null;
      }
      return acc;
    }, {});

    if (req.body.password) {
      payload.password = await bcrypt.hash(req.body.password, 10);
    }

    await employee.update(payload);

    await writeAuditLog({
      userId: req.user.id,
      action: 'employee.update',
      entityType: 'user',
      entityId: employee.id,
      details: Object.keys(payload).filter((field) => field !== 'password')
    });

    const safeEmployee = await User.findByPk(employee.id, {
      attributes: safeAttributes,
      include: userInclude
    });

    res.status(200).json({
      success: true,
      message: 'Cap nhat nhan vien thanh cong.',
      employee: safeEmployee
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await User.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nhan vien.' });
    }

    if (employee.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Khong the khoa tai khoan dang dang nhap.' });
    }

    employee.status = 'inactive';
    await employee.save();

    await writeAuditLog({
      userId: req.user.id,
      action: 'employee.deactivate',
      entityType: 'user',
      entityId: employee.id,
      details: { employee_code: employee.employee_code }
    });

    res.status(200).json({ success: true, message: 'Da khoa tai khoan nhan vien.' });
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
