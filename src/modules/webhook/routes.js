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
        for (const entry of (body.entry || [])) {
            for (const change of (entry.changes || [])) {
                if (change.field === 'messages') {
                    const value = change.value;

                    // Handle message status updates
                    if (value.statuses) {
                        for (const status of value.statuses) {
                            console.log(`Message ${status.id}: ${status.status}`);

                            // Update campaign_contacts status using repository
                            await campaignContactRepository.updateByMessageId(
                                status.id,
                                { status: status.status }
                            );
                        }
                    }
                }
            }
        }

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;
