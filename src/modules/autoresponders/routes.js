const express = require('express');
const { autoresponderRepository } = require('../../db/repositories');
const { authenticate, authorize } = require('../../middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all autoresponders
 * GET /api/autoresponders
 */
router.get('/', async (req, res) => {
    try {
        const autoresponders = await autoresponderRepository.findAll();
        res.json({ success: true, data: autoresponders });
    } catch (error) {
        console.error('Get autoresponders error:', error);
        res.status(500).json({ success: false, error: 'Failed to get autoresponders' });
    }
});

/**
 * Get single autoresponder
 * GET /api/autoresponders/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const autoresponder = await autoresponderRepository.findById(req.params.id);
        if (!autoresponder) {
            return res.status(404).json({ success: false, error: 'Autoresponder not found' });
        }
        res.json({ success: true, data: autoresponder });
    } catch (error) {
        console.error('Get autoresponder error:', error);
        res.status(500).json({ success: false, error: 'Failed to get autoresponder' });
    }
});

/**
 * Create autoresponder
 * POST /api/autoresponders
 */
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const { name, triggerKeywords, welcomeMessage, menuOptions, responses, isActive } = req.body;

        if (!name || !triggerKeywords || !welcomeMessage) {
            return res.status(400).json({
                success: false,
                error: 'Name, triggerKeywords, and welcomeMessage are required'
            });
        }

        const autoresponder = await autoresponderRepository.create({
            name,
            triggerKeywords,
            welcomeMessage,
            menuOptions: menuOptions || [],
            responses: responses || {},
            isActive: isActive !== false,
            createdBy: req.user.userId
        });

        res.status(201).json({ success: true, data: autoresponder });
    } catch (error) {
        console.error('Create autoresponder error:', error);
        res.status(500).json({ success: false, error: 'Failed to create autoresponder' });
    }
});

/**
 * Update autoresponder
 * PUT /api/autoresponders/:id
 */
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { name, triggerKeywords, welcomeMessage, menuOptions, responses, isActive } = req.body;

        const updated = await autoresponderRepository.updateById(req.params.id, {
            name,
            triggerKeywords,
            welcomeMessage,
            menuOptions,
            responses,
            isActive
        });

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Autoresponder not found' });
        }

        const autoresponder = await autoresponderRepository.findById(req.params.id);
        res.json({ success: true, data: autoresponder });
    } catch (error) {
        console.error('Update autoresponder error:', error);
        res.status(500).json({ success: false, error: 'Failed to update autoresponder' });
    }
});

/**
 * Delete autoresponder
 * DELETE /api/autoresponders/:id
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const deleted = await autoresponderRepository.deleteById(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Autoresponder not found' });
        }
        res.json({ success: true, message: 'Autoresponder deleted' });
    } catch (error) {
        console.error('Delete autoresponder error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete autoresponder' });
    }
});

/**
 * Toggle autoresponder active status
 * PATCH /api/autoresponders/:id/toggle
 */
router.patch('/:id/toggle', authorize('admin'), async (req, res) => {
    try {
        const autoresponder = await autoresponderRepository.findById(req.params.id);
        if (!autoresponder) {
            return res.status(404).json({ success: false, error: 'Autoresponder not found' });
        }

        await autoresponderRepository.updateById(req.params.id, {
            isActive: !autoresponder.isActive
        });

        const updated = await autoresponderRepository.findById(req.params.id);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Toggle autoresponder error:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle autoresponder' });
    }
});

module.exports = router;
