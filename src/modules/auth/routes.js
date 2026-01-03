const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { userRepository } = require('../../db/repositories');
const { validate, authenticate, auditLog } = require('../../middleware');

const router = express.Router();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').trim().notEmpty().withMessage('Name is required'),
    ],
    validate,
    auditLog('USER_REGISTER', 'user'),
    async (req, res) => {
        try {
            const { email, password, name } = req.body;

            // Check if user exists
            const existing = await userRepository.findOne({ email });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered',
                    code: 'USER_EXISTS'
                });
            }

            // Hash password
            const passwordHash = await userRepository.hashPassword(password);

            // Create user (first user is admin and active, others inactive)
            const userCount = await userRepository.count();
            const isFirstUser = userCount === 0;
            const role = isFirstUser ? 'admin' : 'user';

            const user = await userRepository.create({
                email,
                passwordHash,
                name,
                role,
                isActive: isFirstUser  // Only first user (admin) is active
            });

            // Generate tokens
            const tokens = generateTokens(user.id, user.email);

            // Save refresh token
            await userRepository.updateById(user.id, { refreshToken: tokens.refreshToken });

            // If not first user, don't give tokens (account pending activation)
            if (!isFirstUser) {
                return res.status(201).json({
                    success: true,
                    message: 'Registration successful. Your account is pending admin approval.',
                    data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: false } }
                });
            }

            res.status(201).json({
                success: true,
                data: {
                    user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive },
                    ...tokens
                }
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ success: false, error: 'Registration failed' });
        }
    }
);

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    validate,
    auditLog('USER_LOGIN', 'user'),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Get user (raw for instance methods)
            const userData = await userRepository.findOne({ email });
            if (!userData) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Verify password using raw model instance
            const validPassword = await userData._raw.checkPassword(password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check if user is active (treat NULL/undefined as active for backwards compatibility)
            if (userData.isActive === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is inactive. Please contact admin for activation.',
                    code: 'ACCOUNT_INACTIVE'
                });
            }

            // Generate tokens
            const tokens = generateTokens(userData.id, userData.email);

            // Save refresh token
            await userRepository.updateById(userData.id, { refreshToken: tokens.refreshToken });

            res.json({
                success: true,
                data: {
                    user: { id: userData.id, email: userData.email, name: userData.name, role: userData.role, isActive: userData.isActive },
                    ...tokens
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Login failed' });
        }
    }
);

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh',
    [body('refreshToken').notEmpty()],
    validate,
    async (req, res) => {
        try {
            const { refreshToken } = req.body;

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, config.jwt.secret);

            // Check if token matches stored token
            const user = await userRepository.findOne({
                refreshToken: refreshToken
            });

            if (!user || user.id.toString() !== decoded.userId.toString()) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token',
                    code: 'INVALID_REFRESH_TOKEN'
                });
            }

            // Generate new tokens
            const tokens = generateTokens(user.id, user.email);

            // Save new refresh token
            await userRepository.updateById(user.id, { refreshToken: tokens.refreshToken });

            res.json({
                success: true,
                data: tokens
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
    }
);

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, auditLog('USER_LOGOUT', 'user'), async (req, res) => {
    try {
        await userRepository.updateById(req.user.id, { refreshToken: null });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
});

/**
 * Generate JWT tokens
 */
function generateTokens(userId, email) {
    const accessToken = jwt.sign(
        { userId, email },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
        { userId, email, type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiry }
    );

    return { accessToken, refreshToken };
}

module.exports = router;
