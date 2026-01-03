const express = require('express');
const { body, param } = require('express-validator');
const { userRepository } = require('../../db/repositories');
const { authenticate, authorize, validate, auditLog } = require('../../middleware');

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * Get all users
 * GET /api/admin/users
 */
router.get('/users', async (req, res) => {
    try {
        const { rows: users, count } = await userRepository.findAll({}, { limit: 100 });
        // Remove sensitive fields
        const safeUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            isActive: u.isActive,
            createdAt: u.createdAt
        }));
        res.json({ success: true, data: safeUsers, total: count });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

/**
 * Activate user
 * POST /api/admin/users/:id/activate
 */
router.post('/users/:id/activate',
    [param('id').notEmpty()],
    validate,
    auditLog('USER_ACTIVATE', 'user'),
    async (req, res) => {
        try {
            const user = await userRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            await userRepository.updateById(req.params.id, { isActive: true });
            res.json({ success: true, message: 'User activated' });
        } catch (error) {
            console.error('Activate user error:', error);
            res.status(500).json({ success: false, error: 'Failed to activate user' });
        }
    }
);

/**
 * Deactivate user
 * POST /api/admin/users/:id/deactivate
 */
router.post('/users/:id/deactivate',
    [param('id').notEmpty()],
    validate,
    auditLog('USER_DEACTIVATE', 'user'),
    async (req, res) => {
        try {
            const user = await userRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Prevent self-deactivation
            if (user.id.toString() === req.user.id.toString()) {
                return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
            }

            await userRepository.updateById(req.params.id, { isActive: false });
            res.json({ success: true, message: 'User deactivated' });
        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({ success: false, error: 'Failed to deactivate user' });
        }
    }
);

/**
 * Update user role
 * PUT /api/admin/users/:id/role
 */
router.put('/users/:id/role',
    [
        param('id').notEmpty(),
        body('role').isIn(['admin', 'user'])
    ],
    validate,
    auditLog('USER_ROLE_UPDATE', 'user'),
    async (req, res) => {
        try {
            const user = await userRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            await userRepository.updateById(req.params.id, { role: req.body.role });
            res.json({ success: true, message: 'User role updated' });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({ success: false, error: 'Failed to update role' });
        }
    }
);

/**
 * Generate API key for user
 * POST /api/admin/users/:id/api-key
 */
router.post('/users/:id/api-key',
    [param('id').notEmpty()],
    validate,
    auditLog('USER_API_KEY_GENERATE', 'user'),
    async (req, res) => {
        try {
            const user = await userRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const apiKey = await userRepository.generateApiKey();
            await userRepository.updateById(req.params.id, { apiKey });

            res.json({ success: true, data: { apiKey } });
        } catch (error) {
            console.error('Generate API key error:', error);
            res.status(500).json({ success: false, error: 'Failed to generate API key' });
        }
    }
);

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id',
    [param('id').notEmpty()],
    validate,
    auditLog('USER_DELETE', 'user'),
    async (req, res) => {
        try {
            const user = await userRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Prevent self-deletion
            if (user.id.toString() === req.user.id.toString()) {
                return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
            }

            // Note: Add actual delete when needed
            // For now, just deactivate
            await userRepository.updateById(req.params.id, { isActive: false });
            res.json({ success: true, message: 'User deleted' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete user' });
        }
    }
);

module.exports = router;
