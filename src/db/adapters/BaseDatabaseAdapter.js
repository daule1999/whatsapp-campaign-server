/**
 * Base Database Adapter Interface
 * All database adapters must implement these methods
 */
class BaseDatabaseAdapter {
    constructor() {
        if (new.target === BaseDatabaseAdapter) {
            throw new Error('BaseDatabaseAdapter cannot be instantiated directly');
        }
    }

    // Connection methods
    async connect() { throw new Error('Method not implemented'); }
    async disconnect() { throw new Error('Method not implemented'); }
    async sync() { throw new Error('Method not implemented'); }

    // CRUD operations
    async findById(model, id, options) { throw new Error('Method not implemented'); }
    async findOne(model, filter, options) { throw new Error('Method not implemented'); }
    async findAll(model, filter, options) { throw new Error('Method not implemented'); }
    async create(model, data) { throw new Error('Method not implemented'); }
    async update(model, id, data) { throw new Error('Method not implemented'); }
    async delete(model, id) { throw new Error('Method not implemented'); }
    async count(model, filter) { throw new Error('Method not implemented'); }

    // Transaction support
    async transaction(callback) { throw new Error('Method not implemented'); }

    // Get raw model for complex queries
    getModel(modelName) { throw new Error('Method not implemented'); }
}

module.exports = BaseDatabaseAdapter;
