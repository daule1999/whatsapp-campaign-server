const config = require('../../config');

/**
 * Template Repository - abstracts database operations for Template model
 */
class TemplateRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.Template;
    }

    async findById(id) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            return await Template.findByPk(id);
        } else {
            return await Template.findById(id);
        }
    }

    async findOne(filter = {}) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            return await Template.findOne({ where: filter });
        } else {
            return await Template.findOne(filter);
        }
    }

    async findAll(filter = {}, options = {}) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            return await Template.findAll({
                where: filter,
                order: options.sort ? [[options.sort.field, options.sort.order]] : [['createdAt', 'DESC']]
            });
        } else {
            let query = Template.find(filter);
            if (options.sort) {
                query = query.sort({ [options.sort.field]: options.sort.order === 'DESC' ? -1 : 1 });
            } else {
                query = query.sort({ createdAt: -1 });
            }
            return await query;
        }
    }

    async create(data) {
        const Template = this.getModel();
        return await Template.create(data);
    }

    async updateById(id, data) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            const template = await Template.findByPk(id);
            if (!template) return null;
            Object.assign(template, data);
            await template.save();
            return template;
        } else {
            const template = await Template.findById(id);
            if (!template) return null;
            Object.assign(template, data);
            await template.save();
            return template;
        }
    }

    async deleteById(id) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            const result = await Template.destroy({ where: { id } });
            return result > 0;
        } else {
            const result = await Template.deleteOne({ _id: id });
            return result.deletedCount > 0;
        }
    }

    async count(filter = {}) {
        const Template = this.getModel();
        if (this.dbType === 'mysql') {
            return await Template.count({ where: filter });
        } else {
            return await Template.countDocuments(filter);
        }
    }
}

module.exports = new TemplateRepository();
