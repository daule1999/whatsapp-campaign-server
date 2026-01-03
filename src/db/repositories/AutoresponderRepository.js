/**
 * Autoresponder Repository - MySQL only
 */
class AutoresponderRepository {
    getModel() {
        const { Autoresponder } = require('../models/sequelize');
        return Autoresponder;
    }

    async findAll(options = {}) {
        const Autoresponder = this.getModel();
        return await Autoresponder.findAll({
            where: options.where || {},
            order: [['createdAt', 'DESC']]
        });
    }

    async findById(id) {
        const Autoresponder = this.getModel();
        return await Autoresponder.findByPk(id);
    }

    async findActive() {
        const Autoresponder = this.getModel();
        return await Autoresponder.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
    }

    async findByKeyword(keyword) {
        const Autoresponder = this.getModel();
        const all = await Autoresponder.findAll({
            where: { isActive: true }
        });

        // Match keyword (case-insensitive)
        const lowerKeyword = keyword.toLowerCase().trim();
        return all.find(ar => {
            const keywords = ar.triggerKeywords || [];
            return keywords.some(k => k.toLowerCase() === lowerKeyword);
        });
    }

    async create(data) {
        const Autoresponder = this.getModel();
        return await Autoresponder.create(data);
    }

    async updateById(id, data) {
        const Autoresponder = this.getModel();
        const result = await Autoresponder.update(data, { where: { id } });
        return result[0] > 0;
    }

    async deleteById(id) {
        const Autoresponder = this.getModel();
        const result = await Autoresponder.destroy({ where: { id } });
        return result > 0;
    }
}

module.exports = new AutoresponderRepository();
