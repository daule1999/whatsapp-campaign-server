const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    userEmail: {
        type: String,
        default: null
    },
    action: {
        type: String,
        required: true
    },
    entityType: {
        type: String,
        default: null
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: true, updatedAt: false } // Only createdAt
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
