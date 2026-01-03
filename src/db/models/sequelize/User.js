const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash'
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('admin', 'user'),
            defaultValue: 'user'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        apiKey: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'api_key'
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'refresh_token'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true
    });

    // Instance method to check password
    User.prototype.checkPassword = async function (password) {
        return bcrypt.compare(password, this.passwordHash);
    };

    // Static method to hash password
    User.hashPassword = async function (password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    };

    // Static method to generate API key
    User.generateApiKey = function () {
        return `wca_${uuidv4().replace(/-/g, '')}`;
    };

    // Static method to create default admin
    User.createDefaultAdmin = async function () {
        const existingAdmin = await User.findOne({ where: { email: 'admin@admin.com' } });
        if (!existingAdmin) {
            const passwordHash = await User.hashPassword('admin123');
            await User.create({
                email: 'admin@admin.com',
                name: 'Admin',
                passwordHash,
                role: 'admin',
                isActive: true,
                apiKey: User.generateApiKey()
            });
            console.log('✓ Default admin created: admin@admin.com / admin123');
        }
    };

    return User;
};
