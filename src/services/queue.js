const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');

// Redis connection options
const redisUrl = process.env.REDIS_URL;

let connection = null;
let messageQueue = null;
let queueEvents = null;

/**
 * Initialize Redis connection for BullMQ
 */
function getConnection() {
    if (!connection && redisUrl) {
        connection = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: redisUrl.startsWith('rediss://') ? {} : undefined
        });

        connection.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });

        connection.on('connect', () => {
            console.log('✓ Redis connected for BullMQ');
        });
    }
    return connection;
}

/**
 * Get or create the message queue
 */
function getQueue() {
    if (!messageQueue && getConnection()) {
        messageQueue = new Queue('whatsapp-messages', {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
                removeOnComplete: 100,
                removeOnFail: 500
            }
        });
    }
    return messageQueue;
}

/**
 * Get queue events for progress tracking
 */
function getQueueEvents() {
    if (!queueEvents && getConnection()) {
        queueEvents = new QueueEvents('whatsapp-messages', {
            connection: getConnection()
        });
    }
    return queueEvents;
}

/**
 * Add a message job to the queue
 */
async function addMessageJob(data) {
    const queue = getQueue();
    if (!queue) {
        throw new Error('Queue not available - Redis not configured');
    }

    return await queue.add('send-message', data, {
        priority: data.priority || 1
    });
}

/**
 * Add bulk message jobs (for campaign)
 */
async function addBulkMessageJobs(campaignId, messages) {
    const queue = getQueue();
    if (!queue) {
        throw new Error('Queue not available - Redis not configured');
    }

    const jobs = messages.map((msg, index) => ({
        name: 'send-message',
        data: {
            ...msg,
            campaignId,
            index,
            total: messages.length
        },
        opts: {
            priority: 1,
            delay: index * 1000 // 1 second between each message
        }
    }));

    return await queue.addBulk(jobs);
}

/**
 * Get queue status and job counts
 */
async function getQueueStatus() {
    const queue = getQueue();
    if (!queue) {
        return { connected: false };
    }

    const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount()
    ]);

    return {
        connected: true,
        waiting,
        active,
        completed,
        failed
    };
}

/**
 * Get campaign job progress
 */
async function getCampaignProgress(campaignId) {
    const queue = getQueue();
    if (!queue) {
        return null;
    }

    // Get all jobs for this campaign
    const completed = await queue.getJobs(['completed']);
    const failed = await queue.getJobs(['failed']);
    const active = await queue.getJobs(['active', 'waiting', 'delayed']);

    const campaignCompleted = completed.filter(j => j.data?.campaignId === campaignId);
    const campaignFailed = failed.filter(j => j.data?.campaignId === campaignId);
    const campaignPending = active.filter(j => j.data?.campaignId === campaignId);

    return {
        completed: campaignCompleted.length,
        failed: campaignFailed.length,
        pending: campaignPending.length,
        total: campaignCompleted.length + campaignFailed.length + campaignPending.length
    };
}

/**
 * Check if queue is enabled
 */
function isQueueEnabled() {
    return !!redisUrl;
}

module.exports = {
    getConnection,
    getQueue,
    getQueueEvents,
    addMessageJob,
    addBulkMessageJobs,
    getQueueStatus,
    getCampaignProgress,
    isQueueEnabled
};
