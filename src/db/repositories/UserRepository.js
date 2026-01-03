const config = require('../../config');

/**
 * User Repository - abstracts database operations for User model
 */
class UserRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.User;
    }

    async findById(id) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            const user = await User.findByPk(id);
            return user ? this._formatSequelize(user) : null;
        } else {
            const user = await User.findById(id);
            return user ? this._formatMongoose(user) : null;
        }
    }

    async findOne(filter) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            const user = await User.findOne({ where: filter });
            return user ? this._formatSequelize(user) : null;
        } else {
            const user = await User.findOne(filter);
            return user ? this._formatMongoose(user) : null;
        }
    }

    async findByApiKey(apiKey) {
        return this.findOne({ apiKey });
    }

    async findAll(filter = {}, options = {}) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            const { rows, count } = await User.findAndCountAll({
                where: filter,
                limit: options.limit || 50,
                offset: options.skip || 0,
                order: [['createdAt', 'DESC']]
            });
            return { rows: rows.map(u => this._formatSequelize(u)), count };
        } else {
            const [users, count] = await Promise.all([
                User.find(filter).sort({ createdAt: -1 }).skip(options.skip || 0).limit(options.limit || 50),
                User.countDocuments(filter)
            ]);
            return { rows: users.map(u => this._formatMongoose(u)), count };
        }
    }

    async findByIdRaw(id) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            return await User.findByPk(id);
        } else {
            return await User.findById(id);
        }
    }

    async findOneRaw(filter) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            return await User.findOne({ where: filter });
        } else {
            return await User.findOne(filter);
        }
    }

    async count(filter = {}) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            return await User.count({ where: filter });
        } else {
            return await User.countDocuments(filter);
        }
    }

    async create(data) {
        const User = this.getModel();
        const user = await User.create(data);
        return this.dbType === 'mysql' ? this._formatSequelize(user) : this._formatMongoose(user);
    }

    async updateById(id, data) {
        const User = this.getModel();
        if (this.dbType === 'mysql') {
            await User.update(data, { where: { id } });
            return true;
        } else {
            await User.updateOne({ _id: id }, data);
            return true;
        }
    }

    async hashPassword(password) {
        const User = this.getModel();
        return await User.hashPassword(password);
    }

    async createDefaultAdmin() {
        const User = this.getModel();
        return await User.createDefaultAdmin();
    }

    async generateApiKey() {
        const User = this.getModel();
        return User.generateApiKey();
    }

    _formatSequelize(user) {
        const obj = user.toJSON();
        return {
            id: obj.id,
            email: obj.email,
            passwordHash: obj.passwordHash,
            name: obj.name,
            role: obj.role,
            isActive: obj.isActive,
            apiKey: obj.apiKey,
            refreshToken: obj.refreshToken,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
            _raw: user
        };
    }

    _formatMongoose(user) {
        const obj = user.toObject();
        return {
            id: obj._id,
            email: obj.email,
            passwordHash: obj.passwordHash,
            name: obj.name,
            role: obj.role,
            isActive: obj.isActive,
            apiKey: obj.apiKey,
            refreshToken: obj.refreshToken,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
            _raw: user
        };
    }
}

module.exports = new UserRepository();

