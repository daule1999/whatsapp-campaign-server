const express = require('express');
const { campaignContactRepository } = require('../../db/repositories');

const router = express.Router();

/**
 * Webhook verification (required by Meta)
 * GET /webhook
 */
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✓ Webhook verified');
        res.status(200).send(challenge);
    } else {
        console.error('✗ Webhook verification failed');
        res.sendStatus(403);
    }
});

/**
 * Receive webhook events
 * POST /webhook
 */
router.post('/', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        try {
            for (const entry of (body.entry || [])) {
                for (const change of (entry.changes || [])) {
                    if (change.field === 'messages') {
                        const value = change.value;

                        // Handle message status updates
                        if (value.statuses) {
                            for (const status of value.statuses) {
                                console.log(`Webhook: Message ${status.id} is ${status.status}`);

                                const updateData = { status: status.status };

                                // Capture error info if failed
                                if (status.status === 'failed') {
                                    updateData.error = JSON.stringify(status.errors || 'Unknown error');
                                }

                                // Update campaign_contact
                                const contact = await campaignContactRepository.updateByMessageId(
                                    status.id,
                                    updateData
                                );

                                // Update campaign stats if contact found
                                if (contact && contact.campaignId) {
                                    const { campaignRepository } = require('../../db/repositories');
                                    const campaign = await campaignRepository.findById(contact.campaignId);

                                    if (campaign) {
                                        const updates = {};
                                        if (status.status === 'sent') updates.sentCount = (campaign.sentCount || 0) + 1;
                                        if (status.status === 'delivered') updates.deliveredCount = (campaign.deliveredCount || 0) + 1;
                                        if (status.status === 'read') updates.readCount = (campaign.readCount || 0) + 1;
                                        if (status.status === 'failed') updates.failedCount = (campaign.failedCount || 0) + 1;

                                        if (Object.keys(updates).length > 0) {
                                            await campaignRepository.updateById(contact.campaignId, updates);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            res.sendStatus(200);
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;
