/**
 * User Repository - MySQL only
 */
class UserRepository {
    getModel() {
        const { User } = require('../models/sequelize');
        return User;
    }

    async findById(id) {
        const User = this.getModel();
        const user = await User.findByPk(id);
        return user ? this._format(user) : null;
    }

    async findOne(filter) {
        const User = this.getModel();
        const user = await User.findOne({ where: filter });
        return user ? this._format(user) : null;
    }

    async findByApiKey(apiKey) {
        return this.findOne({ apiKey });
    }

    async findByEmail(email) {
        return this.findOne({ email });
    }

    async findAll(filter = {}, options = {}) {
        const User = this.getModel();
        const { rows, count } = await User.findAndCountAll({
            where: filter,
            limit: options.limit || 50,
            offset: options.skip || 0,
            order: [['createdAt', 'DESC']]
        });
        return { rows: rows.map(u => this._format(u)), count };
    }

    async findByIdRaw(id) {
        const User = this.getModel();
        return await User.findByPk(id);
    }

    async findOneRaw(filter) {
        const User = this.getModel();
        return await User.findOne({ where: filter });
    }

    async count(filter = {}) {
        const User = this.getModel();
        return await User.count({ where: filter });
    }

    async create(data) {
        const User = this.getModel();
        const user = await User.create(data);
        return this._format(user);
    }

    async updateById(id, data) {
        const User = this.getModel();
        await User.update(data, { where: { id } });
        return true;
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

    _format(user) {
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
}

module.exports = new UserRepository();
