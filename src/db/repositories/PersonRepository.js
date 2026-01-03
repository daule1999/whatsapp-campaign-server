/**
 * Person Repository - MySQL only
 */
const { Op } = require('sequelize');

class PersonRepository {
    getModel() {
        const { Person } = require('../models/sequelize');
        return Person;
    }

    async findById(id) {
        const Person = this.getModel();
        return await Person.findByPk(id);
    }

    async findOne(filter) {
        const Person = this.getModel();
        return await Person.findOne({ where: filter });
    }

    async findByPhone(phoneNumber, countryCode = '91') {
        return this.findOne({ phoneNumber, phoneCountryCode: countryCode });
    }

    async findByEmail(email) {
        return this.findOne({ email: email.toLowerCase() });
    }

    async findAll(filter = {}, options = {}) {
        const Person = this.getModel();
        let where = {};

        if (filter.search) {
            where[Op.or] = [
                { firstName: { [Op.like]: `%${filter.search}%` } },
                { lastName: { [Op.like]: `%${filter.search}%` } },
                { phoneNumber: { [Op.like]: `%${filter.search}%` } },
                { email: { [Op.like]: `%${filter.search}%` } }
            ];
        }
        if (filter.isActive !== undefined) {
            where.isActive = filter.isActive;
        }

        return await Person.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: options.limit || 50,
            offset: options.skip || 0
        });
    }

    async findByTags(tags, options = {}) {
        return this.findAll({ tags, isActive: true }, options);
    }

    async create(data) {
        const Person = this.getModel();

        // Handle backward compatibility with name field
        if (data.name && !data.firstName) {
            const nameParts = data.name.trim().split(' ');
            data.firstName = nameParts[0];
            data.lastName = nameParts.slice(1).join(' ');
            delete data.name;
        }

        // Handle phone to phoneNumber conversion
        if (data.phone && !data.phoneNumber) {
            data.phoneNumber = data.phone;
            delete data.phone;
        }

        return await Person.create(data);
    }

    async createBulk(dataArray) {
        const results = { created: [], skipped: [] };

        for (const data of dataArray) {
            try {
                const person = await this.create(data);
                results.created.push(person);
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    results.skipped.push({ data, reason: 'duplicate' });
                } else {
                    results.skipped.push({ data, reason: error.message });
                }
            }
        }

        return results;
    }

    async findOrCreate(filter, defaults) {
        const Person = this.getModel();
        const [person, created] = await Person.findOrCreate({
            where: filter,
            defaults
        });
        return { person, created };
    }

    async updateById(id, data) {
        const Person = this.getModel();
        const person = await Person.findByPk(id);
        if (!person) return null;
        Object.assign(person, data);
        await person.save();
        return person;
    }

    async deleteById(id) {
        const Person = this.getModel();
        const result = await Person.destroy({ where: { id } });
        return result > 0;
    }

    async deleteMany(ids) {
        const Person = this.getModel();
        return await Person.destroy({ where: { id: ids } });
    }

    async count(filter = {}) {
        const Person = this.getModel();
        return await Person.count({ where: filter });
    }

    async addTags(id, tags) {
        const Person = this.getModel();
        const person = await Person.findByPk(id);
        if (!person) return null;
        person.tags = [...new Set([...(person.tags || []), ...tags])];
        await person.save();
        return person;
    }

    async removeTags(id, tags) {
        const Person = this.getModel();
        const person = await Person.findByPk(id);
        if (!person) return null;
        person.tags = (person.tags || []).filter(t => !tags.includes(t));
        await person.save();
        return person;
    }
}

module.exports = new PersonRepository();
