const mongoose = require('mongoose');
const config = require('../../config');
const BaseDatabaseAdapter = require('./BaseDatabaseAdapter');

/**
 * MongoDB Adapter using Mongoose
 */
class MongooseAdapter extends BaseDatabaseAdapter {
    constructor() {
        super();
        this.models = null;
        this.connection = null;
    }

    async connect() {
        try {
            await mongoose.connect(config.database.mongoUri);
            this.connection = mongoose.connection;
            console.log('MongoDB connected via MongooseAdapter');
            return true;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        await mongoose.disconnect();
    }

    async sync() {
        // MongoDB doesn't require explicit sync like SQL databases
        return true;
    }

    getModels() {
        if (!this.models) {
            this.models = require('../models/mongoose');
        }
        return this.models;
    }

    getModel(modelName) {
        const models = this.getModels();
        return models[modelName];
    }

    async findById(modelName, id, options = {}) {
        const Model = this.getModel(modelName);
        let query = Model.findById(id);

        if (options.include) {
            options.include.forEach(inc => {
                query = query.populate(inc.as || inc.model);
            });
        }

        return await query.exec();
    }

    async findOne(modelName, filter, options = {}) {
        const Model = this.getModel(modelName);
        let query = Model.findOne(filter);

        if (options.include) {
            options.include.forEach(inc => {
                query = query.populate(inc.as || inc.model);
            });
        }

        return await query.exec();
    }

    async findAll(modelName, filter = {}, options = {}) {
        const Model = this.getModel(modelName);
        let query = Model.find(filter);

        if (options.sort) {
            query = query.sort(options.sort);
        }
        if (options.skip) {
            query = query.skip(options.skip);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.include) {
            options.include.forEach(inc => {
                query = query.populate(inc.as || inc.model);
            });
        }

        const results = await query.exec();
        const count = await Model.countDocuments(filter);

        return { rows: results, count };
    }

    async create(modelName, data) {
        const Model = this.getModel(modelName);
        return await Model.create(data);
    }

    async update(modelName, id, data) {
        const Model = this.getModel(modelName);
        return await Model.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(modelName, id) {
        const Model = this.getModel(modelName);
        return await Model.findByIdAndDelete(id);
    }

    async count(modelName, filter = {}) {
        const Model = this.getModel(modelName);
        return await Model.countDocuments(filter);
    }

    async transaction(callback) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const result = await callback(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Helper: Transform MongoDB document to plain object with id
    toPlainObject(doc) {
        if (!doc) return null;
        const obj = doc.toObject ? doc.toObject() : { ...doc };
        if (obj._id) {
            obj.id = obj._id.toString();
        }
        return obj;
    }
}

module.exports = MongooseAdapter;
