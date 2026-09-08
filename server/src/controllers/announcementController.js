import { Announcement, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const where = {};

    if (req.query.priority) {
      where.priority = req.query.priority;
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.status(200).json({ success: true, total: count, page, totalPages: Math.ceil(count / limit), announcements });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, expires_at } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'normal',
      expires_at: expires_at || null,
      author_id: req.user.id
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'announcement.create',
      entityType: 'announcement',
      entityId: announcement.id,
      details: { priority: announcement.priority, title: announcement.title }
    });

    res.status(201).json({
      success: true,
      message: 'Dang thong bao thanh cong.',
      announcement
    });
  } catch (error) {
    next(error);
  }
};

const getEditablePayload = (body) => {
  const allowedFields = ['title', 'content', 'priority', 'expires_at'];
  return allowedFields.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = body[field] || null;
    return payload;
  }, {});
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Khong tim thay thong bao.' });
    }

    if (req.user.role !== 'admin' && announcement.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ban chi co the sua thong bao cua minh.' });
    }

    const payload = getEditablePayload(req.body);
    await announcement.update(payload);
    await writeAuditLog({ userId: req.user.id, action: 'announcement.update', entityType: 'announcement', entityId: announcement.id, details: { title: announcement.title } });
    res.status(200).json({ success: true, message: 'Cap nhat thong bao thanh cong.', announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Khong tim thay thong bao.' });
    }

    if (req.user.role !== 'admin' && announcement.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ban chi co the xoa thong bao cua minh.' });
    }

    await announcement.destroy();
    await writeAuditLog({ userId: req.user.id, action: 'announcement.delete', entityType: 'announcement', entityId: announcement.id, details: { title: announcement.title } });
    res.status(200).json({ success: true, message: 'Xoa thong bao thanh cong.' });
  } catch (error) {
    next(error);
  }
};
