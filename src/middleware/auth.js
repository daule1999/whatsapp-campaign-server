const jwt = require('jsonwebtoken');
const config = require('../config');
const { userRepository } = require('../db/repositories');

/**
 * Authentication middleware - verifies JWT token
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'AUTH_TOKEN_MISSING'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);

        // Get user from database using repository
        const user = await userRepository.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'AUTH_USER_NOT_FOUND'
            });
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'AUTH_TOKEN_EXPIRED'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
}

/**
 * Role-based authorization middleware
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'AUTH_FORBIDDEN'
            });
        }

        next();
    };
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await userRepository.findById(decoded.userId);
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };
        }
    } catch (error) {
        // Ignore errors for optional auth
    }

    next();
}

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
