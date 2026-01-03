const express = require('express');
const { body, query } = require('express-validator');
const { campaignRepository, campaignContactRepository, templateRepository } = require('../../db/repositories');
const { authenticate, validate, auditLog } = require('../../middleware');
const whatsapp = require('../../services/whatsapp');
const config = require('../../config');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get all campaigns
 * GET /api/campaigns
 */
router.get('/',
    [query('status').optional().isIn(['draft', 'scheduled', 'running', 'completed', 'failed'])],
    validate,
    async (req, res) => {
        try {
            const filter = {};
            if (req.query.status) filter.status = req.query.status;

            const campaigns = await campaignRepository.findAll(filter, {
                includeTemplate: true,
                includeCreator: true
            });

            res.json({ success: true, data: campaigns });
        } catch (error) {
            console.error('Get campaigns error:', error);
            res.status(500).json({ success: false, error: 'Failed to get campaigns' });
        }
    }
);

/**
 * Create campaign
 * POST /api/campaigns
 */
router.post('/',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('description').optional().isString(),
        body('template_id').optional(),
        body('scheduled_at').optional().isISO8601(),
    ],
    validate,
    auditLog('CAMPAIGN_CREATE', 'campaign'),
    async (req, res) => {
        try {
            const { name, description, template_id, scheduled_at } = req.body;

            if (template_id) {
                const template = await templateRepository.findById(template_id);
                if (!template) {
                    return res.status(400).json({ success: false, error: 'Template not found' });
                }
            }

            const campaign = await campaignRepository.create({
                name,
                description: description || null,
                templateId: template_id || null,
                scheduledAt: scheduled_at || null,
                createdBy: req.user.id
            });

            res.status(201).json({ success: true, data: campaign });
        } catch (error) {
            console.error('Create campaign error:', error);
            res.status(500).json({ success: false, error: 'Failed to create campaign' });
        }
    }
);

/**
 * Get campaign by ID with contacts
 * GET /api/campaigns/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const campaign = await campaignRepository.findById(req.params.id, { includeTemplate: true });

        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campaign not found' });
        }

        // Get campaign contacts with status
        const contacts = await campaignContactRepository.findByCampaignWithContacts(req.params.id);

        // Build response based on DB type
        const dbType = config.database.type;
        let result;

        if (dbType === 'mysql') {
            result = {
                ...campaign.toJSON(),
                template_name: campaign.template?.name,
                wa_template_name: campaign.template?.waTemplateName,
                language_code: campaign.template?.languageCode,
                contacts
            };
        } else {
            const obj = campaign.toObject();
            result = {
                ...obj,
                id: obj._id,
                template_name: campaign.templateId?.name,
                wa_template_name: campaign.templateId?.waTemplateName,
                language_code: campaign.templateId?.languageCode,
                contacts
            };
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ success: false, error: 'Failed to get campaign' });
    }
});

/**
 * Update campaign
 * PUT /api/campaigns/:id
 */
router.put('/:id',
    [
        body('name').optional().trim().notEmpty(),
        body('description').optional().isString(),
        body('template_id').optional(),
        body('scheduled_at').optional().isISO8601(),
    ],
    validate,
    auditLog('CAMPAIGN_UPDATE', 'campaign'),
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id);

            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            const status = config.database.type === 'mysql' ? campaign.status : campaign.status;
            if (status !== 'draft') {
                return res.status(400).json({ success: false, error: 'Only draft campaigns can be edited' });
            }

            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.template_id !== undefined) updates.templateId = req.body.template_id;
            if (req.body.scheduled_at !== undefined) updates.scheduledAt = req.body.scheduled_at;

            await campaignRepository.updateById(req.params.id, updates);

            res.json({ success: true, message: 'Campaign updated' });
        } catch (error) {
            console.error('Update campaign error:', error);
            res.status(500).json({ success: false, error: 'Failed to update campaign' });
        }
    }
);

/**
 * Add contacts to campaign
 * POST /api/campaigns/:id/contacts
 */
router.post('/:id/contacts',
    [body('contact_ids').isArray({ min: 1 }).withMessage('Contact IDs required')],
    validate,
    auditLog('CAMPAIGN_ADD_CONTACTS', 'campaign'),
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id);

            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            const status = config.database.type === 'mysql' ? campaign.status : campaign.status;
            if (status !== 'draft') {
                return res.status(400).json({ success: false, error: 'Only draft campaigns can be modified' });
            }

            const { contact_ids } = req.body;
            let added = 0;
            let skipped = 0;

            for (const contactId of contact_ids) {
                try {
                    const { created } = await campaignContactRepository.findOrCreate(
                        { campaignId: req.params.id, contactId },
                        { status: 'pending' }
                    );
                    if (created) added++;
                    else skipped++;
                } catch (e) {
                    console.error('Failed to add contact:', e);
                    skipped++;
                }
            }

            // Update total contacts count
            const count = await campaignContactRepository.count({ campaignId: req.params.id });
            await campaignRepository.updateById(req.params.id, { totalContacts: count });

            res.json({ success: true, data: { added, skipped } });
        } catch (error) {
            console.error('Add contacts error:', error);
            res.status(500).json({ success: false, error: 'Failed to add contacts' });
        }
    }
);

/**
 * Remove contacts from campaign
 * DELETE /api/campaigns/:id/contacts
 */
router.delete('/:id/contacts',
    [body('contact_ids').isArray({ min: 1 })],
    validate,
    auditLog('CAMPAIGN_REMOVE_CONTACTS', 'campaign'),
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id);

            if (!campaign) {
                return res.status(400).json({ success: false, error: 'Campaign not found' });
            }

            const status = config.database.type === 'mysql' ? campaign.status : campaign.status;
            if (status !== 'draft') {
                return res.status(400).json({ success: false, error: 'Only draft campaigns can be modified' });
            }

            const { contact_ids } = req.body;
            await campaignContactRepository.deleteByCampaignAndContacts(req.params.id, contact_ids);

            // Update total contacts count
            const count = await campaignContactRepository.count({ campaignId: req.params.id });
            await campaignRepository.updateById(req.params.id, { totalContacts: count });

            res.json({ success: true, message: 'Contacts removed' });
        } catch (error) {
            console.error('Remove contacts error:', error);
            res.status(500).json({ success: false, error: 'Failed to remove contacts' });
        }
    }
);

/**
 * Send campaign
 * POST /api/campaigns/:id/send
 */
router.post('/:id/send',
    auditLog('CAMPAIGN_SEND', 'campaign'),
    async (req, res) => {
        try {
            const campaign = await campaignRepository.findById(req.params.id, { includeTemplate: true });

            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            const dbType = config.database.type;
            const template = dbType === 'mysql' ? campaign.template : campaign.templateId;

            if (!template) {
                return res.status(400).json({ success: false, error: 'Campaign must have a template' });
            }

            const status = campaign.status;
            if (status === 'running') {
                return res.status(400).json({ success: false, error: 'Campaign is already running' });
            }

            if (status === 'completed') {
                return res.status(400).json({ success: false, error: 'Campaign already completed' });
            }

            // Get pending contacts
            const campaignContacts = await campaignContactRepository.findPendingByCampaign(req.params.id);

            if (campaignContacts.length === 0) {
                return res.status(400).json({ success: false, error: 'No contacts to send' });
            }

            // Update campaign status
            await campaignRepository.updateById(req.params.id, { status: 'running', startedAt: new Date() });

            // Try to use queue if available
            const queue = require('../../services/queue');

            if (queue.isQueueEnabled()) {
                // Use BullMQ for background processing
                const messages = [];
                const updates = [];

                for (const cc of campaignContacts) {
                    const contact = dbType === 'mysql' ? cc.Person : cc.contactId;
                    const ccId = dbType === 'mysql' ? cc.id : cc._id;

                    if (!contact) {
                        console.warn(`Contact not found for CampaignContact ${ccId}, skipping.`);
                        continue;
                    }

                    const phone = dbType === 'mysql' ? (contact.phoneNumber || contact.phone) : contact.phone;

                    if (!phone) {
                        console.warn(`Phone number missing for Contact ${contact.id || contact._id}, skipping.`);
                        continue;
                    }

                    messages.push({
                        phone: phone,
                        templateName: template.waTemplateName,
                        languageCode: template.languageCode || 'en',
                        components: template.components || [],
                        campaignId: req.params.id,
                        campaignContactId: ccId
                    });

                    // Prepare DB update
                    updates.push(campaignContactRepository.updateById(ccId, { status: 'queued' }));
                }

                // Update all contacts to queued status
                await Promise.all(updates);

                await queue.addBulkMessageJobs(req.params.id, messages);

                return res.json({
                    success: true,
                    message: 'Campaign queued for sending',
                    data: {
                        total: campaignContacts.length,
                        queued: messages.length,
                        mode: 'background'
                    }
                });
            }

            // Fallback to synchronous sending if queue not available
            const delay = config.messaging.delayMs;
            let sent = 0;
            let failed = 0;

            for (const cc of campaignContacts) {
                const contact = dbType === 'mysql' ? cc.Person : cc.contactId;
                const ccId = dbType === 'mysql' ? cc.id : cc._id;

                if (!contact) {
                    console.warn(`Contact not found for CampaignContact ${ccId}, skipping.`);
                    continue;
                }

                const phone = dbType === 'mysql' ? (contact.phoneNumber || contact.phone) : contact.phone;

                if (!phone) {
                    console.warn(`Phone number missing for Contact ${contact.id || contact._id}, skipping.`);
                    continue;
                }

                const result = await whatsapp.sendTemplateMessage(
                    phone,
                    template.waTemplateName,
                    template.languageCode || 'en',
                    template.components || []
                );

                if (result.success) {
                    await campaignContactRepository.updateById(ccId, {
                        status: 'sent',
                        messageId: result.messageId,
                        sentAt: new Date()
                    });
                    sent++;
                } else {
                    await campaignContactRepository.updateById(ccId, {
                        status: 'failed',
                        error: result.error
                    });
                    failed++;
                }

                await campaignRepository.updateById(req.params.id, { sentCount: sent, failedCount: failed });

                if (campaignContacts.indexOf(cc) < campaignContacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            await campaignRepository.updateById(req.params.id, { status: 'completed', completedAt: new Date() });

            res.json({ success: true, data: { total: campaignContacts.length, sent, failed, mode: 'sync' } });
        } catch (error) {
            console.error('Send campaign error:', error);
            await campaignRepository.updateOne({ id: req.params.id }, { status: 'failed' });
            res.status(500).json({ success: false, error: 'Failed to send campaign' });
        }
    }
);

/**
 * Delete campaign
 * DELETE /api/campaigns/:id
 */
router.delete('/:id',
    auditLog('CAMPAIGN_DELETE', 'campaign'),
    async (req, res) => {
        try {
            await campaignContactRepository.deleteMany({ campaignId: req.params.id });
            const deleted = await campaignRepository.deleteById(req.params.id);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }

            res.json({ success: true, message: 'Campaign deleted' });
        } catch (error) {
            console.error('Delete campaign error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete campaign' });
        }
    }
);

module.exports = router;
