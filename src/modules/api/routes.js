const express = require('express');
const { body, param, query } = require('express-validator');
const {
    personRepository,
    templateRepository,
    campaignRepository,
    campaignContactRepository,
    contactRepository
} = require('../../db/repositories');
const { apiKeyAuth } = require('../../middleware/apiKeyAuth');
const { validate } = require('../../middleware');
const { NotificationFactory } = require('../../services/notifications');

const router = express.Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// =============================================================================
// PERSONS/CONTACTS ENDPOINTS
// =============================================================================

/**
 * Create a new person
 * POST /api/v1/persons
 */
router.post('/persons',
    [
        body('firstName').notEmpty().trim(),
        body('lastName').optional().trim(),
        body('phoneNumber').notEmpty(),
        body('phoneCountryCode').optional().default('91'),
        body('email').optional().isEmail(),
        body('whatsappNumber').optional(),
        body('whatsappCountryCode').optional(),
        body('whatsappSameAsPhone').optional().isBoolean(),
        body('tags').optional().isArray(),
    ],
    validate,
    async (req, res) => {
        try {
            const person = await personRepository.create(req.body);
            res.status(201).json({ success: true, data: person });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ success: false, error: 'Person with this phone already exists' });
            }
            console.error('Create person error:', error);
            res.status(500).json({ success: false, error: 'Failed to create person' });
        }
    }
);

/**
 * Create multiple persons (bulk import)
 * POST /api/v1/persons/bulk
 */
router.post('/persons/bulk',
    [body('persons').isArray({ min: 1, max: 1000 })],
    validate,
    async (req, res) => {
        try {
            const results = await personRepository.createBulk(req.body.persons);
            res.status(201).json({
                success: true,
                data: {
                    created: results.created.length,
                    skipped: results.skipped.length,
                    details: results
                }
            });
        } catch (error) {
            console.error('Bulk create error:', error);
            res.status(500).json({ success: false, error: 'Failed to create persons' });
        }
    }
);

/**
 * Get all persons
 * GET /api/v1/persons
 */
router.get('/persons',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 500 }),
        query('search').optional(),
        query('tags').optional(),
    ],
    validate,
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const filter = {};
            if (req.query.search) filter.search = req.query.search;
            if (req.query.tags) filter.tags = req.query.tags.split(',');

            const { rows, count } = await personRepository.findAll(filter, { limit, skip });

            res.json({
                success: true,
                data: rows,
                pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
            });
        } catch (error) {
            console.error('Get persons error:', error);
            res.status(500).json({ success: false, error: 'Failed to get persons' });
        }
    }
);

// =============================================================================
// TEMPLATES ENDPOINTS
// =============================================================================

/**
 * Create a template
 * POST /api/v1/templates
 */
router.post('/templates',
    [
        body('name').notEmpty().trim(),
        body('wa_template_name').notEmpty().trim(),
        body('language_code').optional().default('en'),
        body('body_preview').optional(),
    ],
    validate,
    async (req, res) => {
        try {
            const template = await templateRepository.create({
                ...req.body,
                created_by: req.user.id
            });
            res.status(201).json({ success: true, data: template });
        } catch (error) {
            console.error('Create template error:', error);
            res.status(500).json({ success: false, error: 'Failed to create template' });
        }
    }
);

/**
 * Get all templates
 * GET /api/v1/templates
 */
router.get('/templates', async (req, res) => {
    try {
        const { rows } = await templateRepository.findAll();
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ success: false, error: 'Failed to get templates' });
    }
});

// =============================================================================
// CAMPAIGNS ENDPOINTS
// =============================================================================

/**
 * Create a campaign
 * POST /api/v1/campaigns
 */
router.post('/campaigns',
    [
        body('name').notEmpty().trim(),
        body('description').optional(),
        body('template_id').optional(),
        body('channel').optional().isIn(['whatsapp', 'sms', 'email', 'ivr']).default('whatsapp'),
    ],
    validate,
    async (req, res) => {
        try {
            const campaign = await campaignRepository.create({
                ...req.body,
                created_by: req.user.id,
                status: 'draft'
            });
            res.status(201).json({ success: true, data: campaign });
        } catch (error) {
            console.error('Create campaign error:', error);
            res.status(500).json({ success: false, error: 'Failed to create campaign' });
        }
    }
);

/**
 * Add contacts to a campaign
 * POST /api/v1/campaigns/:id/contacts
 */
router.post('/campaigns/:id/contacts',
    [
        param('id').notEmpty(),
        body('contact_ids').isArray({ min: 1 }),
    ],
    validate,
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id);
            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            const results = await campaignContactRepository.addContacts(
                req.params.id,
                req.body.contact_ids
            );

            res.json({ success: true, data: results });
        } catch (error) {
            console.error('Add contacts error:', error);
            res.status(500).json({ success: false, error: 'Failed to add contacts' });
        }
    }
);

/**
 * Send a campaign
 * POST /api/v1/campaigns/:id/send
 */
router.post('/campaigns/:id/send',
    [param('id').notEmpty()],
    validate,
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id, {
                include: ['template', 'contacts']
            });

            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            if (!campaign.template) {
                return res.status(400).json({ success: false, error: 'No template assigned to campaign' });
            }

            const contacts = campaign.contacts || [];
            if (contacts.length === 0) {
                return res.status(400).json({ success: false, error: 'No contacts in campaign' });
            }

            // Get notification provider
            const channel = campaign.channel || 'whatsapp';
            const provider = NotificationFactory.getProvider(channel);

            if (!provider.isConfigured()) {
                return res.status(400).json({ success: false, error: `${channel} provider not configured` });
            }

            // Send to all contacts
            let sent = 0, failed = 0;
            for (const contact of contacts) {
                const result = await provider.sendTemplateMessage(
                    contact.phone,
                    campaign.template.wa_template_name,
                    campaign.template.language_code
                );

                if (result.success) {
                    sent++;
                    await campaignContactRepository.updateStatus(campaign.id, contact.contact_id, 'sent', result.messageId);
                } else {
                    failed++;
                    await campaignContactRepository.updateStatus(campaign.id, contact.contact_id, 'failed', null, result.error);
                }
            }

            // Update campaign status
            await campaignRepository.updateById(campaign.id, {
                status: 'completed',
                sent_count: sent,
                failed_count: failed
            });

            res.json({ success: true, data: { sent, failed, total: contacts.length } });
        } catch (error) {
            console.error('Send campaign error:', error);
            res.status(500).json({ success: false, error: 'Failed to send campaign' });
        }
    }
);

/**
 * Quick send - Create campaign, add contacts, and send in one call
 * POST /api/v1/campaigns/quick-send
 */
router.post('/campaigns/quick-send',
    [
        body('name').notEmpty().trim(),
        body('template_id').notEmpty(),
        body('contact_ids').isArray({ min: 1 }),
        body('channel').optional().isIn(['whatsapp', 'sms', 'email', 'ivr']).default('whatsapp'),
    ],
    validate,
    async (req, res) => {
        try {
            // 1. Create campaign
            const campaign = await campaignRepository.create({
                name: req.body.name,
                template_id: req.body.template_id,
                channel: req.body.channel || 'whatsapp',
                created_by: req.user.id,
                status: 'draft'
            });

            // 2. Add contacts
            await campaignContactRepository.addContacts(campaign.id, req.body.contact_ids);

            // 3. Load full campaign data
            const fullCampaign = await campaignRepository.findById(campaign.id, {
                include: ['template', 'contacts']
            });

            // 4. Send messages
            const channel = fullCampaign.channel || 'whatsapp';
            const provider = NotificationFactory.getProvider(channel);

            if (!provider.isConfigured()) {
                return res.status(400).json({ success: false, error: `${channel} provider not configured` });
            }

            let sent = 0, failed = 0;
            const contacts = fullCampaign.contacts || [];

            for (const contact of contacts) {
                const result = await provider.sendTemplateMessage(
                    contact.phone,
                    fullCampaign.template.wa_template_name,
                    fullCampaign.template.language_code
                );

                if (result.success) {
                    sent++;
                    await campaignContactRepository.updateStatus(campaign.id, contact.contact_id, 'sent', result.messageId);
                } else {
                    failed++;
                    await campaignContactRepository.updateStatus(campaign.id, contact.contact_id, 'failed', null, result.error);
                }
            }

            // 5. Update campaign
            await campaignRepository.updateById(campaign.id, {
                status: 'completed',
                sent_count: sent,
                failed_count: failed
            });

            res.json({
                success: true,
                data: {
                    campaign_id: campaign.id,
                    sent,
                    failed,
                    total: contacts.length
                }
            });
        } catch (error) {
            console.error('Quick send error:', error);
            res.status(500).json({ success: false, error: 'Failed to quick send' });
        }
    }
);

// =============================================================================
// UTILITY ENDPOINTS
// =============================================================================

/**
 * Get configured notification channels
 * GET /api/v1/channels
 */
router.get('/channels', (req, res) => {
    const configured = NotificationFactory.getConfiguredProviders();
    res.json({ success: true, data: configured });
});

module.exports = router;
