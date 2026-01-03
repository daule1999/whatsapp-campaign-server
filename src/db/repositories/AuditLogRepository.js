/**
 * AuditLog Repository - MySQL only
 */
class AuditLogRepository {
    getModel() {
        const { AuditLog } = require('../models/sequelize');
        return AuditLog;
    }

    async findAll(filter = {}, options = {}) {
        const AuditLog = this.getModel();
        const limit = options.limit || 50;
        const skip = options.skip || 0;

        const { count, rows } = await AuditLog.findAndCountAll({
            where: filter,
            order: [['createdAt', 'DESC']],
            limit,
            offset: skip
        });
        return { logs: rows.map(log => this._normalize(log)), count };
    }

    async create(data) {
        const AuditLog = this.getModel();
        const normalizedData = {
            userId: data.userId || data.user_id || null,
            userEmail: data.userEmail || data.user_email || null,
            action: data.action,
            entityType: data.entityType || data.entity_type || null,
            entityId: data.entityId || data.entity_id || null,
            changes: data.changes || null,
            ipAddress: data.ipAddress || data.ip_address || null,
            userAgent: data.userAgent || data.user_agent || null
        };
        return await AuditLog.create(normalizedData);
    }

    _normalize(log) {
        const obj = log.toJSON();
        return {
            id: obj.id,
            user_id: obj.userId || null,
            user_email: obj.userEmail || null,
            action: obj.action,
            entity_type: obj.entityType || null,
            entity_id: obj.entityId || null,
            changes: obj.changes || null,
            ip_address: obj.ipAddress || null,
            user_agent: obj.userAgent || null,
            created_at: obj.createdAt || new Date()
        };
    }
}

module.exports = new AuditLogRepository();
