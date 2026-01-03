const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ErrorLog = sequelize.define('ErrorLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        entityType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'entity_type', // e.g., 'campaign', 'whatsapp_api', 'system'
            defaultValue: 'system'
        },
        entityId: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'entity_id' // e.g., Campaign ID, Person ID
        },
        errorCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'error_code'
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'error_message'
        },
        errorDetails: {
            type: DataTypes.TEXT, // Store JSON string of raw details
            allowNull: true,
            field: 'error_details'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'error_logs',
        timestamps: true,
        underscored: true
    });

    return ErrorLog;
};
