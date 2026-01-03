const { Worker } = require('bullmq');
const whatsapp = require('./whatsapp');
const { campaignContactRepository, campaignRepository } = require('../db/repositories');
const config = require('../config');
const { getConnection } = require('./queue');

let worker = null;

/**
 * Process a single WhatsApp message job
 */
async function processMessage(job) {
    const {
        phone,
        templateName,
        languageCode,
        components,
        campaignId,
        campaignContactId,
        index,
        total
    } = job.data;

    console.log(`📤 Processing message ${index + 1}/${total} to ${phone}`);

    // Update job progress
    await job.updateProgress({
        status: 'sending',
        phone,
        index,
        total
    });

    // Send the message
    const result = await whatsapp.sendTemplateMessage(
        phone,
        templateName,
        languageCode || 'en',
        components || []
    );

    // Update campaign contact status
    if (campaignContactId) {
        if (result.success) {
            await campaignContactRepository.updateById(campaignContactId, {
                status: 'sent',
                messageId: result.messageId,
                sentAt: new Date()
            });
        } else {
            await campaignContactRepository.updateById(campaignContactId, {
                status: 'failed',
                error: JSON.stringify(result.rawError || result.error)
            });
        }
    }

    // Update campaign stats
    if (campaignId) {
        const campaign = await campaignRepository.findById(campaignId);
        if (campaign) {
            const updates = {};
            if (result.success) {
                updates.sentCount = (campaign.sentCount || 0) + 1;
            } else {
                updates.failedCount = (campaign.failedCount || 0) + 1;
            }

            // Check if this is the last message
            const totalProcessed = (updates.sentCount || campaign.sentCount || 0) +
                (updates.failedCount || campaign.failedCount || 0);
            if (totalProcessed >= (campaign.totalContacts || 0)) {
                updates.status = 'completed';
                updates.completedAt = new Date();
            }

            await campaignRepository.updateById(campaignId, updates);
        }
    }

    if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
    }

    return {
        success: true,
        messageId: result.messageId,
        phone
    };
}

/**
 * Start the message worker
 */
function startWorker() {
    const connection = getConnection();

    if (!connection) {
        console.log('⚠️ Redis not configured, message queue worker disabled');
        return null;
    }

    if (worker) {
        return worker;
    }

    worker = new Worker('whatsapp-messages', processMessage, {
        connection,
        concurrency: 5, // Process 5 messages at a time
        limiter: {
            max: 10,
            duration: 1000 // Max 10 messages per second
        }
    });

    worker.on('completed', (job, result) => {
        console.log(`✅ Message sent to ${result.phone} (Job ${job.id})`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Message failed (Job ${job?.id}):`, err.message);
    });

    worker.on('error', (err) => {
        console.error('Worker error:', err);
    });

    console.log('✓ Message queue worker started (concurrency: 5)');

    return worker;
}

/**
 * Stop the worker
 */
async function stopWorker() {
    if (worker) {
        await worker.close();
        worker = null;
        console.log('Message queue worker stopped');
    }
}

module.exports = {
    startWorker,
    stopWorker,
    processMessage
};
