const mongoose = require('mongoose');
const config = require('../config');

let sequelize = null;

/**
 * Connect to the configured database
 */
async function connectDB() {
    if (config.database.type === 'mysql') {
        return connectMySQL();
    } else {
        return connectMongoDB();
    }
}

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
    try {
        await mongoose.connect(config.database.mongoUri);
        console.log('✓ MongoDB connected');
        return true;
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        return false;
    }
}

/**
 * Connect to MySQL
 */
async function connectMySQL() {
    try {
        const { sequelize: sq } = require('./models/sequelize');
        sequelize = sq;
        await sequelize.authenticate();
        console.log('✓ MySQL database connected');
        return true;
    } catch (error) {
        console.error('✗ MySQL connection failed:', error.message);
        return false;
    }
}

/**
 * Sync database (for MySQL/Sequelize)
 */
async function syncDB() {
    if (config.database.type === 'mysql' && sequelize) {
        await sequelize.sync({ alter: true });
        console.log('✓ Database tables synchronized');
    }
    // MongoDB doesn't need sync
}

/**
 * Get the database type
 */
function getDbType() {
    return config.database.type;
}

/**
 * Get Sequelize instance (for MySQL)
 */
function getSequelize() {
    if (config.database.type === 'mysql') {
        const { sequelize: sq } = require('./models/sequelize');
        return sq;
    }
    return null;
}

module.exports = {
    mongoose,
    connectDB,
    syncDB,
    getDbType,
    getSequelize
};
