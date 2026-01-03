const { auditLogRepository } = require('../db/repositories');

/**
 * Audit logging middleware - logs all API actions
 */
function auditLog(action, entityType) {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to capture response
        res.json = async (body) => {
            // Log the action after response
            if (res.statusCode < 400) {
                await logAudit(req, action, entityType, body);
            }
            return originalJson(body);
        };

        next();
    };
}

/**
 * Log audit entry to database using Repository
 */
async function logAudit(req, action, entityType, responseBody = null) {
    try {
        const userId = req.user?.id || null;
        const userEmail = req.user?.email || 'anonymous';
        const entityId = req.params?.id || responseBody?.data?._id || responseBody?.data?.id || null;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Prepare changes object (sanitize sensitive data)
        let changes = null;
        if (req.body && Object.keys(req.body).length > 0) {
            const sanitized = { ...req.body };
            delete sanitized.password;
            delete sanitized.password_hash;
            delete sanitized.token;
            changes = sanitized;
        }

        await auditLogRepository.create({
            userId,
            userEmail,
            action,
            entityType,
            entityId,
            changes,
            ipAddress,
            userAgent
        });
    } catch (error) {
        console.error('Audit log error:', error.message);
    }
}

/**
 * Manual audit log function for use in services
 */
async function createAuditLog(userId, userEmail, action, entityType, entityId, changes = null, ipAddress = null) {
    try {
        await auditLogRepository.create({
            userId,
            userEmail,
            action,
            entityType,
            entityId,
            changes,
            ipAddress
        });
    } catch (error) {
        console.error('Audit log error:', error.message);
    }
}

module.exports = {
    auditLog,
    logAudit,
    createAuditLog
};
