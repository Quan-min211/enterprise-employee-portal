import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: isProd ? 'Đã xảy ra lỗi máy chủ nội bộ.' : 'He thong chua cau hinh JWT_SECRET.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
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

