import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'He thong chua cau hinh JWT_SECRET.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
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

