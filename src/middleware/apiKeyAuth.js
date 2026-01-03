const crypto = require('crypto');
const { userRepository } = require('../db/repositories');

/**
 * API Key Authentication Middleware
 * Expects header: X-API-Key
 */
const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key required. Include X-API-Key header.'
        });
    }

    try {
        // Find user by API key
        const user = await userRepository.findByApiKey(apiKey);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        // Attach user to request
        req.user = user;
        req.apiKey = apiKey;
        next();
    } catch (error) {
        console.error('API key auth error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};

/**
 * Generate a new API key
 * @returns {string} 32-character hex API key
 */
const generateApiKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash an API key for storage
 * @param {string} apiKey 
 * @returns {string} Hashed API key
 */
const hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

module.exports = { apiKeyAuth, generateApiKey, hashApiKey };
