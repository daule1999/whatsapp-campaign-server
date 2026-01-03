/**
 * Template Repository - MySQL only
 */
class TemplateRepository {
    getModel() {
        const { Template } = require('../models/sequelize');
        return Template;
    }

    async findById(id) {
        const Template = this.getModel();
        return await Template.findByPk(id);
    }

    async findOne(filter = {}) {
        const Template = this.getModel();
        return await Template.findOne({ where: filter });
    }

    async findAll(filter = {}, options = {}) {
        const Template = this.getModel();
        return await Template.findAll({
            where: filter,
            order: options.sort ? [[options.sort.field, options.sort.order]] : [['createdAt', 'DESC']]
        });
    }

    async create(data) {
        const Template = this.getModel();
        return await Template.create(data);
    }

    async updateById(id, data) {
        const Template = this.getModel();
        const template = await Template.findByPk(id);
        if (!template) return null;
        Object.assign(template, data);
        await template.save();
        return template;
    }

    async deleteById(id) {
        const Template = this.getModel();
        const result = await Template.destroy({ where: { id } });
        return result > 0;
    }

    async count(filter = {}) {
        const Template = this.getModel();
        return await Template.count({ where: filter });
    }
}

module.exports = new TemplateRepository();
