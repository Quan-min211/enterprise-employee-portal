import { LeaveBalance, User, Department } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const DEFAULT_ANNUAL_DAYS = 12;

/**
 * Đảm bảo bản ghi leave_balance tồn tại cho user + năm.
 * Tạo mới với entitlement mặc định nếu chưa có.
 */
const ensureBalance = async (userId, year) => {
  const [balance] = await LeaveBalance.findOrCreate({
    where: { user_id: userId, year },
    defaults: {
      annual_entitlement: DEFAULT_ANNUAL_DAYS,
      used_days: 0,
      remaining_days: DEFAULT_ANNUAL_DAYS,
      carried_over_days: 0
    }
  });
  return balance;
};

// GET /api/leaves/balances/me?year=YYYY — nhân viên xem số dư phép của mình
export const getMyBalance = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const balance = await ensureBalance(req.user.id, year);
    res.status(200).json({ success: true, year, balance });
  } catch (error) {
    next(error);
  }
};

// GET /api/leaves/balances?year=YYYY&department_id= — manager/admin xem theo phòng ban
export const getBalances = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const userWhere = { status: 'active' };

    // Manager chỉ thấy phòng ban của mình
    if (req.user.role === 'manager') {
      const manager = await User.findByPk(req.user.id, { attributes: ['department_id'] });
      if (manager?.department_id) {
        userWhere.department_id = manager.department_id;
      }
    } else if (req.query.department_id) {
      userWhere.department_id = Number(req.query.department_id);
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'full_name', 'employee_code', 'department_id'],
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    // Đảm bảo có bản ghi balance cho mỗi user
    const balances = await Promise.all(
      users.map(async (user) => {
        const balance = await ensureBalance(user.id, year);
        return {
          user: {
            id: user.id,
            full_name: user.full_name,
            employee_code: user.employee_code,
            department: user.department
          },
          balance
        };
      })
    );

    res.status(200).json({ success: true, year, total: balances.length, balances });
  } catch (error) {
    next(error);
  }
};

// PUT /api/leaves/balances/:userId/:year — admin điều chỉnh số dư phép
export const updateBalance = async (req, res, next) => {
  try {
    const { userId, year } = req.params;
    const { annual_entitlement, carried_over_days } = req.body;

    const user = await User.findByPk(userId, { attributes: ['id', 'full_name'] });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
    }

    const balance = await ensureBalance(Number(userId), Number(year));

    if (annual_entitlement !== undefined) {
      balance.annual_entitlement = Number(annual_entitlement);
    }
    if (carried_over_days !== undefined) {
      balance.carried_over_days = Number(carried_over_days);
    }

    // Tính lại remaining
    balance.remaining_days = Number(balance.annual_entitlement) + Number(balance.carried_over_days) - Number(balance.used_days);
    await balance.save();

    await writeAuditLog({
      userId: req.user.id,
      action: 'leave_balance.update',
      entityType: 'leave_balance',
      entityId: balance.id,
      details: { target_user_id: userId, year, annual_entitlement, carried_over_days }
    });

    res.status(200).json({ success: true, message: 'Cập nhật số dư phép thành công.', balance });
  } catch (error) {
    next(error);
  }
};
