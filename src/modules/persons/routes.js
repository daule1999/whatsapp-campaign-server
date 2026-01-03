const express = require('express');
const { body, query } = require('express-validator');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { personRepository } = require('../../db/repositories');
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
 * Get all persons with pagination and search
 * GET /api/persons
 */
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 1000 }),
        query('search').optional().isString(),
        query('tags').optional().isString(),
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

            const { rows: persons, count } = await personRepository.findAll(filter, { limit, skip });

            res.json({
                success: true,
                data: persons,
                pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
            });
        } catch (error) {
            console.error('Get persons error:', error);
            res.status(500).json({ success: false, error: 'Failed to get persons' });
        }
    }
);

/**
 * Create person
 * POST /api/persons
 */
router.post('/',
    [
        body('firstName').trim().notEmpty().withMessage('First name is required'),
        body('lastName').optional().trim(),
        body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
        body('phoneCountryCode').optional().default('91'),
        body('email').optional().isEmail(),
        body('whatsappNumber').optional(),
        body('whatsappSameAsPhone').optional().isBoolean(),
        body('tags').optional().isArray(),
    ],
    validate,
    auditLog('PERSON_CREATE', 'person'),
    async (req, res) => {
        try {
            // Check if phone exists
            const existing = await personRepository.findByPhone(
                req.body.phoneNumber,
                req.body.phoneCountryCode || '91'
            );
            if (existing) {
                return res.status(400).json({ success: false, error: 'Phone number already exists' });
            }

            const person = await personRepository.create(req.body);
            res.status(201).json({ success: true, data: person });
        } catch (error) {
            console.error('Create person error:', error);
            res.status(500).json({ success: false, error: 'Failed to create person' });
        }
    }
);

/**
 * Import persons from CSV/Excel
 * POST /api/persons/import
 */
router.post('/import',
    upload.single('file'),
    auditLog('PERSON_IMPORT', 'person'),
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

            const personsToCreate = data.map(row => {
                const firstName = row.firstName || row.first_name || row.name || row.Name || '';
                const lastName = row.lastName || row.last_name || '';
                const phone = row.phone || row.Phone || row.phoneNumber || row.mobile || '';
                const email = row.email || row.Email || '';

                return {
                    firstName: firstName.toString().split(' ')[0] || '',
                    lastName: lastName || firstName.toString().split(' ').slice(1).join(' ') || '',
                    phoneNumber: phone.toString(),
                    phoneCountryCode: row.countryCode || row.country_code || '91',
                    email: email || null,
                    source: 'import'
                };
            }).filter(p => p.firstName && p.phoneNumber);

            const results = await personRepository.createBulk(personsToCreate);
            fs.unlinkSync(req.file.path);

            res.json({
                success: true,
                data: {
                    imported: results.created.length,
                    skipped: results.skipped.length,
                    total: data.length
                }
            });
        } catch (error) {
            console.error('Import persons error:', error);
            res.status(500).json({ success: false, error: 'Failed to import persons' });
        }
    }
);

/**
 * Get person by ID
 * GET /api/persons/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const person = await personRepository.findById(req.params.id);
        if (!person) {
            return res.status(404).json({ success: false, error: 'Person not found' });
        }
        res.json({ success: true, data: person });
    } catch (error) {
        console.error('Get person error:', error);
        res.status(500).json({ success: false, error: 'Failed to get person' });
    }
});

/**
 * Update person
 * PUT /api/persons/:id
 */
router.put('/:id',
    [
        body('firstName').optional().trim().notEmpty(),
        body('lastName').optional().trim(),
        body('phoneNumber').optional().trim(),
        body('email').optional().isEmail(),
        body('tags').optional().isArray(),
    ],
    validate,
    auditLog('PERSON_UPDATE', 'person'),
    async (req, res) => {
        try {
            const person = await personRepository.updateById(req.params.id, req.body);
            if (!person) {
                return res.status(404).json({ success: false, error: 'Person not found' });
            }
            res.json({ success: true, message: 'Person updated', data: person });
        } catch (error) {
            console.error('Update person error:', error);
            res.status(500).json({ success: false, error: 'Failed to update person' });
        }
    }
);

/**
 * Delete person
 * DELETE /api/persons/:id
 */
router.delete('/:id',
    auditLog('PERSON_DELETE', 'person'),
    async (req, res) => {
        try {
            const deleted = await personRepository.deleteById(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, error: 'Person not found' });
            }
            res.json({ success: true, message: 'Person deleted' });
        } catch (error) {
            console.error('Delete person error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete person' });
        }
    }
);

/**
 * Bulk delete persons
 * POST /api/persons/bulk-delete
 */
router.post('/bulk-delete',
    [body('ids').isArray({ min: 1 })],
    validate,
    auditLog('PERSON_BULK_DELETE', 'person'),
    async (req, res) => {
        try {
            const deleted = await personRepository.deleteMany(req.body.ids);
            res.json({ success: true, data: { deleted } });
        } catch (error) {
            console.error('Bulk delete error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete persons' });
        }
    }
);

/**
 * Add tags to person
 * POST /api/persons/:id/tags
 */
router.post('/:id/tags',
    [body('tags').isArray({ min: 1 })],
    validate,
    async (req, res) => {
        try {
            const person = await personRepository.addTags(req.params.id, req.body.tags);
            if (!person) {
                return res.status(404).json({ success: false, error: 'Person not found' });
            }
            res.json({ success: true, data: person });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to add tags' });
        }
    }
);

module.exports = router;
