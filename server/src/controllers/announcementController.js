import { Announcement, User } from '../models/index.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({
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

    if (!title || !content) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề và nội dung thông báo.' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'normal',
      expires_at: expires_at || null,
      author_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Đăng thông báo thành công.',
      announcement
    });
  } catch (error) {
    next(error);
  }
};
