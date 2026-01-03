const config = require('../../config');

/**
 * Contact Repository - abstracts database operations for Contact model
 */
class ContactRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.Contact;
    }

    async findById(id) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            return await Contact.findByPk(id);
        } else {
            return await Contact.findById(id);
        }
    }

    async findOne(filter) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            return await Contact.findOne({ where: filter });
        } else {
            return await Contact.findOne(filter);
        }
    }

    async findAll(filter = {}, options = {}) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            const { Op } = require('sequelize');
            let where = {};

            // Handle search
            if (filter.search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${filter.search}%` } },
                    { phone: { [Op.like]: `%${filter.search}%` } }
                ];
            }

            return await Contact.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: options.limit || 50,
                offset: options.skip || 0
            });
        } else {
            let mongoFilter = {};
            if (filter.search) {
                mongoFilter.$or = [
                    { name: { $regex: filter.search, $options: 'i' } },
                    { phone: { $regex: filter.search, $options: 'i' } }
                ];
            }

            const [contacts, count] = await Promise.all([
                Contact.find(mongoFilter)
                    .sort({ createdAt: -1 })
                    .skip(options.skip || 0)
                    .limit(options.limit || 50),
                Contact.countDocuments(mongoFilter)
            ]);

            return { rows: contacts, count };
        }
    }

    async create(data) {
        const Contact = this.getModel();
        return await Contact.create(data);
    }

    async findOrCreate(filter, defaults) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            const [contact, created] = await Contact.findOrCreate({
                where: filter,
                defaults
            });
            return { contact, created };
        } else {
            const existing = await Contact.findOne(filter);
            if (existing) {
                return { contact: existing, created: false };
            }
            const contact = await Contact.create({ ...filter, ...defaults });
            return { contact, created: true };
        }
    }

    async updateById(id, data) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            const contact = await Contact.findByPk(id);
            if (!contact) return null;
            Object.assign(contact, data);
            await contact.save();
            return contact;
        } else {
            const contact = await Contact.findById(id);
            if (!contact) return null;
            Object.assign(contact, data);
            await contact.save();
            return contact;
        }
    }

    async deleteById(id) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            const result = await Contact.destroy({ where: { id } });
            return result > 0;
        } else {
            const result = await Contact.deleteOne({ _id: id });
            return result.deletedCount > 0;
        }
    }

    async deleteMany(ids) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            return await Contact.destroy({ where: { id: ids } });
        } else {
            const result = await Contact.deleteMany({ _id: { $in: ids } });
            return result.deletedCount;
        }
    }

    async count(filter = {}) {
        const Contact = this.getModel();
        if (this.dbType === 'mysql') {
            return await Contact.count({ where: filter });
        } else {
            return await Contact.countDocuments(filter);
        }
    }
}

module.exports = new ContactRepository();
