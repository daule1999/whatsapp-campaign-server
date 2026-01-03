require('dotenv').config();
const { sequelize, testConnection } = require('./connection');
require('./models'); // Load all models with associations

async function syncDatabase() {
    try {
        const connected = await testConnection();
        if (!connected) {
            console.error('Cannot sync - database connection failed');
            process.exit(1);
        }

        // Sync all models (alter: true modifies existing tables)
        await sequelize.sync({ alter: true });
        console.log('✓ Database tables synchronized');

        process.exit(0);
    } catch (error) {
        console.error('Sync error:', error);
        process.exit(1);
    }
}

syncDatabase();
