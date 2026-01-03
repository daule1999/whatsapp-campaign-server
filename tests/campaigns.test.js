/**
 * Campaigns API Tests
 */

const { log, test, request } = require('./utils');

async function testCampaignsApi(context) {
    log('blue', '\n📣 CAMPAIGNS API TESTS');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

    // Create campaign
    const createRes = await request('POST', '/api/campaigns', {
        name: `Test Campaign ${Date.now()}`,
        description: 'Test campaign for API testing',
        template_id: context.testTemplateId
    }, headers);
    test('Create campaign succeeds', createRes.status === 201);

    if (createRes.data.data) {
        context.testCampaignId = createRes.data.data._id || createRes.data.data.id;
        test('Campaign has ID', !!context.testCampaignId);
        test('Campaign status is draft', createRes.data.data.status === 'draft');
    }

    // Get all campaigns
    const getRes = await request('GET', '/api/campaigns', null, headers);
    test('Get campaigns succeeds', getRes.status === 200);

    // Get single campaign
    if (context.testCampaignId) {
        const getOneRes = await request('GET', `/api/campaigns/${context.testCampaignId}`, null, headers);
        test('Get single campaign succeeds', getOneRes.status === 200);
    }

    // Add contacts to campaign
    if (context.testCampaignId && context.testPersonId) {
        const addContactsRes = await request('POST', `/api/campaigns/${context.testCampaignId}/contacts`, {
            contact_ids: [context.testPersonId]
        }, headers);
        test('Add contacts to campaign works', addContactsRes.status === 200 || addContactsRes.status === 201);
    }
}

module.exports = { testCampaignsApi };
