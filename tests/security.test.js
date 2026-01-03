/**
 * Security Tests
 */

const { log, test, request } = require('./utils');

async function testSecurity(context) {
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
    }, { Authorization: `Bearer ${context.adminToken}` });
    test('XSS input is handled (not 500 error)', xssRes.status !== 500);

    // Check XSS is sanitized
    if (xssRes.data.data?.firstName) {
        const isSanitized = !xssRes.data.data.firstName.includes('<script>');
        test('XSS script tags are stripped', isSanitized);
    }

    // Test invalid JWT token
    const invalidJwtRes = await request('GET', '/api/auth/me', null, {
        Authorization: 'Bearer invalidtoken123'
    });
    test('Invalid JWT returns 401', invalidJwtRes.status === 401);

    // Test malformed JWT token
    const expiredTokenRes = await request('GET', '/api/auth/me', null, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJpYXQiOjE2MDAwMDAwMDB9.invalid'
    });
    test('Malformed JWT returns 401', expiredTokenRes.status === 401);

    // Test admin-only route
    if (context.adminToken) {
        const adminOnlyRes = await request('GET', '/api/admin/users', null, {
            Authorization: `Bearer ${context.adminToken}`
        });
        test('Admin route accessible by admin', adminOnlyRes.status === 200);
    }

    // Test API key auth without key
    const noApiKeyRes = await request('GET', '/api/v1/persons');
    test('API v1 without key returns 401', noApiKeyRes.status === 401);

    // Test API key auth with invalid key
    const invalidApiKeyRes = await request('GET', '/api/v1/persons', null, {
        'X-API-Key': 'invalidapikey123'
    });
    test('API v1 with invalid key returns 401', invalidApiKeyRes.status === 401);
}

module.exports = { testSecurity };
