/**
 * Authentication Tests
 */

const { log, test, request } = require('./utils');

async function testAuth(context) {
    log('blue', '\n🔐 AUTHENTICATION TESTS');

    // Test login with default admin
    const loginRes = await request('POST', '/api/auth/login', {
        email: 'admin@admin.com',
        password: 'admin123'
    });
    test('Admin login succeeds', loginRes.status === 200 && loginRes.data.success);

    if (loginRes.data.data?.accessToken) {
        context.adminToken = loginRes.data.data.accessToken;
        test('Admin receives access token', !!context.adminToken);
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
    if (context.adminToken) {
        const meRes = await request('GET', '/api/auth/me', null, {
            Authorization: `Bearer ${context.adminToken}`
        });
        test('Protected route with token succeeds', meRes.status === 200);
    }
}

module.exports = { testAuth };
