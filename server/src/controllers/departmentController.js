import { sequelize } from '../config/database.js';
import { Department } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM users WHERE users.department_id = Department.id AND users.status = \'active\')'
            ),
            'employee_count'
          ]
        ]
      },
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      departments: departments.map((d) => d.toJSON())
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const allowedFields = ['code', 'name', 'description', 'manager_name'];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});
    const department = await Department.create(payload);

    await writeAuditLog({
      userId: req.user.id,
      action: 'department.create',
      entityType: 'department',
      entityId: department.id,
      details: { code: department.code, name: department.name }
    });

    res.status(201).json({
      success: true,
      message: 'Tao phong ban thanh cong.',
      department
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Khong tim thay phong ban.' });
    }

    const allowedFields = ['code', 'name', 'description', 'manager_name'];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});
    await department.update(payload);

    await writeAuditLog({
      userId: req.user.id,
      action: 'department.update',
      entityType: 'department',
      entityId: department.id,
      details: payload
    });

    res.status(200).json({
      success: true,
      message: 'Cap nhat phong ban thanh cong.',
      department
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Khong tim thay phong ban.' });
    }

    await department.destroy();

    await writeAuditLog({
      userId: req.user.id,
      action: 'department.delete',
      entityType: 'department',
      entityId: Number(req.params.id),
      details: { code: department.code, name: department.name }
    });

    res.status(200).json({ success: true, message: 'Xoa phong ban thanh cong.' });
  } catch (error) {
    next(error);
  }
};
