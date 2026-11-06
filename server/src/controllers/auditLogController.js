import { Op } from 'sequelize';
import { AuditLog, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entity_type, user_id, date_from, date_to, ip_address, request_id } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const where = {};

    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (ip_address) where.ip_address = ip_address.trim();
    if (request_id) where.request_id = request_id.trim();
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

const escapeCsvValue = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const auditCsvHeaders = [
  'Mã nhật ký',
  'Thời điểm',
  'Người thực hiện',
  'Mã nhân viên',
  'Vai trò',
  'Hành động',
  'Đối tượng',
  'Mã đối tượng',
  'Địa chỉ IP',
  'Mã truy vết (Request ID)',
  'Chi tiết'
];

export const exportAuditLogs = async (req, res, next) => {
  try {
    const { action, entity_type, user_id, date_from, date_to, ip_address, request_id } = req.query;
    const where = {};

    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (ip_address) where.ip_address = ip_address.trim();
    if (request_id) where.request_id = request_id.trim();
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = `${date_from} 00:00:00`;
      if (date_to) where.created_at[Op.lte] = `${date_to} 23:59:59`;
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'employee_code', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: 5000
    });

    const roleMap = {
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      employee: 'Nhân viên'
    };

    const rows = logs.map((log) => [
      log.id,
      log.created_at ? new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19) : '',
      log.actor?.full_name || 'Hệ thống',
      log.actor?.employee_code || '',
      log.actor?.role ? (roleMap[log.actor.role] || log.actor.role) : '',
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.ip_address || '',
      log.request_id || '',
      log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : ''
    ]);

    const csv = [
      auditCsvHeaders.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(','))
    ].join('\n');

    await writeAuditLog({
      req,
      userId: req.user.id,
      action: 'audit_log.export',
      entityType: 'audit_log',
      details: { total: logs.length, filters: req.query }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
};
