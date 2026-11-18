import { Department, User } from '../models/index.js';

/**
 * Resolve all department IDs managed by a manager user.
 * Prioritizes explicit `departments.manager_id = userId` assignment,
 * and falls back to `user.department_id` for backward compatibility.
 *
 * @param {number} userId
 * @returns {Promise<number[]>}
 */
export const getManagedDepartmentIds = async (userId) => {
  if (!userId) return [];

  const managedDepartments = await Department.findAll({
    where: { manager_id: userId, status: 'active' },
    attributes: ['id'],
    order: [['id', 'ASC']]
  });

  if (managedDepartments.length > 0) {
    return managedDepartments.map((d) => d.id);
  }

  const manager = await User.findByPk(userId, { attributes: ['department_id'] });
  return manager?.department_id ? [manager.department_id] : [];
};

/**
 * Resolve the primary department ID managed by a manager user.
 *
 * @param {number} userId
 * @returns {Promise<number | null>}
 */
export const getPrimaryManagedDepartmentId = async (userId) => {
  const ids = await getManagedDepartmentIds(userId);
  return ids.length > 0 ? ids[0] : null;
};
