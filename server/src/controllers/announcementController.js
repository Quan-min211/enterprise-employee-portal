import { Announcement, User } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const where = {};

    if (req.query.priority) {
      where.priority = req.query.priority;
    }

    const announcements = await Announcement.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ success: true, announcements });
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
