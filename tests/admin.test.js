/**
 * Admin API Tests
 */

const { log, test, request } = require('./utils');

async function testAdminApi(context) {
    log('blue', '\n👨‍💼 ADMIN API TESTS');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

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
            context.apiKey = apiKeyRes.data.data.apiKey;
            test('API key returned', !!context.apiKey);
        }
    } else {
        test('Found test user for admin tests', false, 'No non-admin user found');
    }
}

module.exports = { testAdminApi };
