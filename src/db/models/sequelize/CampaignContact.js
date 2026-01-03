const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CampaignContact = sequelize.define('CampaignContact', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        campaignId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campaign_id',
            references: {
                model: 'campaigns',
                key: 'id'
            }
        },
        contactId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'contact_id',
            references: {
                model: 'contacts',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
            defaultValue: 'pending'
        },
        messageId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'message_id'
        },
        error: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'sent_at'
        }
    }, {
        tableName: 'campaign_contacts',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['campaign_id', 'contact_id']
            }
        ]
    });

    return CampaignContact;
};
