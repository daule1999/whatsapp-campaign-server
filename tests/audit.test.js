/**
 * Audit API Tests
 */

const { log, test, request } = require('./utils');

async function testAuditApi(context) {
    log('blue', '\n📋 AUDIT API TESTS');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

    const getRes = await request('GET', '/api/audit', null, headers);
    test('Get audit logs succeeds', getRes.status === 200);
    test('Audit returns array', Array.isArray(getRes.data.data));

    // Check field normalization
    if (getRes.data.data && getRes.data.data.length > 0) {
        const logEntry = getRes.data.data[0];
        test('Audit log has action field', !!logEntry.action);
        test('Audit log has created_at (snake_case)', !!logEntry.created_at);
    }
}

module.exports = { testAuditApi };
