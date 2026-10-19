import { body } from 'express-validator';

export const DEFAULT_PASSWORDS = [
  'admin@123',
  'manager@123',
  'employee@123',
  'password@123',
  'fusheng@123',
  'fusheng2026',
  '12345678@aa',
  '12345678@a',
  'admin123',
  'password123',
  'welcome@123'
];

/**
 * Validates password against security policy:
 * - Length: 8 - 128 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 * - Not in the default/common passwords list
 */
export const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Mật khẩu là bắt buộc.'
    };
  }

  if (password.length < 8 || password.length > 128) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có độ dài từ 8 đến 128 ký tự.'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ cái in hoa.'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ cái in thường.'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ số.'
    };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...).'
    };
  }

  const normalized = password.trim().toLowerCase();
  if (DEFAULT_PASSWORDS.includes(normalized)) {
    return {
      isValid: false,
      message: 'Mật khẩu không được trùng với mật khẩu mặc định của hệ thống.'
    };
  }

  return { isValid: true };
};

/**
 * express-validator reusable validator for password fields
 */
export const passwordValidator = (fieldName = 'password', isOptional = false) => {
  let chain = body(fieldName);

  if (isOptional) {
    chain = chain.optional();
  } else {
    chain = chain.notEmpty().withMessage('Mật khẩu là bắt buộc.');
  }

  return chain.custom((value) => {
    const result = validatePasswordPolicy(value);
    if (!result.isValid) {
      throw new Error(result.message);
    }
    return true;
  });
};
