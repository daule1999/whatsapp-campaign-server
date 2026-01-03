const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Autoresponder = sequelize.define('Autoresponder', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        triggerKeywords: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
            field: 'trigger_keywords',
            comment: 'Array of keywords that trigger this autoresponder, e.g. ["hi", "hello", "help"]'
        },
        welcomeMessage: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'welcome_message',
            comment: 'Initial message sent when keyword is triggered'
        },
        menuOptions: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            field: 'menu_options',
            comment: 'Array of menu buttons, e.g. [{id: "images", title: "Get Images"}]'
        },
        responses: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
            comment: 'Map of action responses, e.g. {images: {type: "image", content: "..."}}'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
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
        tableName: 'autoresponders',
        timestamps: true,
        underscored: true
    });

    return Autoresponder;
};
