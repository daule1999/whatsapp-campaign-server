const express = require('express');
const { body, query } = require('express-validator');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { contactRepository } = require('../../db/repositories');
const { authenticate, validate, auditLog } = require('../../middleware');
const config = require('../../config');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
        else cb(new Error('Only CSV and Excel files allowed'));
    }
});

// All routes require authentication
router.use(authenticate);

/**
 * Get all contacts with pagination and search
 * GET /api/contacts
 */
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 1000 }),
        query('search').optional().isString(),
    ],
    validate,
    async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const search = req.query.search || '';

            const filter = search ? { search } : {};
            const { rows: contacts, count } = await contactRepository.findAll(filter, { limit, skip });

            res.json({
                success: true,
                data: contacts,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('Get contacts error:', error);
            res.status(500).json({ success: false, error: 'Failed to get contacts' });
        }
    }
);

/**
 * Create contact
 * POST /api/contacts
 */
router.post('/',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('phone').trim().notEmpty().withMessage('Phone is required'),
        body('email').optional().isEmail(),
        body('metadata').optional().isObject(),
    ],
    validate,
    auditLog('CONTACT_CREATE', 'contact'),
    async (req, res) => {
        try {
            const { name, phone, email, metadata } = req.body;

            // Check if phone exists
            const existing = await contactRepository.findOne({ phone });
            if (existing) {
                return res.status(400).json({ success: false, error: 'Phone number already exists' });
            }

            const contact = await contactRepository.create({
                name,
                phone,
                email: email || null,
                metadata: metadata || null,
                source: 'manual'
            });

            res.status(201).json({ success: true, data: contact });
        } catch (error) {
            console.error('Create contact error:', error);
            res.status(500).json({ success: false, error: 'Failed to create contact' });
        }
    }
);

/**
 * Import contacts from CSV/Excel
 * POST /api/contacts/import
 */
router.post('/import',
    upload.single('file'),
    auditLog('CONTACT_IMPORT', 'contact'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const workbook = XLSX.readFile(req.file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            if (!data.length) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, error: 'File is empty' });
            }

            let imported = 0;
            let skipped = 0;
            const errors = [];

            for (const row of data) {
                const name = row.name || row.Name || row.NAME || row.contact || '';
                const phone = row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '';
                const email = row.email || row.Email || '';

                if (!name || !phone) {
                    skipped++;
                    continue;
                }

                try {
                    const { created } = await contactRepository.findOrCreate(
                        { phone: phone.toString() },
                        { name: name.toString(), email: email.toString() || null, source: 'csv' }
                    );

                    if (created) imported++;
                    else skipped++;
                } catch (e) {
                    skipped++;
                    errors.push({ phone, error: e.message });
                }
            }

            fs.unlinkSync(req.file.path);

            res.json({
                success: true,
                data: { imported, skipped, total: data.length, errors: errors.slice(0, 10) }
            });
        } catch (error) {
            console.error('Import contacts error:', error);
            res.status(500).json({ success: false, error: 'Failed to import contacts' });
        }
    }
);

/**
 * Import contacts from external API
 * POST /api/contacts/import-api
 */
router.post('/import-api',
    [
        body('url').optional().isURL(),
        body('headers').optional().isObject(),
        body('mapping').optional().isObject(),
    ],
    validate,
    auditLog('CONTACT_IMPORT_API', 'contact'),
    async (req, res) => {
        try {
            const apiUrl = req.body.url || config.externalApi.contactsUrl;

            if (!apiUrl) {
                return res.status(400).json({ success: false, error: 'No external API URL configured' });
            }

            const headers = req.body.headers || {};
            if (config.externalApi.contactsApiKey) {
                headers['Authorization'] = `Bearer ${config.externalApi.contactsApiKey}`;
            }

            const response = await axios.get(apiUrl, { headers });
            let data = response.data;

            if (data.data && Array.isArray(data.data)) data = data.data;
            else if (data.contacts && Array.isArray(data.contacts)) data = data.contacts;
            else if (!Array.isArray(data)) {
                return res.status(400).json({ success: false, error: 'Invalid API response format' });
            }

            const mapping = req.body.mapping || { name: 'name', phone: 'phone', email: 'email' };

            let imported = 0;
            let skipped = 0;

            for (const item of data) {
                const name = item[mapping.name] || '';
                const phone = item[mapping.phone] || '';
                const email = item[mapping.email] || '';

                if (!name || !phone) {
                    skipped++;
                    continue;
                }

                try {
                    const { created } = await contactRepository.findOrCreate(
                        { phone: phone.toString() },
                        { name: name.toString(), email: email.toString() || null, source: 'api' }
                    );

                    if (created) imported++;
                    else skipped++;
                } catch (e) {
                    skipped++;
                }
            }

            res.json({ success: true, data: { imported, skipped, total: data.length } });
        } catch (error) {
            console.error('Import from API error:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to import from API' });
        }
    }
);

/**
 * Get contact by ID
 * GET /api/contacts/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const contact = await contactRepository.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }

        res.json({ success: true, data: contact });
    } catch (error) {
        console.error('Get contact error:', error);
        res.status(500).json({ success: false, error: 'Failed to get contact' });
    }
});

/**
 * Update contact
 * PUT /api/contacts/:id
 */
router.put('/:id',
    [
        body('name').optional().trim().notEmpty(),
        body('phone').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('metadata').optional().isObject(),
    ],
    validate,
    auditLog('CONTACT_UPDATE', 'contact'),
    async (req, res) => {
        try {
            const contact = await contactRepository.updateById(req.params.id, req.body);

            if (!contact) {
                return res.status(404).json({ success: false, error: 'Contact not found' });
            }

            res.json({ success: true, message: 'Contact updated', data: contact });
        } catch (error) {
            console.error('Update contact error:', error);
            res.status(500).json({ success: false, error: 'Failed to update contact' });
        }
    }
);

/**
 * Delete contact
 * DELETE /api/contacts/:id
 */
router.delete('/:id',
    auditLog('CONTACT_DELETE', 'contact'),
    async (req, res) => {
        try {
            const deleted = await contactRepository.deleteById(req.params.id);

            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Contact not found' });
            }

            res.json({ success: true, message: 'Contact deleted' });
        } catch (error) {
            console.error('Delete contact error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete contact' });
        }
    }
);

/**
 * Bulk delete contacts
 * POST /api/contacts/bulk-delete
 */
router.post('/bulk-delete',
    [body('ids').isArray({ min: 1 })],
    validate,
    auditLog('CONTACT_BULK_DELETE', 'contact'),
    async (req, res) => {
        try {
            const { ids } = req.body;
            const deleted = await contactRepository.deleteMany(ids);

            res.json({ success: true, data: { deleted } });
        } catch (error) {
            console.error('Bulk delete error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete contacts' });
        }
    }
);

module.exports = router;
