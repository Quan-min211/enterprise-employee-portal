import { sequelize } from '../config/database.js';
import { Department } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

export const getDepartments = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }

    const departments = await Department.findAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM users WHERE users.department_id = Department.id AND users.status = \'active\' AND (users.deleted_at IS NULL))'
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
    const allowedFields = ['code', 'name', 'description', 'manager_name', 'status'];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});

    // Check if code already exists, including soft-deleted records
    const existing = await Department.findOne({
      where: { code: payload.code },
      paranoid: false
    });

    if (existing) {
      if (existing.deleted_at) {
        // Restore soft-deleted department with updated information
        await existing.restore();
        await existing.update({
          ...payload,
          status: payload.status || 'active'
        });

        await writeAuditLog({
          req,
          userId: req.user.id,
          action: 'department.restore',
          entityType: 'department',
          entityId: existing.id,
          details: { code: existing.code, name: existing.name }
        });

        return res.status(200).json({
          success: true,
          message: 'Khoi phuc phong ban thanh cong.',
          department: existing
        });
      }

      return res.status(409).json({
        success: false,
        message: `Ma phong ban '${payload.code}' da ton tai trong he thong.`
      });
    }

    const department = await Department.create(payload);

    await writeAuditLog({
      req,
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

    const allowedFields = ['code', 'name', 'description', 'manager_name', 'status'];
    const payload = allowedFields.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});
    await department.update(payload);

    await writeAuditLog({
      req,
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

    // Soft delete via paranoid model (sets deleted_at = NOW())
    await department.destroy();

    await writeAuditLog({
      req,
      userId: req.user.id,
      action: 'department.delete',
      entityType: 'department',
      entityId: Number(req.params.id),
      details: { code: department.code, name: department.name, soft_delete: true }
    });

    res.status(200).json({ success: true, message: 'Xoa phong ban thanh cong.' });
  } catch (error) {
    next(error);
  }
};
