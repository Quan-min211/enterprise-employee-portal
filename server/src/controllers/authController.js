import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Department } from '../models/index.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import {
  generateCsrfToken,
  verifyCsrfTokenSignature,
  setCsrfCookies,
  clearCsrfCookies
} from '../middleware/csrf.js';
import { getAuthCookieOptions, getClearCookieOptions } from '../config/cookie.js';


export const login = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'He thong chua cau hinh JWT_SECRET.' });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoac mat khau khong chinh xac.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoac mat khau khong chinh xac.' });
    }

    if (user.status !== 'active') {
      await writeAuditLog({
        userId: user.id,
        action: 'auth.login.failed',
        entityType: 'user',
        entityId: user.id,
        details: { email: user.email, reason: 'inactive_account' }
      });
      return res.status(401).json({
        success: false,
        message: 'Tai khoan da bi vo hieu hoa. Vui long lien he quan tri vien.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        must_change_password: Boolean(user.must_change_password)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.cookie('token', token, getAuthCookieOptions());

    const csrfToken = generateCsrfToken();
    setCsrfCookies(res, csrfToken);

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
      message: user.must_change_password
        ? 'Dang nhap thanh cong. Ban can doi mat khau lan dau.'
        : 'Dang nhap thanh cong.',
      user: userData,
      csrfToken,
      must_change_password: Boolean(user.must_change_password)
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

  res.clearCookie('token', getClearCookieOptions(true));
  clearCsrfCookies(res);
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

    let csrfToken = req.cookies?._csrf || req.cookies?.['XSRF-TOKEN'];
    if (!csrfToken || !verifyCsrfTokenSignature(csrfToken)) {
      csrfToken = generateCsrfToken();
      setCsrfCookies(res, csrfToken);
    }

    res.status(200).json({
      success: true,
      user,
      csrfToken,
      must_change_password: Boolean(user.must_change_password)
    });
  } catch (error) {
    next(error);
  }
};

export const getCsrfToken = (req, res) => {
  let token = req.cookies?._csrf || req.cookies?.['XSRF-TOKEN'];
  if (!token || !verifyCsrfTokenSignature(token)) {
    token = generateCsrfToken();
  }
  setCsrfCookies(res, token);
  res.status(200).json({ success: true, csrfToken: token });
};

