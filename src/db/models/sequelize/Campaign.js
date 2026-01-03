const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Campaign = sequelize.define('Campaign', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        templateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'template_id',
            references: {
                model: 'templates',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('draft', 'scheduled', 'running', 'completed', 'failed'),
            defaultValue: 'draft'
        },
        totalContacts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_contacts'
        },
        sentCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'sent_count'
        },
        failedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'failed_count'
        },
        scheduledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'scheduled_at'
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'started_at'
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'campaigns',
        timestamps: true,
        underscored: true
    });

    return Campaign;
};
