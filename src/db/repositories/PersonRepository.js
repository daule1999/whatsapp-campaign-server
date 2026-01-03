const config = require('../../config');

/**
 * Person Repository - abstracts database operations for Person model
 * Enhanced version of ContactRepository with full Person model support
 */
class PersonRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.Person;
    }

    async findById(id) {
        const Person = this.getModel();
        if (this.dbType === 'mysql') {
            return await Person.findByPk(id);
        } else {
            return await Person.findById(id);
        }
    }

    async findOne(filter) {
        const Person = this.getModel();
        if (this.dbType === 'mysql') {
            return await Person.findOne({ where: filter });
        } else {
            return await Person.findOne(filter);
        }
    }

    async findByPhone(phoneNumber, countryCode = '91') {
        return this.findOne({ phoneNumber, phoneCountryCode: countryCode });
    }

    async findByEmail(email) {
        return this.findOne({ email: email.toLowerCase() });
    }

    async findAll(filter = {}, options = {}) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            const { Op } = require('sequelize');
            let where = {};

            if (filter.search) {
                where[Op.or] = [
                    { firstName: { [Op.like]: `%${filter.search}%` } },
                    { lastName: { [Op.like]: `%${filter.search}%` } },
                    { phoneNumber: { [Op.like]: `%${filter.search}%` } },
                    { email: { [Op.like]: `%${filter.search}%` } }
                ];
            }
            if (filter.tags) {
                where.tags = { [Op.contains]: filter.tags };
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
        } else {
            let mongoFilter = {};

            if (filter.search) {
                mongoFilter.$or = [
                    { firstName: { $regex: filter.search, $options: 'i' } },
                    { lastName: { $regex: filter.search, $options: 'i' } },
                    { phoneNumber: { $regex: filter.search, $options: 'i' } },
                    { email: { $regex: filter.search, $options: 'i' } }
                ];
            }
            if (filter.tags && filter.tags.length > 0) {
                mongoFilter.tags = { $in: filter.tags };
            }
            if (filter.isActive !== undefined) {
                mongoFilter.isActive = filter.isActive;
            }

            const [persons, count] = await Promise.all([
                Person.find(mongoFilter)
                    .sort({ createdAt: -1 })
                    .skip(options.skip || 0)
                    .limit(options.limit || 50),
                Person.countDocuments(mongoFilter)
            ]);

            return { rows: persons, count };
        }
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
        const Person = this.getModel();
        const results = { created: [], skipped: [] };

        for (const data of dataArray) {
            try {
                const person = await this.create(data);
                results.created.push(person);
            } catch (error) {
                if (error.code === 11000 || error.name === 'SequelizeUniqueConstraintError') {
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

        if (this.dbType === 'mysql') {
            const [person, created] = await Person.findOrCreate({
                where: filter,
                defaults
            });
            return { person, created };
        } else {
            const existing = await Person.findOne(filter);
            if (existing) {
                return { person: existing, created: false };
            }
            const person = await Person.create({ ...filter, ...defaults });
            return { person, created: true };
        }
    }

    async updateById(id, data) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            const person = await Person.findByPk(id);
            if (!person) return null;
            Object.assign(person, data);
            await person.save();
            return person;
        } else {
            return await Person.findByIdAndUpdate(id, data, { new: true });
        }
    }

    async deleteById(id) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            const result = await Person.destroy({ where: { id } });
            return result > 0;
        } else {
            const result = await Person.deleteOne({ _id: id });
            return result.deletedCount > 0;
        }
    }

    async deleteMany(ids) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            return await Person.destroy({ where: { id: ids } });
        } else {
            const result = await Person.deleteMany({ _id: { $in: ids } });
            return result.deletedCount;
        }
    }

    async count(filter = {}) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            return await Person.count({ where: filter });
        } else {
            return await Person.countDocuments(filter);
        }
    }

    async addTags(id, tags) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            const person = await Person.findByPk(id);
            if (!person) return null;
            person.tags = [...new Set([...person.tags, ...tags])];
            await person.save();
            return person;
        } else {
            return await Person.findByIdAndUpdate(
                id,
                { $addToSet: { tags: { $each: tags } } },
                { new: true }
            );
        }
    }

    async removeTags(id, tags) {
        const Person = this.getModel();

        if (this.dbType === 'mysql') {
            const person = await Person.findByPk(id);
            if (!person) return null;
            person.tags = person.tags.filter(t => !tags.includes(t));
            await person.save();
            return person;
        } else {
            return await Person.findByIdAndUpdate(
                id,
                { $pull: { tags: { $in: tags } } },
                { new: true }
            );
        }
    }
}

module.exports = new PersonRepository();
