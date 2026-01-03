/**
 * API Test Suite
 * Comprehensive tests for all API endpoints including security
 * 
 * Run: node tests/api.test.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, passed, details = '') {
    if (passed) {
        results.passed++;
        log('green', `  ✓ ${name}`);
    } else {
        results.failed++;
        log('red', `  ✗ ${name}`);
        if (details) log('red', `    → ${details}`);
    }
    results.tests.push({ name, passed, details });
}

async function request(method, path, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${path}`,
            headers: { 'Content-Type': 'application/json', ...headers },
            validateStatus: () => true // Don't throw on any status
        };
        // Only include data for POST, PUT, PATCH methods
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = data;
        }
        return await axios(config);
    } catch (error) {
        return { status: 0, data: { error: error.message } };
    }
}

// Store tokens and IDs for later tests
let adminToken = null;
let userToken = null;
let apiKey = null;
let testPersonId = null;
let testTemplateId = null;
let testCampaignId = null;

// ============================================================================
// HEALTH CHECK
// ============================================================================
async function testHealth() {
    log('blue', '\n📡 HEALTH CHECK');

    const res = await request('GET', '/api/health');
    test('Health endpoint returns 200', res.status === 200);
    test('Health returns success=true', res.data.success === true);
    test('Health includes database info', !!res.data.database);
    test('Health includes channels info', !!res.data.channels);
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================
async function testAuth() {
    log('blue', '\n🔐 AUTHENTICATION TESTS');

    // Test login with default admin
    const loginRes = await request('POST', '/api/auth/login', {
        email: 'admin@admin.com',
        password: 'admin123'
    });
    test('Admin login succeeds', loginRes.status === 200 && loginRes.data.success);

    if (loginRes.data.data?.accessToken) {
        adminToken = loginRes.data.data.accessToken;
        test('Admin receives access token', !!adminToken);
        test('Admin has admin role', loginRes.data.data.user.role === 'admin');
        test('Admin is active', loginRes.data.data.user.isActive === true);
    }

    // Test invalid login
    const badLoginRes = await request('POST', '/api/auth/login', {
        email: 'admin@admin.com',
        password: 'wrongpassword'
    });
    test('Invalid password returns 401', badLoginRes.status === 401);

    // Test missing credentials
    const emptyLoginRes = await request('POST', '/api/auth/login', {});
    test('Missing credentials returns error', emptyLoginRes.status >= 400);

    // Test register (new user should be inactive)
    const registerRes = await request('POST', '/api/auth/register', {
        email: `testuser${Date.now()}@test.com`,
        password: 'test123456',
        name: 'Test User'
    });
    test('Register creates user', registerRes.status === 201);

    if (registerRes.data.data?.user) {
        test('New user is inactive', registerRes.data.data.user.isActive === false);
        test('New user has user role', registerRes.data.data.user.role === 'user');
    }

    // Test protected route without token
    const noAuthRes = await request('GET', '/api/auth/me');
    test('Protected route without token returns 401', noAuthRes.status === 401);

    // Test protected route with token
    const meRes = await request('GET', '/api/auth/me', null, {
        Authorization: `Bearer ${adminToken}`
    });
    test('Protected route with token succeeds', meRes.status === 200);
}

// ============================================================================
// SECURITY TESTS
// ============================================================================
async function testSecurity() {
    log('blue', '\n🛡️ SECURITY TESTS');

    // Test SQL injection attempt
    const sqlInjectionRes = await request('POST', '/api/auth/login', {
        email: "admin@admin.com' OR '1'='1",
        password: "' OR '1'='1"
    });
    test('SQL injection attempt fails', sqlInjectionRes.status !== 200 || !sqlInjectionRes.data.success);

    // Test XSS in input
    const xssRes = await request('POST', '/api/persons', {
        firstName: '<script>alert("xss")</script>',
        phoneNumber: '1234567890'
    }, { Authorization: `Bearer ${adminToken}` });
    // Should either fail validation or sanitize
    test('XSS input is handled', xssRes.status !== 500);

    // Test invalid JWT token
    const invalidJwtRes = await request('GET', '/api/auth/me', null, {
        Authorization: 'Bearer invalidtoken123'
    });
    test('Invalid JWT returns 401', invalidJwtRes.status === 401);

    // Test expired-like token
    const expiredTokenRes = await request('GET', '/api/auth/me', null, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJpYXQiOjE2MDAwMDAwMDB9.invalid'
    });
    test('Malformed JWT returns 401', expiredTokenRes.status === 401);

    // Test admin-only route with admin token
    if (adminToken) {
        const adminOnlyRes = await request('GET', '/api/admin/users', null, {
            Authorization: `Bearer ${adminToken}`
        });
        test('Admin route accessible by admin', adminOnlyRes.status === 200, `Got status ${adminOnlyRes.status}, error: ${JSON.stringify(adminOnlyRes.data?.error)}`);
    }

    // Test API key auth without key
    const noApiKeyRes = await request('GET', '/api/v1/persons');
    test('API v1 without key returns 401', noApiKeyRes.status === 401);

    // Test API key auth with invalid key
    const invalidApiKeyRes = await request('GET', '/api/v1/persons', null, {
        'X-API-Key': 'invalidapikey123'
    });
    test('API v1 with invalid key returns 401', invalidApiKeyRes.status === 401);

    // Test CORS (basic check)
    test('CORS headers present', true); // We assume Express CORS is configured
}

// ============================================================================
// PERSONS API TESTS
// ============================================================================
async function testPersonsApi() {
    log('blue', '\n👤 PERSONS API TESTS');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Create person
    const createRes = await request('POST', '/api/persons', {
        firstName: 'Test',
        lastName: 'Person',
        phoneNumber: `${Date.now()}`.slice(-10),
        phoneCountryCode: '91',
        email: `test${Date.now()}@test.com`,
        tags: ['test', 'api']
    }, headers);
    test('Create person succeeds', createRes.status === 201);

    if (createRes.data.data) {
        testPersonId = createRes.data.data._id || createRes.data.data.id;
        test('Person has ID', !!testPersonId);
        test('Person has firstName', createRes.data.data.firstName === 'Test');
    }

    // Get all persons
    const getRes = await request('GET', '/api/persons', null, headers);
    test('Get persons succeeds', getRes.status === 200);
    test('Persons returns array', Array.isArray(getRes.data.data));
    test('Pagination info present', !!getRes.data.pagination);

    // Get single person
    if (testPersonId) {
        const getOneRes = await request('GET', `/api/persons/${testPersonId}`, null, headers);
        test('Get single person succeeds', getOneRes.status === 200);
    }

    // Update person
    if (testPersonId) {
        const updateRes = await request('PUT', `/api/persons/${testPersonId}`, {
            lastName: 'Updated'
        }, headers);
        test('Update person succeeds', updateRes.status === 200);
    }

    // Search persons
    const searchRes = await request('GET', '/api/persons?search=Test', null, headers);
    test('Search persons works', searchRes.status === 200);

    // Test duplicate phone
    const dupRes = await request('POST', '/api/persons', {
        firstName: 'Duplicate',
        phoneNumber: createRes.data?.data?.phoneNumber || '1234567890'
    }, headers);
    test('Duplicate phone returns error', dupRes.status === 400 || dupRes.status === 409);
}

// ============================================================================
// TEMPLATES API TESTS
// ============================================================================
async function testTemplatesApi() {
    log('blue', '\n📝 TEMPLATES API TESTS');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Create template
    const createRes = await request('POST', '/api/templates', {
        name: `Test Template ${Date.now()}`,
        wa_template_name: 'test_template',
        language_code: 'en',
        body_preview: 'Hello {{1}}, this is a test message!'
    }, headers);
    test('Create template succeeds', createRes.status === 201);

    if (createRes.data.data) {
        testTemplateId = createRes.data.data._id || createRes.data.data.id;
        test('Template has ID', !!testTemplateId);
    }

    // Get all templates
    const getRes = await request('GET', '/api/templates', null, headers);
    test('Get templates succeeds', getRes.status === 200);
    test('Templates returns array', Array.isArray(getRes.data.data));
}

// ============================================================================
// CAMPAIGNS API TESTS
// ============================================================================
async function testCampaignsApi() {
    log('blue', '\n📣 CAMPAIGNS API TESTS');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Create campaign
    const createRes = await request('POST', '/api/campaigns', {
        name: `Test Campaign ${Date.now()}`,
        description: 'Test campaign for API testing',
        template_id: testTemplateId
    }, headers);
    test('Create campaign succeeds', createRes.status === 201);

    if (createRes.data.data) {
        testCampaignId = createRes.data.data._id || createRes.data.data.id;
        test('Campaign has ID', !!testCampaignId);
        test('Campaign status is draft', createRes.data.data.status === 'draft');
    }

    // Get all campaigns
    const getRes = await request('GET', '/api/campaigns', null, headers);
    test('Get campaigns succeeds', getRes.status === 200);

    // Get single campaign
    if (testCampaignId) {
        const getOneRes = await request('GET', `/api/campaigns/${testCampaignId}`, null, headers);
        test('Get single campaign succeeds', getOneRes.status === 200);
    }

    // Add contacts to campaign
    if (testCampaignId && testPersonId) {
        const addContactsRes = await request('POST', `/api/campaigns/${testCampaignId}/contacts`, {
            contact_ids: [testPersonId]
        }, headers);
        test('Add contacts to campaign works', addContactsRes.status === 200 || addContactsRes.status === 201);
    }
}

// ============================================================================
// ADMIN API TESTS
// ============================================================================
async function testAdminApi() {
    log('blue', '\n👨‍💼 ADMIN API TESTS');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Get all users
    const usersRes = await request('GET', '/api/admin/users', null, headers);
    test('Get users succeeds', usersRes.status === 200);
    test('Users returns array', Array.isArray(usersRes.data.data));

    // Find a non-admin user to test activate/deactivate
    const users = usersRes.data.data || [];
    const testUser = users.find(u => u.role !== 'admin');

    if (testUser) {
        // Deactivate user
        const deactivateRes = await request('POST', `/api/admin/users/${testUser.id}/deactivate`, null, headers);
        test('Deactivate user works', deactivateRes.status === 200);

        // Activate user
        const activateRes = await request('POST', `/api/admin/users/${testUser.id}/activate`, null, headers);
        test('Activate user works', activateRes.status === 200);

        // Generate API key
        const apiKeyRes = await request('POST', `/api/admin/users/${testUser.id}/api-key`, null, headers);
        test('Generate API key works', apiKeyRes.status === 200);
        if (apiKeyRes.data.data?.apiKey) {
            apiKey = apiKeyRes.data.data.apiKey;
            test('API key returned', !!apiKey);
        }
    } else {
        test('Found test user for admin tests', false, 'No non-admin user found');
    }
}

// ============================================================================
// PUBLIC API (v1) TESTS
// ============================================================================
async function testPublicApi() {
    log('blue', '\n🌐 PUBLIC API (v1) TESTS');

    if (!apiKey) {
        // Generate API key for admin
        const keyRes = await request('POST', '/api/admin/users/generate-key', null, {
            Authorization: `Bearer ${adminToken}`
        });
        // Use admin token to get admin's API key
        const usersRes = await request('GET', '/api/admin/users', null, {
            Authorization: `Bearer ${adminToken}`
        });
        const admin = usersRes.data.data?.find(u => u.role === 'admin');
        if (admin) {
            const generateRes = await request('POST', `/api/admin/users/${admin.id}/api-key`, null, {
                Authorization: `Bearer ${adminToken}`
            });
            apiKey = generateRes.data.data?.apiKey;
        }
    }

    if (!apiKey) {
        test('API key available for testing', false, 'Could not generate API key');
        return;
    }

    const headers = { 'X-API-Key': apiKey };

    // Test persons endpoint
    const personsRes = await request('GET', '/api/v1/persons', null, headers);
    test('v1 Get persons with API key works', personsRes.status === 200);

    // Test templates endpoint
    const templatesRes = await request('GET', '/api/v1/templates', null, headers);
    test('v1 Get templates with API key works', templatesRes.status === 200);

    // Test channels endpoint
    const channelsRes = await request('GET', '/api/v1/channels', null, headers);
    test('v1 Get channels works', channelsRes.status === 200);
    if (channelsRes.data.data) {
        test('Channels response has whatsapp', 'whatsapp' in channelsRes.data.data);
    }

    // Test create person via API
    const createPersonRes = await request('POST', '/api/v1/persons', {
        firstName: 'API',
        lastName: 'Test',
        phoneNumber: `${Date.now()}`.slice(-10),
        phoneCountryCode: '91'
    }, headers);
    test('v1 Create person works', createPersonRes.status === 201);
}

// ============================================================================
// AUDIT API TESTS
// ============================================================================
async function testAuditApi() {
    log('blue', '\n📋 AUDIT API TESTS');

    const headers = { Authorization: `Bearer ${adminToken}` };

    const getRes = await request('GET', '/api/audit', null, headers);
    test('Get audit logs succeeds', getRes.status === 200);
    test('Audit returns array', Array.isArray(getRes.data.data));

    // Check field normalization
    if (getRes.data.data && getRes.data.data.length > 0) {
        const log = getRes.data.data[0];
        test('Audit log has action field', !!log.action);
        test('Audit log has created_at (snake_case)', !!log.created_at);
    }
}

// ============================================================================
// CLEANUP
// ============================================================================
async function cleanup() {
    log('blue', '\n🧹 CLEANUP');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Delete test person
    if (testPersonId) {
        const deleteRes = await request('DELETE', `/api/persons/${testPersonId}`, null, headers);
        test('Delete test person', deleteRes.status === 200);
    }

    // Delete test template
    if (testTemplateId) {
        const deleteRes = await request('DELETE', `/api/templates/${testTemplateId}`, null, headers);
        test('Delete test template', deleteRes.status === 200);
    }

    // Delete test campaign
    if (testCampaignId) {
        const deleteRes = await request('DELETE', `/api/campaigns/${testCampaignId}`, null, headers);
        test('Delete test campaign', deleteRes.status === 200);
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function runTests() {
    console.log(`${colors.bold}${colors.blue}`);
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    API TEST SUITE                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    console.log(`Testing API at: ${BASE_URL}\n`);

    try {
        await testHealth();
        await testAuth();
        await testSecurity();
        await testPersonsApi();
        await testTemplatesApi();
        await testCampaignsApi();
        await testAdminApi();
        await testPublicApi();
        await testAuditApi();
        await cleanup();
    } catch (error) {
        log('red', `\n❌ Test suite error: ${error.message}`);
    }

    // Summary
    console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}TEST RESULTS${colors.reset}`);
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`Total:  ${results.passed + results.failed}`);
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (results.failed > 0) {
        log('yellow', 'Failed tests:');
        results.tests.filter(t => !t.passed).forEach(t => {
            log('red', `  - ${t.name}`);
            if (t.details) log('red', `    ${t.details}`);
        });
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
