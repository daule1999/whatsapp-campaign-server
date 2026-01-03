const config = require('../../config');

/**
 * AuditLog Repository - abstracts database operations for AuditLog model
 */
class AuditLogRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.AuditLog;
    }

    async findAll(filter = {}, options = {}) {
        const AuditLog = this.getModel();
        const limit = options.limit || 50;
        const skip = options.skip || 0;

        if (this.dbType === 'mysql') {
            const { count, rows } = await AuditLog.findAndCountAll({
                where: filter,
                order: [['createdAt', 'DESC']],
                limit,
                offset: skip
            });
            return { logs: rows.map(log => this._normalize(log)), count };
        } else {
            const [logs, count] = await Promise.all([
                AuditLog.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                AuditLog.countDocuments(filter)
            ]);
            return { logs: logs.map(log => this._normalize(log)), count };
        }
    }

    async create(data) {
        const AuditLog = this.getModel();
        // Normalize field names for storage
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

    /**
     * Normalize log output to snake_case for API consistency
     */
    _normalize(log) {
        const obj = log.toObject ? log.toObject() : log.toJSON ? log.toJSON() : log;
        return {
            id: obj._id || obj.id,
            user_id: obj.userId || obj.user_id || null,
            user_email: obj.userEmail || obj.user_email || null,
            action: obj.action,
            entity_type: obj.entityType || obj.entity_type || null,
            entity_id: obj.entityId || obj.entity_id || null,
            changes: obj.changes || null,
            ip_address: obj.ipAddress || obj.ip_address || null,
            user_agent: obj.userAgent || obj.user_agent || null,
            created_at: obj.createdAt || obj.created_at || new Date()
        };
    }
}

module.exports = new AuditLogRepository();

