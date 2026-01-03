const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Person = sequelize.define('Person', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Basic Info
        firstName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'first_name'
        },
        lastName: {
            type: DataTypes.STRING(255),
            defaultValue: '',
            field: 'last_name'
        },
        // Phone Numbers
        phoneNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'phone_number'
        },
        phoneCountryCode: {
            type: DataTypes.STRING(10),
            defaultValue: '91',
            field: 'phone_country_code'
        },
        // WhatsApp
        whatsappNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'whatsapp_number'
        },
        whatsappCountryCode: {
            type: DataTypes.STRING(10),
            allowNull: true,
            field: 'whatsapp_country_code'
        },
        whatsappSameAsPhone: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'whatsapp_same_as_phone'
        },
        // Email
        email: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Additional Details
        company: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        designation: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Tags (stored as JSON array)
        tags: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        // Source tracking
        source: {
            type: DataTypes.ENUM('manual', 'import', 'api', 'webhook', 'form'),
            defaultValue: 'manual'
        },
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        // Custom fields and metadata
        customFields: {
            type: DataTypes.JSON,
            defaultValue: {},
            field: 'custom_fields'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'persons',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['phone_number', 'phone_country_code'] }
        ]
    });

    // Virtual for full name
    Person.prototype.getName = function () {
        return `${this.firstName} ${this.lastName}`.trim();
    };

    // Virtual for formatted phone
    Person.prototype.getFormattedPhone = function () {
        return `+${this.phoneCountryCode}${this.phoneNumber}`;
    };

    // Virtual for WhatsApp number
    Person.prototype.getWhatsApp = function () {
        if (this.whatsappSameAsPhone) {
            return `+${this.phoneCountryCode}${this.phoneNumber}`;
        }
        return this.whatsappNumber ? `+${this.whatsappCountryCode || this.phoneCountryCode}${this.whatsappNumber}` : null;
    };

    return Person;
};
