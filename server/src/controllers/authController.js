import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Department } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  sameSite: 'lax'
};

export const login = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'He thong chua cau hinh JWT_SECRET.' });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email, status: 'active' },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoac mat khau khong chinh xac.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoac mat khau khong chinh xac.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.cookie('token', token, cookieOptions);

    const userData = user.toJSON();
    delete userData.password;

    await writeAuditLog({
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email }
    });

    res.status(200).json({
      success: true,
      message: 'Dang nhap thanh cong.',
      user: userData
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  if (req.user?.id) {
    await writeAuditLog({
      userId: req.user.id,
      action: 'auth.logout',
      entityType: 'user',
      entityId: req.user.id
    });
  }

  res.clearCookie('token', cookieOptions);
  res.status(200).json({ success: true, message: 'Dang xuat thanh cong.' });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department' }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Khong tim thay nguoi dung.' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
