/**
 * ErrorLog Repository - MySQL only
 */
class ErrorLogRepository {
    getModel() {
        const { ErrorLog } = require('../models/sequelize');
        return ErrorLog;
    }

    async create(data) {
        const ErrorLog = this.getModel();
        if (!ErrorLog) return null;
        return await ErrorLog.create(data);
    }

    async findByCampaignId(campaignId, options = {}) {
        const ErrorLog = this.getModel();
        if (!ErrorLog) return [];
        return await ErrorLog.findAll({
            where: {
                entityType: 'campaign',
                entityId: String(campaignId)
            },
            order: [['createdAt', 'DESC']],
            limit: options.limit || 100
        });
    }
}

module.exports = new ErrorLogRepository();
