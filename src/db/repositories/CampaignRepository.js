/**
 * Campaign Repository - MySQL only
 */
class CampaignRepository {
    getModel() {
        const { Campaign } = require('../models/sequelize');
        return Campaign;
    }

    getTemplateModel() {
        const { Template } = require('../models/sequelize');
        return Template;
    }

    getUserModel() {
        const { User } = require('../models/sequelize');
        return User;
    }

    async findById(id, options = {}) {
        const Campaign = this.getModel();
        const include = [];
        if (options.includeTemplate) {
            include.push({
                model: this.getTemplateModel(),
                as: 'template',
                attributes: options.templateFields || ['id', 'name', 'waTemplateName', 'languageCode', 'components', 'status']
            });
        }
        return await Campaign.findByPk(id, { include });
    }

    async findAll(filter = {}, options = {}) {
        const Campaign = this.getModel();
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
    }

    async create(data) {
        const Campaign = this.getModel();
        return await Campaign.create(data);
    }

    async updateById(id, data) {
        const Campaign = this.getModel();
        const campaign = await Campaign.findByPk(id);
        if (!campaign) return null;
        Object.assign(campaign, data);
        await campaign.save();
        return campaign;
    }

    async updateOne(filter, data) {
        const Campaign = this.getModel();
        await Campaign.update(data, { where: filter });
    }

    async deleteById(id) {
        const Campaign = this.getModel();
        const result = await Campaign.destroy({ where: { id } });
        return result > 0;
    }

    async count(filter = {}) {
        const Campaign = this.getModel();
        return await Campaign.count({ where: filter });
    }
}

module.exports = new CampaignRepository();
