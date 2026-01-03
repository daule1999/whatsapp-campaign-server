const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: false  // New users are inactive by default
    },
    apiKey: {
        type: String,
        default: null,
        unique: true,
        sparse: true
    },
    apiKeyHash: {
        type: String,
        default: null
    },
    refreshToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Instance method to check password
userSchema.methods.checkPassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Static method to generate API key
userSchema.statics.generateApiKey = function () {
    return crypto.randomBytes(32).toString('hex');
};

// Static method to create default admin
userSchema.statics.createDefaultAdmin = async function () {
    const existingAdmin = await this.findOne({ email: 'admin@admin.com' });
    if (existingAdmin) {
        console.log('Default admin already exists');
        return existingAdmin;
    }

    const passwordHash = await this.hashPassword('admin123');
    const apiKey = this.generateApiKey();

    const admin = await this.create({
        email: 'admin@admin.com',
        passwordHash,
        name: 'Admin',
        role: 'admin',
        isActive: true,  // Admin is active
        apiKey
    });

    console.log('Default admin created: admin@admin.com / admin123');
    console.log('Admin API Key:', apiKey);
    return admin;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

