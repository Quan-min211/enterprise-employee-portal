import { User, Department } from '../models/index.js';
import { Op } from 'sequelize';

export const getEmployees = async (req, res, next) => {
  try {
    const { search, department_id, page = 1, limit = 10 } = req.query;
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

    const offset = (page - 1) * limit;
    const { count, rows: employees } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['full_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      employees
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department' }]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};
