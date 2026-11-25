import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
    });
  }

  if (!process.env.JWT_SECRET) {
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: isProd ? 'Đã xảy ra lỗi máy chủ nội bộ.' : 'He thong chua cau hinh JWT_SECRET.'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
  }

  try {
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'status', 'role', 'must_change_password', 'token_version']
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.'
      });
    }

    const tokenVersion = decoded.token_version ?? 0;
    const currentVersion = user.token_version ?? 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Phiên đăng nhập đã hết hiệu lực hoặc đã đăng xuất. Vui lòng đăng nhập lại.'
      });
    }

    req.user = {
      ...decoded,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
      token_version: currentVersion
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện hành động này.'
      });
    }
    next();
  };
};

export const checkMustChangePassword = (req, res, next) => {
  if (req.user?.must_change_password) {
    return res.status(403).json({
      success: false,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Ban phai doi mat khau lan dau truoc khi thuc hien hanh dong nay.'
    });
  }
  next();
};

