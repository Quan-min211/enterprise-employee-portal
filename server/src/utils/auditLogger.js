import { AuditLog } from '../models/index.js';

export const writeAuditLog = async ({ userId, action, entityType, entityId = null, details = null }) => {
  try {
    await AuditLog.create({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (error) {
    console.error('Unable to write audit log:', error.message);
  }
};
