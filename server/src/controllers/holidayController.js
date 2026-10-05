import { Op } from 'sequelize';
import { Holiday } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

// Ngày lễ Việt Nam mặc định (các ngày cố định theo pháp luật)
const defaultVietnamHolidays = [
  { date: '2026-01-01', name: 'Tết Dương lịch', type: 'national' },
  { date: '2026-01-28', name: 'Tết Nguyên Đán (28 Tháng Chạp)', type: 'national' },
  { date: '2026-01-29', name: 'Tết Nguyên Đán (29 Tháng Chạp)', type: 'national' },
  { date: '2026-01-30', name: 'Tết Nguyên Đán (Mùng 1)', type: 'national' },
  { date: '2026-01-31', name: 'Tết Nguyên Đán (Mùng 2)', type: 'national' },
  { date: '2026-02-01', name: 'Tết Nguyên Đán (Mùng 3)', type: 'national' },
  { date: '2026-02-02', name: 'Tết Nguyên Đán (Mùng 4)', type: 'national' },
  { date: '2026-02-03', name: 'Tết Nguyên Đán (Mùng 5)', type: 'national' },
  { date: '2026-04-16', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)', type: 'national' },
  { date: '2026-04-30', name: 'Ngày Giải phóng miền Nam', type: 'national' },
  { date: '2026-05-01', name: 'Quốc tế Lao động', type: 'national' },
  { date: '2026-09-02', name: 'Ngày Quốc khánh nước CHXHCN Việt Nam', type: 'national' }
];

export const getHolidays = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const holidays = await Holiday.findAll({
      where: {
        date: {
          [Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      },
      order: [['date', 'ASC']]
    });

    res.status(200).json({ success: true, year, total: holidays.length, holidays });
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (req, res, next) => {
  try {
    const { date, name, type } = req.body;

    const existing = await Holiday.findOne({ where: { date } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Ngay ${date} da ton tai trong danh sach ngay le.`
      });
    }

    const holiday = await Holiday.create({ date, name, type: type || 'national' });

    await writeAuditLog({
      userId: req.user.id,
      action: 'holiday.create',
      entityType: 'holiday',
      entityId: holiday.id,
      details: { date, name, type }
    });

    res.status(201).json({ success: true, message: 'Tao ngay le thanh cong.', holiday });
  } catch (error) {
    next(error);
  }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const holiday = await Holiday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Khong tim thay ngay le.' });
    }

    if (name !== undefined) holiday.name = name;
    if (type !== undefined) holiday.type = type;
    await holiday.save();

    await writeAuditLog({
      userId: req.user.id,
      action: 'holiday.update',
      entityType: 'holiday',
      entityId: id,
      details: { name, type }
    });

    res.status(200).json({ success: true, message: 'Cap nhat ngay le thanh cong.', holiday });
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByPk(id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Khong tim thay ngay le.' });
    }

    await holiday.destroy();

    await writeAuditLog({
      userId: req.user.id,
      action: 'holiday.delete',
      entityType: 'holiday',
      entityId: id,
      details: { date: holiday.date, name: holiday.name }
    });

    res.status(200).json({ success: true, message: 'Da xoa ngay le.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed ngày lễ mặc định Việt Nam cho năm hiện tại (admin only).
 * Gọi một lần khi setup ban đầu — idempotent (bỏ qua nếu đã có).
 */
export const seedDefaultHolidays = async (req, res, next) => {
  try {
    let created = 0;
    let skipped = 0;

    for (const h of defaultVietnamHolidays) {
      const [, wasCreated] = await Holiday.findOrCreate({
        where: { date: h.date },
        defaults: h
      });
      if (wasCreated) created++;
      else skipped++;
    }

    res.status(200).json({
      success: true,
      message: `Da them ${created} ngay le, bo qua ${skipped} ngay da co.`,
      created,
      skipped
    });
  } catch (error) {
    next(error);
  }
};
