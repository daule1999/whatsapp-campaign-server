const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Template = sequelize.define('Template', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        waTemplateName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'wa_template_name'
        },
        languageCode: {
            type: DataTypes.STRING(10),
            defaultValue: 'en',
            field: 'language_code'
        },
        bodyPreview: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'body_preview'
        },
        components: {
            type: DataTypes.JSON,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING(20),
            defaultValue: 'MARKETING'
        },
        parameterFormat: {
            type: DataTypes.STRING(20),
            defaultValue: 'POSITIONAL',
            field: 'parameter_format'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending'
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
        tableName: 'templates',
        timestamps: true,
        underscored: true
    });

    return Template;
};
