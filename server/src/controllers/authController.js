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
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: isProd ? 'Đã xảy ra lỗi máy chủ nội bộ.' : 'He thong chua cau hinh JWT_SECRET.'
      });
    }

    const { email, password } = req.body;
    const maxFailedAttempts = parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS, 10) || 5;
    const lockoutMinutes = parseInt(process.env.AUTH_LOCKOUT_MINUTES, 10) || 15;
    const lockoutMs = lockoutMinutes * 60 * 1000;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoac mat khau khong chinh xac.'
      });
    }

    // 1. Check if user is currently locked out
    if (user.locked_until) {
      const now = new Date();
      const lockedUntilDate = new Date(user.locked_until);

      if (lockedUntilDate > now) {
        const remainingMinutes = Math.max(1, Math.ceil((lockedUntilDate.getTime() - now.getTime()) / 60000));
        await writeAuditLog({
          userId: user.id,
          action: 'auth.login.locked',
          entityType: 'user',
          entityId: user.id,
          details: { email: user.email, remainingMinutes }
        });

        return res.status(423).json({
          success: false,
          locked: true,
          remainingMinutes,
          message: `Tai khoan tam thoi bi khoa do dang nhap sai qua nhieu lan. Vui long thu lai sau ${remainingMinutes} phut.`
        });
      } else {
        // Lockout period has elapsed, reset counters
        user.failed_login_attempts = 0;
        user.locked_until = null;
        await user.save();
      }
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;

      if (newAttempts >= maxFailedAttempts) {
        user.failed_login_attempts = newAttempts;
        user.locked_until = new Date(Date.now() + lockoutMs);
        await user.save();

        await writeAuditLog({
          userId: user.id,
          action: 'auth.account.locked',
          entityType: 'user',
          entityId: user.id,
          details: { email: user.email, attempts: newAttempts, lockoutMinutes }
        });

        return res.status(423).json({
          success: false,
          locked: true,
          remainingMinutes: lockoutMinutes,
          message: `Tai khoan tam thoi bi khoa trong ${lockoutMinutes} phut do nhap sai mat khau ${newAttempts} lan lien tiep.`
        });
      } else {
        user.failed_login_attempts = newAttempts;
        await user.save();

        const remaining = maxFailedAttempts - newAttempts;
        await writeAuditLog({
          userId: user.id,
          action: 'auth.login.failed',
          entityType: 'user',
          entityId: user.id,
          details: { email: user.email, reason: 'wrong_password', attempts: newAttempts }
        });

        return res.status(401).json({
          success: false,
          message: `Email hoac mat khau khong chinh xac. Con ${remaining} lan thu truoc khi tai khoan bi khoa.`
        });
      }
    }

    // 3. Check if account is active
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

    // 4. Successful login: reset failed attempts if previously accumulated
    if (user.failed_login_attempts > 0 || user.locked_until) {
      user.failed_login_attempts = 0;
      user.locked_until = null;
      await user.save();
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

