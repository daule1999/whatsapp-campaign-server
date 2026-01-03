const config = require('../../config');

/**
 * Campaign Repository - abstracts database operations for Campaign model
 */
class CampaignRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.Campaign;
    }

    getTemplateModel() {
        const models = require('../models');
        return models.Template;
    }

    getUserModel() {
        const models = require('../models');
        return models.User;
    }

    async findById(id, options = {}) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            const include = [];
            if (options.includeTemplate) {
                include.push({
                    model: this.getTemplateModel(),
                    as: 'template',
                    attributes: options.templateFields || ['id', 'name', 'waTemplateName', 'languageCode', 'components']
                });
            }
            return await Campaign.findByPk(id, { include });
        } else {
            let query = Campaign.findById(id);
            if (options.includeTemplate) {
                query = query.populate('templateId', options.templateFields?.join(' ') || 'name waTemplateName languageCode components');
            }
            return await query;
        }
    }

    async findAll(filter = {}, options = {}) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            const include = [];
            if (options.includeTemplate) {
                include.push({
                    model: this.getTemplateModel(),
                    as: 'template',
                    attributes: ['id', 'name']
                });
            }
            if (options.includeCreator) {
                include.push({
                    model: this.getUserModel(),
                    as: 'creator',
                    attributes: ['id', 'name']
                });
            }

            const campaigns = await Campaign.findAll({
                where: filter,
                include,
                order: [['createdAt', 'DESC']]
            });

            return campaigns.map(c => {
                const obj = c.toJSON();
                return {
                    ...obj,
                    template_name: c.template?.name,
                    created_by_name: c.creator?.name
                };
            });
        } else {
            let query = Campaign.find(filter);
            if (options.includeTemplate) {
                query = query.populate('templateId', 'name');
            }
            if (options.includeCreator) {
                query = query.populate('createdBy', 'name');
            }

            const campaigns = await query.sort({ createdAt: -1 });

            return campaigns.map(c => {
                const obj = c.toObject();
                return {
                    ...obj,
                    id: obj._id,
                    template_name: c.templateId?.name,
                    created_by_name: c.createdBy?.name
                };
            });
        }
    }

    async create(data) {
        const Campaign = this.getModel();
        return await Campaign.create(data);
    }

    async updateById(id, data) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            const campaign = await Campaign.findByPk(id);
            if (!campaign) return null;
            Object.assign(campaign, data);
            await campaign.save();
            return campaign;
        } else {
            const campaign = await Campaign.findById(id);
            if (!campaign) return null;
            Object.assign(campaign, data);
            await campaign.save();
            return campaign;
        }
    }

    async updateOne(filter, data) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            await Campaign.update(data, { where: filter });
        } else {
            await Campaign.updateOne(filter, data);
        }
    }

    async deleteById(id) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            const result = await Campaign.destroy({ where: { id } });
            return result > 0;
        } else {
            const result = await Campaign.deleteOne({ _id: id });
            return result.deletedCount > 0;
        }
    }

    async count(filter = {}) {
        const Campaign = this.getModel();
        if (this.dbType === 'mysql') {
            return await Campaign.count({ where: filter });
        } else {
            return await Campaign.countDocuments(filter);
        }
    }
}

module.exports = new CampaignRepository();
