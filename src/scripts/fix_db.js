require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config');

async function fixDatabase() {
    console.log('Starting database fix...');

    // Create Sequelize instance
    const sequelize = new Sequelize(
        config.database.mysql.name,
        config.database.mysql.user,
        config.database.mysql.password,
        {
            host: config.database.mysql.host,
            port: config.database.mysql.port,
            dialect: 'mysql',
            dialectOptions: {
                ssl: {
                    minVersion: 'TLSv1.2',
                    rejectUnauthorized: true
                }
            }
        }
    );

    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Drop campaign_contacts table
        console.log('Dropping table campaign_contacts...');
        await sequelize.query('DROP TABLE IF EXISTS campaign_contacts;');
        console.log('Table dropped.');

        // Re-sync database to recreate table with correct constraints
        console.log('Re-syncing database to recreate table...');

        // Load models
        const models = require('../db/models/sequelize');

        // Sync models
        await models.sequelize.sync();
        console.log('Database synced. campaign_contacts table recreated.');

        console.log('DONE. Please restart your backend server.');
    } catch (error) {
        console.error('Error fixing database:', error);
    } finally {
        await sequelize.close();
    }
}

fixDatabase();
