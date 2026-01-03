/**
 * Templates API Tests
 */

const { log, test, request } = require('./utils');

async function testTemplatesApi(context) {
    log('blue', '\n📝 TEMPLATES API TESTS');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

    // Create template
    const createRes = await request('POST', '/api/templates', {
        name: `Test Template ${Date.now()}`,
        wa_template_name: 'test_template',
        language_code: 'en',
        body_preview: 'Hello {{1}}, this is a test message!'
    }, headers);
    test('Create template succeeds', createRes.status === 201);

    if (createRes.data.data) {
        context.testTemplateId = createRes.data.data._id || createRes.data.data.id;
        test('Template has ID', !!context.testTemplateId);
    }

    // Get all templates
    const getRes = await request('GET', '/api/templates', null, headers);
    test('Get templates succeeds', getRes.status === 200);
    test('Templates returns array', Array.isArray(getRes.data.data));
}

module.exports = { testTemplatesApi };
