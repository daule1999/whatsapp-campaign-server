/**
 * Public API (v1) Tests
 */

const { log, test, request } = require('./utils');

async function testPublicApi(context) {
    log('blue', '\n🌐 PUBLIC API (v1) TESTS');

    // If no API key, try to generate one
    if (!context.apiKey) {
        const usersRes = await request('GET', '/api/admin/users', null, {
            Authorization: `Bearer ${context.adminToken}`
        });
        const admin = usersRes.data.data?.find(u => u.role === 'admin');
        if (admin) {
            const generateRes = await request('POST', `/api/admin/users/${admin.id}/api-key`, null, {
                Authorization: `Bearer ${context.adminToken}`
            });
            context.apiKey = generateRes.data.data?.apiKey;
        }
    }

    if (!context.apiKey) {
        test('API key available for testing', false, 'Could not generate API key');
        return;
    }

    const headers = { 'X-API-Key': context.apiKey };

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

module.exports = { testPublicApi };
