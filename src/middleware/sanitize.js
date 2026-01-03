/**
 * Input Sanitization Middleware
 * Strips HTML tags and dangerous characters from string inputs
 */

/**
 * Strip HTML tags from a string
 */
function stripHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .trim();
}

/**
 * Deep sanitize an object's string values
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return stripHtml(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeInput(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
}

/**
 * Validate that a string doesn't contain script tags
 */
function containsScript(str) {
    if (typeof str !== 'string') return false;
    return /<script/i.test(str) || /javascript:/i.test(str);
}

module.exports = {
    stripHtml,
    sanitizeObject,
    sanitizeInput,
    containsScript
};
