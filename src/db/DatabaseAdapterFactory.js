const config = require('../config');

/**
 * Database Adapter Factory
 * Creates the appropriate database adapter based on configuration
 */
class DatabaseAdapterFactory {
    static instance = null;
    static adapter = null;

    /**
     * Get the database adapter singleton
     * @returns {BaseDatabaseAdapter} The database adapter instance
     */
    static getAdapter() {
        if (!DatabaseAdapterFactory.adapter) {
            const dbType = config.database.type;

            switch (dbType) {
                case 'mysql':
                    const SequelizeAdapter = require('./adapters/SequelizeAdapter');
                    DatabaseAdapterFactory.adapter = new SequelizeAdapter();
                    break;
                case 'mongodb':
                default:
                    const MongooseAdapter = require('./adapters/MongooseAdapter');
                    DatabaseAdapterFactory.adapter = new MongooseAdapter();
                    break;
            }

            console.log(`DatabaseAdapterFactory: Using ${dbType} adapter`);
        }

        return DatabaseAdapterFactory.adapter;
    }

    /**
     * Get the database type from config
     * @returns {string} 'mysql' or 'mongodb'
     */
    static getDatabaseType() {
        return config.database.type;
    }

    /**
     * Reset the adapter (useful for testing)
     */
    static reset() {
        DatabaseAdapterFactory.adapter = null;
    }
}

module.exports = DatabaseAdapterFactory;
