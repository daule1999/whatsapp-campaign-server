/**
 * Contact Repository - MySQL only (Legacy - use PersonRepository)
 */
const { Op } = require('sequelize');

class ContactRepository {
    getModel() {
        const { Contact } = require('../models/sequelize');
        return Contact;
    }

    async findById(id) {
        const Contact = this.getModel();
        return await Contact.findByPk(id);
    }

    async findOne(filter) {
        const Contact = this.getModel();
        return await Contact.findOne({ where: filter });
    }

    async findAll(filter = {}, options = {}) {
        const Contact = this.getModel();
        let where = {};

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
    }

    async create(data) {
        const Contact = this.getModel();
        return await Contact.create(data);
    }

    async findOrCreate(filter, defaults) {
        const Contact = this.getModel();
        const [contact, created] = await Contact.findOrCreate({
            where: filter,
            defaults
        });
        return { contact, created };
    }

    async updateById(id, data) {
        const Contact = this.getModel();
        const contact = await Contact.findByPk(id);
        if (!contact) return null;
        Object.assign(contact, data);
        await contact.save();
        return contact;
    }

    async deleteById(id) {
        const Contact = this.getModel();
        const result = await Contact.destroy({ where: { id } });
        return result > 0;
    }

    async deleteMany(ids) {
        const Contact = this.getModel();
        return await Contact.destroy({ where: { id: ids } });
    }

    async count(filter = {}) {
        const Contact = this.getModel();
        return await Contact.count({ where: filter });
    }
}

module.exports = new ContactRepository();
