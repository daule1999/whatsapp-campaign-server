const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id'
        },
        userEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'user_email'
        },
        action: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        entityType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'entity_type'
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'entity_id'
        },
        changes: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        underscored: true,
        updatedAt: false // Only createdAt for audit logs
    });

    return AuditLog;
};
