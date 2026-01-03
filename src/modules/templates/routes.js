const express = require('express');
const { body, query } = require('express-validator');
const { templateRepository } = require('../../db/repositories');
const { authenticate, validate, auditLog } = require('../../middleware');
const whatsapp = require('../../services/whatsapp');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all templates
 * GET /api/templates
 */
router.get('/',
    [query('status').optional().isIn(['active', 'inactive'])],
    validate,
    async (req, res) => {
        try {
            const filter = {};
            if (req.query.status) filter.status = req.query.status;

            const templates = await templateRepository.findAll(filter);

            res.json({ success: true, data: templates });
        } catch (error) {
            console.error('Get templates error:', error);
            res.status(500).json({ success: false, error: 'Failed to get templates' });
        }
    }
);

/**
 * Create template
 * POST /api/templates
 */
router.post('/',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('wa_template_name').trim().notEmpty().withMessage('WhatsApp template name is required'),
        body('category').optional().isIn(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
        body('language_code').optional().isLength({ min: 2, max: 5 }),
        body('body_preview').optional().isString(),
        body('components').optional().isArray(),
    ],
    validate,
    auditLog('TEMPLATE_CREATE', 'template'),
    async (req, res) => {
        try {
            const { name, wa_template_name, category, language_code, body_preview, components } = req.body;

            // 1. Create on WhatsApp
            const apiResult = await whatsapp.createTemplate({
                name: wa_template_name,
                category: category || 'MARKETING',
                allow_category_change: true,
                language: { code: language_code || 'en' },
                components: components || []
            });

            if (!apiResult.success) {
                return res.status(400).json({
                    success: false,
                    error: `WhatsApp API Error: ${apiResult.error}`,
                    details: apiResult.rawError
                });
            }

            // 2. Create in Database
            const template = await templateRepository.create({
                name,
                waTemplateName: wa_template_name,
                category: category || 'MARKETING',
                languageCode: language_code || 'en',
                bodyPreview: body_preview || '',
                components: components || [],
                status: apiResult.data.status ? apiResult.data.status.toLowerCase() : 'pending',
                createdBy: req.user.id
            });

            res.status(201).json({ success: true, data: template });
        } catch (error) {
            console.error('Create template error:', error);
            res.status(500).json({ success: false, error: 'Failed to create template' });
        }
    }
);

/**
 * Sync templates from WhatsApp
 * POST /api/templates/sync
 */
router.post('/sync',
    auditLog('TEMPLATE_SYNC', 'template'),
    async (req, res) => {
        try {
            // 1. Fetch from WhatsApp
            const result = await whatsapp.getTemplates();

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    error: `WhatsApp API Error: ${result.error}`,
                    details: result.rawError
                });
            }

            const waTemplates = result.templates;
            const synced = [];
            let created = 0;
            let updated = 0;

            // 2. Sync with DB
            for (const waTmpl of waTemplates) {
                // Find by name + language (composite key logic usually, but name is unique per language usually? No, name is unique per account usually, but can look up by name)
                // WhatsApp enforces unique names.

                let template = await templateRepository.findOne({ waTemplateName: waTmpl.name });

                const templateData = {
                    name: waTmpl.name,
                    waTemplateName: waTmpl.name,
                    category: waTmpl.category,
                    languageCode: waTmpl.language,
                    status: waTmpl.status.toLowerCase(),
                    components: waTmpl.components,
                    parameterFormat: waTmpl.parameter_format || 'POSITIONAL',
                    // id is usually stored too, but we use our own ID. maybe store wa_id in metadata?
                };

                if (template) {
                    await templateRepository.updateById(template.id, templateData);
                    updated++;
                } else {
                    template = await templateRepository.create({
                        ...templateData,
                        createdBy: req.user.id // Sync initiated by this user
                    });
                    created++;
                }
                synced.push(template);
            }

            res.json({
                success: true,
                message: `Synced ${waTemplates.length} templates`,
                data: {
                    total: waTemplates.length,
                    created,
                    updated,
                    templates: synced
                }
            });
        } catch (error) {
            console.error('Sync templates error:', error);
            res.status(500).json({ success: false, error: 'Failed to sync templates' });
        }
    }
);

/**
 * Get template by ID
 * GET /api/templates/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const template = await templateRepository.findById(req.params.id);

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ success: false, error: 'Failed to get template' });
    }
});

/**
 * Update template
 * PUT /api/templates/:id
 */
router.put('/:id',
    [
        body('name').optional().trim().notEmpty(),
        body('wa_template_name').optional().trim().notEmpty(),
        body('language_code').optional().isLength({ min: 2, max: 5 }),
        body('body_preview').optional().isString(),
        body('components').optional().isArray(),
        body('status').optional().isIn(['active', 'inactive']),
    ],
    validate,
    auditLog('TEMPLATE_UPDATE', 'template'),
    async (req, res) => {
        try {
            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.wa_template_name !== undefined) updates.waTemplateName = req.body.wa_template_name;
            if (req.body.language_code !== undefined) updates.languageCode = req.body.language_code;
            if (req.body.body_preview !== undefined) updates.bodyPreview = req.body.body_preview;
            if (req.body.components !== undefined) updates.components = req.body.components;
            if (req.body.status !== undefined) updates.status = req.body.status;

            const template = await templateRepository.updateById(req.params.id, updates);

            if (!template) {
                return res.status(404).json({ success: false, error: 'Template not found' });
            }

            res.json({ success: true, message: 'Template updated', data: template });
        } catch (error) {
            console.error('Update template error:', error);
            res.status(500).json({ success: false, error: 'Failed to update template' });
        }
    }
);

/**
 * Delete template
 * DELETE /api/templates/:id
 */
router.delete('/:id',
    auditLog('TEMPLATE_DELETE', 'template'),
    async (req, res) => {
        try {
            const deleted = await templateRepository.deleteById(req.params.id);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Template not found' });
            }

            res.json({ success: true, message: 'Template deleted' });
        } catch (error) {
            console.error('Delete template error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete template' });
        }
    }
);

module.exports = router;
