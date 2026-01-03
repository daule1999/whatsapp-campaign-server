require('dotenv').config();
const express = require('express');
const cors = require('cors');

const config = require('./config');
const { connectDB, syncDB } = require('./db/connection');
const { templateRepository, personRepository, campaignRepository, userRepository } = require('./db/repositories');
const { NotificationFactory } = require('./services/notifications');

// Import modules
const authRoutes = require('./modules/auth/routes');
const templatesRoutes = require('./modules/templates/routes');
const contactsRoutes = require('./modules/contacts/routes'); // Legacy, kept for backward compatibility
const personsRoutes = require('./modules/persons/routes');
const campaignsRoutes = require('./modules/campaigns/routes');
const auditRoutes = require('./modules/audit/routes');
const adminRoutes = require('./modules/admin/routes');
const apiRoutes = require('./modules/api/routes');
const webhookRoutes = require('./modules/webhook/routes');

const app = express();

// Import sanitize middleware
const { sanitizeInput } = require('./middleware');

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput); // Sanitize all inputs to prevent XSS

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/contacts', contactsRoutes);  // Legacy
app.use('/api/persons', personsRoutes);    // New
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1', apiRoutes);  // Public API
app.use('/api/autoresponders', require('./modules/autoresponders/routes'));  // Chatbot workflows
app.use('/webhook', webhookRoutes);

// Health check
app.get('/api/health', (req, res) => {
    const whatsappProvider = NotificationFactory.getProvider('whatsapp');
    const configuredChannels = NotificationFactory.getConfiguredProviders();

    res.json({
        success: true,
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        database: 'mysql',
        channels: configuredChannels
    });
});

// Test WhatsApp credentials
app.get('/api/test-whatsapp', async (req, res) => {
    try {
        const whatsapp = require('./services/whatsapp');

        if (!whatsapp.isConfigured()) {
            return res.json({
                success: false,
                error: 'WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env'
            });
        }

        // Try to fetch templates from Meta API - this verifies credentials
        const result = await whatsapp.getMessageTemplates();

        if (result.success) {
            res.json({
                success: true,
                message: 'WhatsApp credentials are valid!',
                templatesFound: result.templates?.length || 0,
                templates: result.templates?.slice(0, 5).map(t => ({
                    name: t.name,
                    status: t.status,
                    language: t.language
                }))
            });
        } else {
            res.json({
                success: false,
                error: result.error,
                hint: 'Check your WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const [personCount, templateCount, campaignCount, recentCampaigns] = await Promise.all([
            personRepository.count(),
            templateRepository.count(),
            campaignRepository.count(),
            campaignRepository.findAll({}, { includeTemplate: true })
        ]);

        res.json({
            success: true,
            data: {
                persons: personCount,
                templates: templateCount,
                campaigns: campaignCount,
                recentCampaigns: recentCampaigns.slice(0, 5)
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboard data' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// 404 handler - Must be last
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

const start = async () => {
    await connectDB();
    await syncDB();

    // Check if admin exists
    const adminCheck = await userRepository.findByEmail('admin@admin.com');
    if (!adminCheck) {
        console.log('Creating default admin...');
        const User = require('./db/models').User;
        if (User.createDefaultAdmin) {
            await User.createDefaultAdmin();
        }
        console.log('Admin check complete');
    }

    const whatsappProvider = NotificationFactory.getProvider('whatsapp');

    // Start message queue worker
    const messageWorker = require('./services/messageWorker');
    messageWorker.startWorker();

    const server = app.listen(config.app.port, () => {
        const queue = require('./services/queue');
        console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║       Notification Campaign Manager API v2.0                      ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Server: http://localhost:${config.app.port}                              ║
║  Environment: ${config.app.env}                                    ║
║  Database: MYSQL                                          ║
║  Queue:    ${queue.isQueueEnabled() ? 'REDIS (Enabled)' : 'NONE (Disabled)'}                         ║
║                                                                   ║
║  Default Admin: admin@admin.com / admin123                        ║
║                                                                   ║
║  API Endpoints:                                                   ║
║    Auth:       /api/auth       (login, register, refresh)         ║
║    Templates:  /api/templates  (CRUD)                             ║
║    Persons:    /api/persons    (CRUD, import)                     ║
║    Campaigns:  /api/campaigns  (CRUD, send)                       ║
║    Audit:      /api/audit      (logs)                             ║
║    Admin:      /api/admin      (user management)                  ║
║    Public API: /api/v1         (external integration)             ║
║    Dashboard:  /api/dashboard  (stats)                            ║
║    Queue:      /api/queue/status                                  ║
║                                                                   ║
║  Channels: WhatsApp ${whatsappProvider.isConfigured() ? '✓' : '✗'} | SMS ✗ | Email ✗ | IVR ✗   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM signal received: closing HTTP server');
        await messageWorker.stopWorker();
        server.close(() => {
            console.log('HTTP server closed');
        });
    });
};

start().catch(console.error);

module.exports = app;
