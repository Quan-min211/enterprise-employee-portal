/**
 * CLI script to securely bootstrap the first Administrator account in production.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@company.com node scripts/create-admin.js
 *   # Optional env vars: ADMIN_NAME, ADMIN_CODE, ADMIN_PASSWORD
 *   # If ADMIN_PASSWORD is omitted, a strong random 16-char password is generated
 *   # and printed once to stdout, with must_change_password = true enforced.
 */
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { sequelize } from '../src/config/database.js';
import { Department, User } from '../src/models/index.js';
import { validatePasswordPolicy } from '../src/utils/passwordPolicy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const generateStrongPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;

  const pick = (charset) => charset[crypto.randomInt(0, charset.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  for (let i = 0; i < 12; i += 1) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

async function run() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const fullName = (process.env.ADMIN_NAME || 'System Administrator').trim();
  const employeeCode = (process.env.ADMIN_CODE || 'FSV-ADM-001').trim();
  const suppliedPassword = process.env.ADMIN_PASSWORD;

  if (!email) {
    console.error('Error: ADMIN_EMAIL environment variable is required.');
    process.exit(1);
  }

  const password = suppliedPassword || generateStrongPassword();
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.isValid) {
    console.error(`Error: ${policyCheck.message}`);
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email }, paranoid: false });
    if (existing) {
      console.error(`Error: User with email '${email}' already exists.`);
      process.exit(1);
    }

    const itDept = await Department.findOne({ where: { code: 'IT' } });
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      employee_code: employeeCode,
      full_name: fullName,
      email,
      password: hashedPassword,
      role: 'admin',
      position: 'System Administrator',
      department_id: itDept?.id || null,
      status: 'active',
      must_change_password: true
    });

    console.log(`Admin account created successfully for ${email} (${employeeCode}).`);
    if (!suppliedPassword) {
      console.log(`Generated one-time password: ${password}`);
    }
    console.log('must_change_password is enabled; change password immediately upon first login.');
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('Failed to create admin account:', err.message);
  process.exit(1);
});
