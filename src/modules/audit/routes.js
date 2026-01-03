const express = require('express');
const { query } = require('express-validator');
const { auditLogRepository } = require('../../db/repositories');
const { authenticate, authorize, validate } = require('../../middleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * Get audit logs with pagination
 * GET /api/audit
 */
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 1000 }),
        query('user_id').optional(),
        query('action').optional().isString(),
        query('entity_type').optional().isString(),
    ],
    validate,
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const filter = {};
            if (req.query.user_id) filter.userId = req.query.user_id;
            if (req.query.entity_type) filter.entityType = req.query.entity_type;

            const { logs, count } = await auditLogRepository.findAll(filter, { limit, skip });

            res.json({
                success: true,
                data: logs,
                pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
            });
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({ success: false, error: 'Failed to get audit logs' });
        }
    }
);

module.exports = router;
