const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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

    return User;
};
