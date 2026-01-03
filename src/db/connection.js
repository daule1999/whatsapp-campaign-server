const config = require('../config');

let sequelize = null;

/**
 * Connect to MySQL database
 */
async function connectDB() {
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
 * Sync database tables
 */
async function syncDB() {
    if (!sequelize) {
        console.error('Database not connected');
        return;
    }

    // Create tables if not exist (without alter to avoid TiDB issues)
    await sequelize.sync();
    console.log('✓ Database tables synchronized');
}

/**
 * Get Sequelize instance
 */
function getSequelize() {
    if (!sequelize) {
        const { sequelize: sq } = require('./models/sequelize');
        return sq;
    }
    return sequelize;
}

module.exports = {
    connectDB,
    syncDB,
    getSequelize
};
