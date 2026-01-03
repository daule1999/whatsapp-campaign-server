const { Sequelize } = require('sequelize');
const config = require('../../config');
const BaseDatabaseAdapter = require('./BaseDatabaseAdapter');

/**
 * MySQL Adapter using Sequelize
 */
class SequelizeAdapter extends BaseDatabaseAdapter {
    constructor() {
        super();
        this.sequelize = null;
        this.models = null;
    }

    async connect() {
        try {
            const dbConfig = config.database.mysql;
            this.sequelize = new Sequelize(dbConfig.name, dbConfig.user, dbConfig.password, {
                host: dbConfig.host,
                port: dbConfig.port,
                dialect: 'mysql',
                logging: false
            });
            await this.sequelize.authenticate();
            console.log('MySQL connected via SequelizeAdapter');
            return true;
        } catch (error) {
            console.error('MySQL connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.sequelize) {
            await this.sequelize.close();
        }
    }

    async sync(options = {}) {
        if (this.sequelize) {
            await this.sequelize.sync(options);
        }
    }

    getModels() {
        if (!this.models) {
            this.models = require('../models/sequelize');
        }
        return this.models;
    }

    getModel(modelName) {
        const models = this.getModels();
        return models[modelName];
    }

    async findById(modelName, id, options = {}) {
        const Model = this.getModel(modelName);
        return await Model.findByPk(id, options);
    }

    async findOne(modelName, filter, options = {}) {
        const Model = this.getModel(modelName);
        return await Model.findOne({ where: filter, ...options });
    }

    async findAll(modelName, filter = {}, options = {}) {
        const Model = this.getModel(modelName);

        const queryOptions = {
            where: filter,
            ...options
        };

        if (options.sort) {
            // Convert { field: -1 } to [['field', 'DESC']]
            queryOptions.order = Object.entries(options.sort).map(([field, dir]) =>
                [field, dir === -1 ? 'DESC' : 'ASC']
            );
            delete queryOptions.sort;
        }

        if (options.skip !== undefined) {
            queryOptions.offset = options.skip;
            delete queryOptions.skip;
        }

        const { count, rows } = await Model.findAndCountAll(queryOptions);
        return { rows, count };
    }

    async create(modelName, data) {
        const Model = this.getModel(modelName);
        return await Model.create(data);
    }

    async update(modelName, id, data) {
        const Model = this.getModel(modelName);
        const instance = await Model.findByPk(id);
        if (!instance) return null;
        return await instance.update(data);
    }

    async delete(modelName, id) {
        const Model = this.getModel(modelName);
        const instance = await Model.findByPk(id);
        if (!instance) return null;
        await instance.destroy();
        return instance;
    }

    async count(modelName, filter = {}) {
        const Model = this.getModel(modelName);
        return await Model.count({ where: filter });
    }

    async transaction(callback) {
        return await this.sequelize.transaction(async (t) => {
            return await callback(t);
        });
    }

    // Helper: Get Sequelize instance for raw queries
    getSequelize() {
        return this.sequelize;
    }
}

module.exports = SequelizeAdapter;
