/**
 * Cleanup Tests
 */

const { log, test, request } = require('./utils');

async function cleanup(context) {
    log('blue', '\n🧹 CLEANUP');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

    // Delete test person
    if (context.testPersonId) {
        const deleteRes = await request('DELETE', `/api/persons/${context.testPersonId}`, null, headers);
        test('Delete test person', deleteRes.status === 200);
    }

    // Delete test template
    if (context.testTemplateId) {
        const deleteRes = await request('DELETE', `/api/templates/${context.testTemplateId}`, null, headers);
        test('Delete test template', deleteRes.status === 200);
    }

    // Delete test campaign
    if (context.testCampaignId) {
        const deleteRes = await request('DELETE', `/api/campaigns/${context.testCampaignId}`, null, headers);
        test('Delete test campaign', deleteRes.status === 200);
    }
}

module.exports = { cleanup };
