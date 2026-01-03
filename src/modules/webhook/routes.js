const express = require('express');
const { campaignContactRepository, autoresponderRepository } = require('../../db/repositories');
const whatsapp = require('../../services/whatsapp');

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

                        // Handle incoming messages (for autoresponders)
                        if (value.messages) {
                            for (const message of value.messages) {
                                await handleIncomingMessage(message, value.contacts?.[0]);
                            }
                        }

                        // Handle message status updates
                        if (value.statuses) {
                            for (const status of value.statuses) {
                                await handleStatusUpdate(status);
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

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(message, contact) {
    const from = message.from;
    const messageType = message.type;

    console.log(`📨 Incoming message from ${from}: ${messageType}`);

    let text = '';

    // Extract message text based on type
    if (messageType === 'text') {
        text = message.text?.body || '';
    } else if (messageType === 'interactive') {
        // Button reply
        if (message.interactive?.type === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            console.log(`Button clicked: ${buttonId}`);
            await handleButtonResponse(from, buttonId);
            return;
        }
    }

    if (!text) return;

    // Check for autoresponder keyword match
    const autoresponder = await autoresponderRepository.findByKeyword(text);

    if (autoresponder) {
        console.log(`✓ Autoresponder matched: ${autoresponder.name}`);

        // Send welcome message with menu buttons
        const menuButtons = autoresponder.menuOptions || [];

        if (menuButtons.length > 0) {
            await whatsapp.sendInteractiveButtons(
                from,
                autoresponder.welcomeMessage,
                menuButtons.map(opt => ({
                    id: opt.id || opt.action,
                    title: opt.title || opt.label
                }))
            );
        } else {
            // Just send welcome message without buttons
            await whatsapp.sendFreeTextMessage(from, autoresponder.welcomeMessage);
        }
    }
}

/**
 * Handle button response from user
 */
async function handleButtonResponse(from, buttonId) {
    // Find all active autoresponders and check for matching action
    const autoresponders = await autoresponderRepository.findActive();

    for (const ar of autoresponders) {
        const responses = ar.responses || {};

        if (responses[buttonId]) {
            const response = responses[buttonId];

            switch (response.type) {
                case 'text':
                    await whatsapp.sendFreeTextMessage(from, response.content);
                    break;
                case 'image':
                    await whatsapp.sendImageMessage(from, response.url, response.caption || '');
                    break;
                case 'link':
                    // Send as text with URL
                    await whatsapp.sendFreeTextMessage(from, `${response.text || ''}\n\n${response.url}`);
                    break;
                default:
                    await whatsapp.sendFreeTextMessage(from, response.content || response.text || 'Response not configured');
            }
            return;
        }
    }

    // Default response if no match
    await whatsapp.sendFreeTextMessage(from, 'Sorry, I didn\'t understand that option.');
}

/**
 * Handle message status update
 */
async function handleStatusUpdate(status) {
    console.log(`Webhook: Message ${status.id} is ${status.status}`);

    const updateData = { status: status.status };

    // Capture error info if failed
    if (status.status === 'failed') {
        updateData.error = JSON.stringify(status.errors || 'Unknown error');
    }

    // Find contact by message ID and update
    const contacts = await campaignContactRepository.findAll({ messageId: status.id });
    const contact = contacts[0];

    if (contact) {
        await campaignContactRepository.updateById(contact.id, updateData);

        // Update campaign stats
        if (contact.campaignId) {
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

module.exports = router;
