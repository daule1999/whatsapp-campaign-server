const { Sequelize } = require('sequelize');
const config = require('../../../config');

// Create Sequelize instance
const sequelize = new Sequelize(
    config.database.mysql.name,
    config.database.mysql.user,
    config.database.mysql.password,
    {
        host: config.database.mysql.host,
        port: config.database.mysql.port,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
        },
        // SSL required for TiDB Serverless / PlanetScale / cloud MySQL
        dialectOptions: {
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        }
    }
);

// Initialize models
const User = require('./User')(sequelize);
const Template = require('./Template')(sequelize);
const Contact = require('./Contact')(sequelize);
const Campaign = require('./Campaign')(sequelize);
const CampaignContact = require('./CampaignContact')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// Define associations
User.hasMany(Template, { foreignKey: 'createdBy', as: 'templates' });
User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'campaigns' });

Template.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Template.hasMany(Campaign, { foreignKey: 'templateId', as: 'campaigns' });

Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Campaign.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });
Campaign.belongsToMany(Contact, {
    through: CampaignContact,
    foreignKey: 'campaignId',
    otherKey: 'contactId',
    as: 'contacts'
});

Contact.belongsToMany(Campaign, {
    through: CampaignContact,
    foreignKey: 'contactId',
    otherKey: 'campaignId',
    as: 'campaigns'
});

CampaignContact.belongsTo(Campaign, { foreignKey: 'campaignId' });
CampaignContact.belongsTo(Contact, { foreignKey: 'contactId' });

module.exports = {
    sequelize,
    User,
    Template,
    Contact,
    Campaign,
    CampaignContact,
    AuditLog
};
