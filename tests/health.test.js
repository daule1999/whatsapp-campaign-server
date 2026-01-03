/**
 * Health Check Tests
 */

const { log, test, request } = require('./utils');

async function testHealth() {
    log('blue', '\n📡 HEALTH CHECK');

    const res = await request('GET', '/api/health');
    test('Health endpoint returns 200', res.status === 200);
    test('Health returns success=true', res.data?.success === true);
    test('Health includes database info', !!res.data?.database);
    test('Health includes channels info', !!res.data?.channels);
}

module.exports = { testHealth };
