const config = require('../../config');

class ErrorLogRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.ErrorLog;
    }

    async create(data) {
        const ErrorLog = this.getModel();
        // Check if DB is MySQL/Sequelize (ErrorLog only added to Sequelize for now)
        if (this.dbType === 'mysql' && ErrorLog) {
            return await ErrorLog.create(data);
        }
        // If Mongo, maybe just log to console or ignore for now as Mongo model wasn't created
        return null;
    }

    async findByCampaignId(campaignId, options = {}) {
        const ErrorLog = this.getModel();
        if (this.dbType === 'mysql' && ErrorLog) {
            return await ErrorLog.findAll({
                where: {
                    entityType: 'campaign',
                    entityId: String(campaignId)
                },
                order: [['createdAt', 'DESC']],
                limit: options.limit || 100
            });
        }
        return [];
    }
}

module.exports = new ErrorLogRepository();
