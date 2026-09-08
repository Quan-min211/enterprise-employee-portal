import { Op } from 'sequelize';
import { AuditLog, User } from '../models/index.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entity_type, user_id, date_from, date_to } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const where = {};

    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = `${date_from} 00:00:00`;
      if (date_to) where.created_at[Op.lte] = `${date_to} 23:59:59`;
    }

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'employee_code', 'role'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.status(200).json({ success: true, total: count, page, totalPages: Math.ceil(count / limit), logs });
  } catch (error) {
    next(error);
  }
};
